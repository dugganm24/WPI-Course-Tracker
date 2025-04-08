const AWS = require("aws-sdk");
const mysql = require("mysql2/promise");

AWS.config.update({ region: "us-east-2" });

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(MYSQL_CONFIG);

exports.handler = async (event) => {
  const { wpiID } = event;

  if (!wpiID) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing wpiID" }) };
  }

  let connection;

  try {
    connection = await pool.getConnection();

    // Get student and degree program
    const [studentData] = await connection.execute(
      `SELECT student_id, degree_program FROM Student WHERE student_id = ?`,
      [wpiID]
    );

    if (studentData.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: "Student not found" }) };
    }

    const { degree_program } = studentData[0];

    // Get completed courses
    const [completedCourses] = await connection.execute(
      `SELECT c.course_id, c.credits 
       FROM Enrollment e
       JOIN Courses c ON e.course_id = c.id
       WHERE e.student_id = ?`,
      [wpiID]
    );

    // Calculate total credits completed
    const totalCreditsCompleted = completedCourses.reduce((sum, course) => sum + course.credits, 0);

    const usedCourses = new Set();
    const freeElectiveCourses = new Set(completedCourses.map(c => c.course_id));

    const [degreeRequirements] = await connection.execute(
      `SELECT requirement_type, credits_required, min_courses, course_label 
       FROM Degree_Requirements 
       WHERE degree_program = ?`,
      [degree_program]
    );

    const priorityOrder = {
      "EE": 1, "CE": 2, "ESD": 3, "EFE": 4, "SYS": 5, "T&L": 6, "DE": 7, "SIC": 8, "CSE": 9, "BS": 10,
      "PB": 11, "ST": 12, "AMA": 13, "ES": 14, "MS": 15, "AMS": 16, "TS": 17, "MEO": 18, "MEE": 19, "S": 20,
      "HUA": 21, "PE": 22, "SS": 23, "MA": 24, "MMA": 25, "PH": 26, "CB": 27, "MBS": 28, "CS": 29,
      "AED": 30, "FE": 31, "MQP": 32, "IQP": 33
    };
    

    degreeRequirements.sort((a, b) => (priorityOrder[a.requirement_type] || 99) - (priorityOrder[b.requirement_type] || 99));

    let progress = [];

    const assignedCounts = {};   // Tracks how many courses were assigned to each requirement_type
    const assignedCredits = {};

    for (const requirement of degreeRequirements) {
      const requiredCourses = requirement.course_label
        ? requirement.course_label.split(",").map(c => c.trim())
        : [];

      let matchedCourses = [];

      for (const course of completedCourses) {
        if (
          requiredCourses.includes(course.course_id) &&
          !usedCourses.has(course.course_id)
        ) {
          const count = assignedCounts[requirement.requirement_type] || 0;
          const creditSum = assignedCredits[requirement.requirement_type] || 0;
          const meetsMinCourses = requirement.min_courses
            ? count >= requirement.min_courses
            : false;
          const meetsCreditReq = requirement.credits_required
            ? creditSum >= requirement.credits_required
            : false;

          if (!meetsMinCourses || !meetsCreditReq) {
            matchedCourses.push(course);
            usedCourses.add(course.course_id);
            freeElectiveCourses.delete(course.course_id);

            assignedCounts[requirement.requirement_type] = count + 1;
            assignedCredits[requirement.requirement_type] = creditSum + course.credits;
          }
        }
      }

      const completedCredits = assignedCredits[requirement.requirement_type] || 0;
      const completedCoursesCount = assignedCounts[requirement.requirement_type] || 0;

      const meetsCreditReq = requirement.credits_required
        ? completedCredits >= requirement.credits_required
        : true;
      const meetsCourseReq = requirement.min_courses
        ? completedCoursesCount >= requirement.min_courses
        : true;

      progress.push({
        category: requirement.requirement_type,
        required_credits: requirement.credits_required || "N/A",
        completed_credits: completedCredits,
        required_courses: requirement.min_courses || "N/A",
        completed_courses_count: completedCoursesCount,
        meetsRequirement: meetsCreditReq && meetsCourseReq,
      });
    }

    // Handle Free Electives (FE)
    let feCredits = 0;
    let feCoursesCount = 0;
    let feCourses = [];

    for (const course of completedCourses) {
      if (freeElectiveCourses.has(course.course_id)) {
        feCourses.push(course.course_id);
        feCredits += course.credits;
        feCoursesCount++;
      }
    }

    if (feCoursesCount > 0) {
      progress.push({
        category: "FE",
        required_credits: "N/A",
        completed_credits: feCredits,
        required_courses: "N/A",
        completed_courses_count: feCoursesCount,
        meetsRequirement: true,
        extra_courses: feCourses
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        student_id: wpiID,
        degree_program,
        total_credits_completed: totalCreditsCompleted,
        progress
      }),
    };

  } catch (error) {
    console.error("Database error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message }),
    };
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

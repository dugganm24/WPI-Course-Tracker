const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

AWS.config.update({ region: 'us-east-2' });

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(MYSQL_CONFIG);

exports.handler = async (event) => {
  const { studentID } = event;

  if (!studentID) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid Input' }),
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get the student's degree program
    const [studentRows] = await connection.execute(
      `SELECT degree_program FROM Student WHERE student_id = ?`,
      [studentID]
    );

    if (studentRows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Student not found' }),
      };
    }

    const degreeProgram = studentRows[0].degree_program;

    // 2. Get all enrollments for the student
    const [enrollments] = await connection.execute(
      `SELECT e.enrollment_id, e.display_course_id, e.course_id, e.term, e.grade,
              c.course_title, c.credits
       FROM Enrollment e
       JOIN Courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY c.course_title DESC`,
      [studentID]
    );

    // 3. Get degree requirements for this program, including min_courses
    const [requirements] = await connection.execute(
      `SELECT requirement_type, course_label, min_courses 
       FROM Degree_Requirements 
       WHERE degree_program = ?`,
      [degreeProgram]
    );

    const priorityOrder = {
      "EE": 1, "CE": 2, "ESD": 3, "EFE": 4, "HUA": 5, "PE": 6,
      "SS": 7, "MA": 8, "PH": 9, "CB": 10, "MBS": 11, "CS": 12,
      "AED": 13, "FE": 14, "MQP": 15, "IQP": 16
    };

    requirements.sort((a, b) =>
      (priorityOrder[a.requirement_type] || 99) - (priorityOrder[b.requirement_type] || 99)
    );

    // Build course-to-requirement mapping
    const courseToReqMap = {};
    for (const req of requirements) {
      const courseLabels = req.course_label ? req.course_label.split(',').map(c => c.trim()) : [];
      for (const cid of courseLabels) {
        if (!courseToReqMap[cid]) {
          courseToReqMap[cid] = [];
        }
        courseToReqMap[cid].push(req.requirement_type);
      }
    }

    const assignedCounts = {}; // tracks how many courses are assigned per reqType
    const filteredCourses = [];

    for (const course of enrollments) {
      const reqTypes = courseToReqMap[course.display_course_id] || [];

      reqTypes.sort((a, b) => (priorityOrder[a] || 99) - (priorityOrder[b] || 99));

      let assignedReq = null;

      for (const type of reqTypes) {
        const count = assignedCounts[type] || 0;
        const minNeeded = requirements.find(r => r.requirement_type === type)?.min_courses || 0;

        if (count < minNeeded) {
          assignedReq = type;
          break;
        }
      }

      // If all possible types are full, assign to the first one anyway (or fallback to "FE")
      if (!assignedReq) {
        assignedReq = reqTypes[0] || "FE";
      }

      assignedCounts[assignedReq] = (assignedCounts[assignedReq] || 0) + 1;

      filteredCourses.push({
        ...course,
        requirement_types: [assignedReq]
      });
    }

    // Group filtered courses by requirement type
    const groupedByRequirement = {};

    // Initialize all requirement types with min_courses
    for (const req of requirements) {
      groupedByRequirement[req.requirement_type] = {
        min_courses: req.min_courses || 0,
        courses: []
      };
    }

    // Ensure FE exists for fallback
    if (!groupedByRequirement["FE"]) {
      groupedByRequirement["FE"] = {
        min_courses: 0,
        courses: []
      };
    }

    // Assign filtered courses to their requirement_type group
    for (const course of filteredCourses) {
      const reqType = course.requirement_types[0];
      if (!groupedByRequirement[reqType]) {
        groupedByRequirement[reqType] = {
          min_courses: 0,
          courses: []
        };
      }
      groupedByRequirement[reqType].courses.push(course);
    }

    await connection.commit();

    // Format final response
    const structuredResponse = Object.entries(groupedByRequirement).map(
      ([reqType, { min_courses, courses }]) => ({
        requirement_type: reqType,
        min_courses,
        courses
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify(structuredResponse),
    };
  } catch (error) {
    console.error('Error fetching enrollments: ', error);
    await connection.rollback();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  } finally {
    connection.release();
  }
};

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
  const { studentID, requirementType } = event;

  if (!studentID || !requirementType) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing studentID or requirementType' }),
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

    // 2. Get all course_ids the student is enrolled in
    const [enrollments] = await connection.execute(
      `SELECT c.course_id 
       FROM Enrollment e
       JOIN Courses c ON e.course_id = c.id
       WHERE e.student_id = ?`,
      [studentID]
    );
    
    const enrolledDisplayCourseIDs = new Set(
      enrollments.map(row => row.course_id?.toUpperCase())
    );

    const enrolledCourseIDs = new Set(enrollments.map(row => row.course_id));

    // 3. Get course labels for the specified requirementType
    const [requirements] = await connection.execute(
      `SELECT course_label 
       FROM Degree_Requirements 
       WHERE degree_program = ? AND requirement_type = ?`,
      [degreeProgram, requirementType]
    );

    if (requirements.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Requirement type not found for this degree program' }),
      };
    }

    const courseLabels = requirements
      .flatMap(req =>
        req.course_label ? req.course_label.split(',').map(c => c.trim().toUpperCase()) : []
      );

    if (courseLabels.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ requirement_type: requirementType, courses: [] }),
      };
    }

    // 4. Get eligible courses
    const [eligibleCourses] = await connection.execute(
      `SELECT id, course_id, course_id, course_section_owner, credits, term, section_status 
       FROM Courses
       WHERE credits IS NOT NULL AND credits > 0
         AND term IS NOT NULL
         AND section_status = 'open'`
    );

    // 5. Filter: match courseLabels and not already enrolled, and no duplicate display_course_id
    const seenLabels = new Set();
    const matchingCourses = [];

    for (const course of eligibleCourses) {
      const displayId = course.course_id?.toUpperCase();
    
      if (
        courseLabels.includes(displayId) &&
        !enrolledDisplayCourseIDs.has(displayId) &&
        !seenLabels.has(displayId)
      ) {
        matchingCourses.push(course);
        seenLabels.add(displayId);
      }
    }

    await connection.commit();

    return {
      statusCode: 200,
      body: JSON.stringify({
        requirement_type: requirementType,
        courses: matchingCourses,
      }),
    };
  } catch (error) {
    console.error('Error generating recommendations: ', error);
    await connection.rollback();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  } finally {
    connection.release();
  }
};

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
      body: JSON.stringify({ error: 'Missing studentID' }),
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

    // 2. Get all enrolled course_ids
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

    // 3. Get all requirement types and course labels for the student's program
    const [requirements] = await connection.execute(
      `SELECT requirement_type, course_label 
       FROM Degree_Requirements 
       WHERE degree_program = ?`,
      [degreeProgram]
    );

    const labelMap = {};
    for (const { requirement_type, course_label } of requirements) {
      const labels = course_label
        ? course_label.split(',').map(l => l.trim().toUpperCase())
        : [];
      if (!labelMap[requirement_type]) labelMap[requirement_type] = new Set();
      labels.forEach(label => labelMap[requirement_type].add(label));
    }

    if (Object.keys(labelMap).length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ coursesByRequirement: {} }),
      };
    }

    // 4. Fetch all eligible courses
    const [eligibleCourses] = await connection.execute(
      `SELECT id, course_id, course_title, course_section_owner, credits, term, section_status 
       FROM Courses
       WHERE credits IS NOT NULL AND credits > 0
         AND term IS NOT NULL
         AND section_status = 'open'`
    );

    // 5. Filter & group recommendations by requirement_type
    const result = {};
    const seenPerReq = {};

    for (const course of eligibleCourses) {
      const displayId = course.course_id?.toUpperCase();
      if (!displayId || enrolledDisplayCourseIDs.has(displayId)) continue;

      for (const [reqType, labelSet] of Object.entries(labelMap)) {
        if (!labelSet.has(displayId)) continue;

        if (!seenPerReq[reqType]) seenPerReq[reqType] = new Set();
        if (seenPerReq[reqType].has(displayId)) continue;

        if (!result[reqType]) result[reqType] = [];
        result[reqType].push(course);
        seenPerReq[reqType].add(displayId);
      }
    }

    await connection.commit();

    return {
      statusCode: 200,
      body: JSON.stringify({ coursesByRequirement: result }),
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

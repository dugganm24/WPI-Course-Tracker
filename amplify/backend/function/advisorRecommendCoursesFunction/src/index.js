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
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;

  const { studentID, courseID } = body; 

  if (!studentID || !courseID) { 
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: studentID and courseID' }), 
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [studentRows] = await connection.execute(
      'SELECT advisor_id FROM Student WHERE student_id = ?',
      [studentID]
    );

    if (studentRows.length === 0) {
      throw new Error(`Student not found: ${studentID}`);
    }

    const advisor_id = studentRows[0].advisor_id;
    if (!advisor_id) {
      throw new Error(`No advisor assigned for student ${studentID}`);
    }

    //Modified to get the course id without term
    const [courseRows] = await connection.execute(
      'SELECT id, term FROM Courses WHERE course_id = ? AND credits IS NOT NULL AND credits <> 0 AND section_status = "open"',
      [courseID]
    );

    if (courseRows.length === 0) {
      throw new Error(`No valid course found for ID: ${courseID}`);
    }

    const coursePrimaryKey = courseRows[0].id;
    const term = courseRows[0].term; //get the term from the course table.

    const [existingEnrollment] = await connection.execute(
      'SELECT * FROM Enrollment WHERE student_id = ? AND course_id = ? AND term = ?',
      [studentID, coursePrimaryKey, term]
    );

    if (existingEnrollment.length > 0) {
      await connection.execute(
        'DELETE FROM Enrollment WHERE student_id = ? AND course_id = ? AND term = ?',
        [studentID, coursePrimaryKey, term]
      );

      await connection.commit();
      return {
        statusCode: 200,
        body: JSON.stringify({ success: `Student ${studentID} unenrolled from course ${courseID} in term ${term}` }),
      };
    } else {
      await connection.execute(
        'INSERT INTO Enrollment (student_id, course_id, term, display_course_id, grade) VALUES (?, ?, ?, ?, ?)',
        [studentID, coursePrimaryKey, term, courseID, 'NA']
      );

      await connection.commit();
      return {
        statusCode: 200,
        body: JSON.stringify({ success: `Student ${studentID} enrolled in course ${courseID} for term ${term}` }),
      };
    }

  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    connection.release();
  }
};
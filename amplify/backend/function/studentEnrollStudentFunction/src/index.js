const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

AWS.config.update({region: 'us-east-2'});

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(MYSQL_CONFIG);

exports.handler = async (event) => {
  const { studentID, courseID, term } = event;
  
  if (!studentID || !courseID || !term) {
    return {
      statusCode: 400,
      body: JSON.stringify({error: 'Invalid input'}),
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if student exists
    const [studentRows] = await connection.execute(
      'SELECT * FROM Student WHERE student_id = ?',
      [studentID]
    );
    if (studentRows.length === 0) {
      throw new Error('Student not found');
    }

    // Check if course exists
    const [courseRows] = await connection.execute(
      'SELECT id, course_id FROM Courses WHERE course_id = ? AND credits IS NOT NULL AND credits <> 0 AND section_status = "open" AND term IS NOT NULL',
      [courseID]
    );
    if (courseRows.length === 0) {
      throw new Error('No valid course with given criteria');
    }

    const coursePrimaryKey = courseRows[0].id;
    const actualCourseID = courseRows[0].course_id;

    // Check if student already enrolled in course
    const [existingEnrollment] = await connection.execute(
      'SELECT * FROM Enrollment WHERE student_id = ? and course_id = ?',
      [studentID, coursePrimaryKey]
    );

    if (existingEnrollment.length > 0) {
      throw new Error('Student is already enrolled in this course');
    }

    // Insert new enrollment
    await connection.execute(
      'INSERT INTO Enrollment (student_id, course_id, term, display_course_id) VALUES (?, ?, ?, ?)',
      [studentID, coursePrimaryKey, term, actualCourseID]
    );

    // Placeholder for updating progress (fill below)

    await connection.commit();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: 'Successfully enrolled' }),
    };

  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    connection.release();
  }
};
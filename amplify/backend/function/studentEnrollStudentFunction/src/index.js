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

  const enrollments = body.enrollments;
  if (!enrollments || !Array.isArray(enrollments) || enrollments.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing or invalid enrollments array' }),
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const { student_id, course_id, grade, action } of enrollments) {
      if (!student_id || !course_id) {
        throw new Error('Invalid input: studentID and courseID are required');
      }

      // Check if student exists
      const [studentRows] = await connection.execute(
        'SELECT * FROM Student WHERE student_id = ?',
        [student_id]
      );
      if (studentRows.length === 0) {
        throw new Error(`Student not found: ${student_id}`);
      }

      // Check course existence
      const [courseRows] = await connection.execute(
        'SELECT id, course_id, term FROM Courses WHERE id = ? AND credits IS NOT NULL AND credits <> 0 AND section_status = "open" AND term IS NOT NULL',
        [course_id]
      );
      if (courseRows.length === 0) {
        throw new Error(`No valid course for ID: ${course_id}`);
      }

      const coursePrimaryKey = courseRows[0].id;
      const actualCourseID = courseRows[0].course_id;
      const courseTerm = courseRows[0].term;

      // Check existing enrollment
      const [existingEnrollment] = await connection.execute(
        'SELECT * FROM Enrollment WHERE student_id = ? AND course_id = ?',
        [student_id, coursePrimaryKey]
      );

      if (action === 'remove') {
        // Remove enrollment if it exists
        if (existingEnrollment.length > 0) {
          await connection.execute(
            'DELETE FROM Enrollment WHERE student_id = ? AND course_id = ?',
            [student_id, coursePrimaryKey]
          );
        }
      } else {
        // Add or update enrollment
        if (grade == null) {
          throw new Error('Grade is required for enrollment');
        }

        if (existingEnrollment.length > 0) {
          await connection.execute(
            'UPDATE Enrollment SET grade = ? WHERE student_id = ? AND course_id = ?',
            [grade, student_id, coursePrimaryKey]
          );
        } else {
          await connection.execute(
            'INSERT INTO Enrollment (student_id, course_id, term, display_course_id, grade) VALUES (?, ?, ?, ?, ?)',
            [student_id, coursePrimaryKey, courseTerm, actualCourseID, grade]
          );
        }
      }
    }

    await connection.commit();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: 'Enrollments processed successfully' }),
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

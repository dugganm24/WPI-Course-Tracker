const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

AWS.config.update({ region: 'us-east-2'});

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
      body: JSON.stringify({error: 'Invalid Input'}), 
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const query = `
      SELECT e.enrollment_id, c.course_id, c.term, e.grade, c.course_section_owner
      FROM Enrollment e
      JOIN Courses c ON e.course_id = c.id
      WHERE e.student_id = ?
      ORDER BY c.course_section_owner DESC;
    `;

    const [rows] = await pool.execute(query, [studentID]);

    return {
      statusCode: 200,
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error('Error fetching enrollments: ', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error '})
    };
  } finally {
    connection.release(); 
  }
};

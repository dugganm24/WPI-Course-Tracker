const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

AWS.config.update({ region: 'us-east-2 '});

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(MYSQL_CONFIG);

exports.handler = async () => {
  const connection = await pool.getConnection();

  try {
    const [courseRows] = await connection.execute(
      'SELECT id, course_title, term, credits, academic_units FROM Courses WHERE credits IS NOT NULL AND credits <> 0 AND section_status = "open" AND term IS NOT NULL ORDER BY term, course_id'
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ courses: courseRows }),
    };
  } catch (error) {
    console.error('Error fetching courses: ', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch courses '}),
    };
  } finally {
    connection.release();
  }
};
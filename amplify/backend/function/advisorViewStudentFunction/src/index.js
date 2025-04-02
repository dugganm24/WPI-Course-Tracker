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
  const { advisor_id } = event;

  if (!advisor_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Advisor ID is required' }),
    };
  }

  const connection = await pool.getConnection();
  try {
    const [students] = await connection.execute(`
      SELECT s.first_name, s.last_name, s.graduation_year, s.degree_program 
      FROM Student s
      WHERE s.advisor_id = ?
    `, [advisor_id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ students }),
    };
  } catch (error) {
    console.error('Error fetching students: ', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch students' }),
    };
  } finally {
    connection.release();
  }
};
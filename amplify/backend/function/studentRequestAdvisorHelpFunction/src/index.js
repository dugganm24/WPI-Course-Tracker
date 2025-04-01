const AWS = require("aws-sdk");
const mysql = require("mysql2/promise")

AWS.config.update({ region: "us-east-2"});

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(MYSQL_CONFIG);

exports.handler = async (event) => {
  const connection = await pool.getConnection(); 
  try {
    const { studentID } = event;

    if (!studentID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Student ID is required" }),
      };
    }

    const [rows] = await connection.execute(
      `SELECT S.email AS student_email, A.email AS advisor_email
      FROM Student S
      JOIN Advisor A ON S.advisor_id = A.advisor_id
      WHERE S.student_id = ?`,
      [studentID]
    );

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Advisor not found for this student ID "}),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        studentEmail: rows[0].student_email,
        advisorEmail: rows[0].advisor_email 
      }),
    };
  } catch (error) {
    console.error("Error fetching advisor email: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch advisor email"}),
    };
  } finally {
    connection.release();
  }
};

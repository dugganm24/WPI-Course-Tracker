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
  console.log("PostConfirmation trigger received event:", JSON.stringify(event, null, 2));

  const userAttributes = event.request.userAttributes;

  const username = event.userName;
  const email = userAttributes.email;
  const accountType = userAttributes["custom:account_type"];
  const firstName = userAttributes.given_name;
  const lastName = userAttributes.family_name;
  const wpiID = userAttributes["custom:wpiID"];

  if (!username || !email || !accountType || !firstName || !lastName || !wpiID) {
    console.error("Missing parameters:", { username, email, accountType, firstName, lastName, wpiID });
    throw new Error("Missing required user attributes.");
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const checkUserQuery = `
      SELECT student_id AS wpiID FROM Student WHERE student_id = ? 
      UNION 
      SELECT advisor_id AS wpiID FROM Advisor WHERE advisor_id = ?
    `;

    const [existingUser] = await connection.execute(checkUserQuery, [wpiID, wpiID]);

    if (existingUser.length > 0) {
      console.log("User already exists with wpiID:", wpiID);
      throw new Error(`An account with WPI ID ${wpiID} already exists.`);
    }

    let insertQuery;
    let values;

    if (accountType.toLowerCase() === "student") {
      insertQuery = `
        INSERT INTO Student (student_id, username, email, first_name, last_name, degree_program) 
        VALUES (?, ?, ?, ?, ?, 'ECE')
      `;
      values = [wpiID, username, email, firstName, lastName];
    } else if (accountType.toLowerCase() === "advisor") {
      insertQuery = `
        INSERT INTO Advisor (advisor_id, username, email, first_name, last_name) 
        VALUES (?, ?, ?, ?, ?)
      `;
      values = [wpiID, username, email, firstName, lastName];
    } else {
      console.error("Invalid account type:", accountType);
      throw new Error("Invalid account type.");
    }

    await connection.execute(insertQuery, values);
    console.log("User successfully added:", username);

  } catch (error) {
    console.error("PostConfirmation Lambda error:", error);
    throw new Error(error.message || "Internal server error.");
  } finally {
    if (connection) {
      await connection.release();
    }
  }

  return event;
};

const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

AWS.config.update({ region: 'us-east-2' });

// MySQL Database Configuration
const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Create a connection pool
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

  // Validate input parameters
  if (!username || !email || !accountType || !firstName || !lastName || !wpiID) {
    console.error("Missing parameters:", { username, email, accountType, firstName, lastName, wpiID });
    return event; // Still return event even if you don't proceed
  }

  let connection;

  try {
    // Get a connection from the pool
    connection = await pool.getConnection();

    // Check if the user already exists based on wpiID in Student or Advisor table
    const checkUserQuery = `
      SELECT student_id AS wpiID FROM Student WHERE student_id = ? 
      UNION 
      SELECT advisor_id AS wpiID FROM Advisor WHERE advisor_id = ?
    `;

    const [existingUser] = await connection.execute(checkUserQuery, [wpiID, wpiID]);

    if (existingUser.length > 0) {
      console.log("User already exists with wpiID:", wpiID);
      return event;
    }

    // Insert user into the correct table based on accountType
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
      return event;
    }

    // Execute the insert query
    await connection.execute(insertQuery, values);

    console.log("User successfully added:", username);

  } catch (error) {
    console.error("Database error:", error);
    // Still return event so Cognito doesn't fail the flow
  } finally {
    if (connection) {
      await connection.release(); // Release the connection back to the pool
    }
  }

  return event; // Required for Cognito triggers
};

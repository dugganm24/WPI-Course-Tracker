const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

AWS.config.update({ region: 'us-east-1' });

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
  const { username, email, accountType, firstName, lastName, wpiID } = event;

  console.log("Received event:", JSON.stringify(event, null, 2));

  // Validate input parameters
  if (!username || !email || !accountType || !firstName || !lastName || !wpiID) {
    console.error("Missing parameters:", { username, email, accountType, firstName, lastName, wpiID });
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing required fields" }),
    };
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
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User already exists", wpiID }),
      };
    }

    // Insert user into the correct table based on accountType
    let insertQuery;
    let values;

    if (accountType.toLowerCase() === "student") {
      insertQuery = `
        INSERT INTO Student (student_id, username, email, first_name, last_name) 
        VALUES (?, ?, ?, ?, ?)
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
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid account type. Must be 'student' or 'advisor'." }),
      };
    }

    // Execute the insert query
    await connection.execute(insertQuery, values);

    console.log("User successfully added:", username);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User successfully added", username, accountType, wpiID }),
    };

  } catch (error) {
    console.error("Database error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message }),
    };
  } finally {
    if (connection) {
      await connection.release(); // Release the connection back to the pool
    }
  }
};

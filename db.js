// Import the mysql2 package.
// mysql2 is used to connect the Node.js backend to the MySQL database.
const mysql = require("mysql2");

// Create a MySQL connection pool.
// A connection pool manages multiple database connections efficiently.
// This is better than creating a new database connection every time a query runs.
const db = mysql.createPool({

  // Database host.
  // localhost means the MySQL database is running on the same computer as the backend server.
  host: "localhost",

  // MySQL username.
  // root is the default MySQL user in many local development environments such as XAMPP.
  user: "root",

  // MySQL password.
  // Empty string means there is no password set for the root user.
  password: "",

  // Name of the database used by the Facilities Management System.
  database: "fms_db",

  // If all connections are busy, new requests will wait until a connection is available.
  waitForConnections: true,

  // Maximum number of database connections allowed in the pool at the same time.
  connectionLimit: 10,

  // Maximum number of waiting connection requests.
  // 0 means there is no limit to the queue.
  queueLimit: 0
});

// Test the database connection when the server starts.
// This helps confirm whether the backend can connect to MySQL successfully.
db.getConnection((err, connection) => {

  // If there is an error, show the database connection error in the terminal.
  if (err) {
    console.log("Database connection failed:", err);

  // If connection is successful, show a success message in the terminal.
  } else {
    console.log("Connected to MySQL");

    // Release the connection back to the pool.
    // This is important because the connection can be reused by other queries.
    connection.release();
  }
});

// Export the database connection pool.
// Other files can import this db object to run SQL queries.
module.exports = db;
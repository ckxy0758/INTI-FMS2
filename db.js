// Import mysql2.
// mysql2 is used to connect the Node.js backend to TiDB Cloud.
const mysql = require("mysql2");

// Load environment variables from .env.
require("dotenv").config();

// Create a MySQL connection pool.
// TiDB Cloud is MySQL-compatible, so mysql2 can be used.
const db = mysql.createPool({

    // TiDB Cloud connection details.
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,

    // TiDB Cloud Serverless public endpoints require TLS.
    ssl: {
        rejectUnauthorized: true
    },

    // Connection pool settings.
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the database connection when the server starts.
db.getConnection((err, connection) => {

    if (err) {
        console.log("Database connection failed:", err);
    } else {
        console.log("Connected to TiDB Cloud successfully");

        // Release the connection back to the pool.
        connection.release();
    }
});

// Export the database connection pool.
module.exports = db;
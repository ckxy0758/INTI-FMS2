const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,

    // TiDB Cloud public endpoint requires TLS
    ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to TiDB Cloud successfully");
        connection.release();
    }
});

module.exports = db;
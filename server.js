// Import the Node.js path module.
// This is used to safely work with file and folder paths.
const path = require("path");

// Import Express framework.
// Express is used to create the backend server and API routes.
const express = require("express");

// Import CORS middleware.
// CORS allows the frontend to send requests to the backend server.
const cors = require("cors");

// Import authentication-related routes.
// This may include login, register, forgot password, reset password, profile, booking, settings, etc.
const authRoutes = require("./routes/auth");

// Import admin report routes.
// These routes are used for admin reports and analytics features.
const adminReportsRoutes = require("./routes/adminReportsRoutes");

// Import admin dashboard routes.
// These routes are used to load KPI cards, recent bookings, notifications, and dashboard chart data.
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');

// Create an Express application.
// The app object is used to configure middleware, routes, and server settings.
const app = express();

// Enable CORS for the backend.
// This allows the frontend to communicate with the backend API.
app.use(cors());

// Allow the server to read JSON data from requests.
// The 50mb limit allows large request data, such as uploaded images stored as base64.
app.use(express.json({ limit: '50mb' }));

// Allow the server to read form data from requests.
// extended: true allows nested objects in the submitted form data.
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the public folder.
// This allows HTML, CSS, JavaScript, images, and other frontend files to be accessed by the browser.
app.use(express.static("public"));

// Serve uploaded files from the public/uploads folder.
// This makes uploaded images or files accessible through the /uploads URL path.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Register authentication and main system routes under /api.
// Example route: /api/login or /api/register.
app.use("/api", authRoutes);

// Register admin report routes under /api.
// Example route: /api/admin/reports.
app.use("/api", adminReportsRoutes);

// Register admin dashboard routes under /api.
// Example route: /api/admin/dashboard.
app.use('/api', adminDashboardRoutes);

// Start the backend server on port 3000.
// Once running, the system can be accessed using http://0.0.0.0:3000.
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
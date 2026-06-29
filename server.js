const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const adminReportsRoutes = require("./routes/adminReportsRoutes");
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use("/api", authRoutes);
app.use("/api", adminReportsRoutes);
app.use('/api', adminDashboardRoutes);

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
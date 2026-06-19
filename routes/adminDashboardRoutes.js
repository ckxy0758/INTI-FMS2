const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/admin/dashboard
router.get("/admin/dashboard", (req, res) => {
  const userId = req.query.userId;

  // 1. Fetch all 4 KPIs efficiently in a single query
  const kpiSql = `
    SELECT 
      (SELECT COUNT(*) FROM bookings WHERE booking_status IN ('pending', 'payment_submitted')) AS pendingBookings,
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS activeUsers,
      (SELECT COUNT(*) FROM facilities) AS totalFacilities,
      (SELECT COUNT(*) FROM bookings WHERE key_status = 'collected') AS unreturnedKeys
  `;

  db.query(kpiSql, (err, kpiResult) => {
    if (err) {
      console.error("Dashboard KPI error:", err);
      return res.json({ success: false, message: "Failed to load KPIs" });
    }

    // Safely attempt to get unread notifications count
    const unreadSql = `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`;
    db.query(unreadSql, [userId], (err, unreadRes) => {
      // If error (e.g. column doesn't exist), just default to 0 to prevent a crash
      kpiResult[0].unreadNotifications = (!err && unreadRes.length > 0) ? unreadRes[0].count : 0;

      // 2. Fetch the 5 latest booking requests
      const bookingsSql = `
        SELECT b.booking_id, u.name AS user_name, f.facility_name, b.booking_status, b.created_at
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN facilities f ON b.facility_id = f.facility_id
        ORDER BY b.created_at DESC
        LIMIT 5
      `;

      db.query(bookingsSql, (err, bookingsResult) => {
        if (err) {
          console.error("Dashboard Bookings error:", err);
          return res.json({ success: false, message: "Failed to load recent bookings" });
        }

        // 3. Fetch the 2 latest notifications for this specific admin
        const notifSql = `
          SELECT title, message, created_at 
          FROM notifications 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 2
        `;

        db.query(notifSql, [userId], (err, notifResult) => {
          if (err) {
            console.error("Dashboard Notifications error:", err);
            return res.json({ success: false, message: "Failed to load notifications" });
          }

          // 4. Fetch data for the Facility Usage Bar Chart
          const chartSql = `
            SELECT f.facility_name, COUNT(b.booking_id) AS total_bookings
            FROM facilities f
            LEFT JOIN bookings b ON f.facility_id = b.facility_id
            GROUP BY f.facility_id, f.facility_name
            ORDER BY total_bookings DESC
            LIMIT 5
          `;

          db.query(chartSql, (err, chartResult) => {
            if (err) {
              console.error("Dashboard Chart error:", err);
              return res.json({ success: false, message: "Failed to load chart data" });
            }

            // Return everything as one clean package
            res.json({
              success: true,
              kpis: kpiResult[0],
              recentBookings: bookingsResult,
              recentNotifications: notifResult,
              facilityUsage: chartResult
            });
          });
        });
      });
    });
  });
});

module.exports = router;
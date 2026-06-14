const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/admin/reports
router.get("/admin/reports", (req, res) => {
  const {
    month,
    year,
    userType,
    facilityType,
    facilityId
  } = req.query;

  let params = [];
  let where = "WHERE 1=1";

  if (month && year) {
    where += " AND MONTH(b.booking_date) = ? AND YEAR(b.booking_date) = ?";
    params.push(month, year);
  }

  if (userType && userType !== "All") {
    where += " AND u.role = ?";
    params.push(userType.toLowerCase());
  }

  if (facilityType && facilityType !== "All") {
    where += " AND f.facility_type = ?";
    params.push(facilityType);
  }

  if (facilityId && facilityId !== "All") {
    where += " AND f.facility_id = ?";
    params.push(facilityId);
  }

  const facilityUsageSql = `
    SELECT 
      f.facility_name,
      COUNT(b.booking_id) AS total_bookings
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    JOIN users u ON b.user_id = u.user_id
    ${where}
    GROUP BY f.facility_id, f.facility_name
    ORDER BY total_bookings DESC
  `;

  db.query(facilityUsageSql, params, (facilityUsageErr, facilityUsage) => {
    if (facilityUsageErr) {
      console.log("Facility usage report error:", facilityUsageErr);
      return res.json({
        success: false,
        message: "Failed to load facility usage report"
      });
    }

    const bookingTrendsSql = `
      SELECT 
        DATE_FORMAT(b.booking_date, '%Y-%m') AS booking_month,
        COUNT(b.booking_id) AS total_bookings
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      JOIN users u ON b.user_id = u.user_id
      ${where}
      GROUP BY booking_month
      ORDER BY booking_month ASC
    `;

    db.query(bookingTrendsSql, params, (bookingTrendsErr, bookingTrends) => {
      if (bookingTrendsErr) {
        console.log("Booking trends report error:", bookingTrendsErr);
        return res.json({
          success: false,
          message: "Failed to load booking trends report"
        });
      }

      const statusOverviewSql = `
        SELECT 
          b.booking_status,
          COUNT(b.booking_id) AS total
        FROM bookings b
        JOIN facilities f ON b.facility_id = f.facility_id
        JOIN users u ON b.user_id = u.user_id
        ${where}
        GROUP BY b.booking_status
        ORDER BY total DESC
      `;

      db.query(statusOverviewSql, params, (statusOverviewErr, statusOverview) => {
        if (statusOverviewErr) {
          console.log("Status overview report error:", statusOverviewErr);
          return res.json({
            success: false,
            message: "Failed to load booking status overview"
          });
        }

        const keyAnalyticsSql = `
          SELECT
            COUNT(*) AS total_key_bookings,
            SUM(CASE WHEN b.key_status = 'returned' THEN 1 ELSE 0 END) AS returned_keys,
            SUM(CASE WHEN b.key_status = 'collected' THEN 1 ELSE 0 END) AS outstanding_keys,
            SUM(CASE 
              WHEN b.key_status = 'collected'
              AND TIMESTAMP(b.booking_date, b.end_time) < NOW()
              THEN 1 ELSE 0 
            END) AS overdue_keys
          FROM bookings b
          JOIN facilities f ON b.facility_id = f.facility_id
          JOIN users u ON b.user_id = u.user_id
          WHERE f.booking_flow_type = 'staff_key_approval'
        `;

        db.query(keyAnalyticsSql, (keyAnalyticsErr, keyAnalytics) => {
          if (keyAnalyticsErr) {
            console.log("Key analytics report error:", keyAnalyticsErr);
            return res.json({
              success: false,
              message: "Failed to load key analytics"
            });
          }

          const paymentAnalyticsSql = `
            SELECT
              IFNULL(SUM(CASE WHEN b.payment_status = 'verified' THEN b.payment_amount ELSE 0 END), 0) AS total_revenue,
              SUM(CASE WHEN b.payment_status = 'verified' THEN 1 ELSE 0 END) AS verified_payments,
              SUM(CASE WHEN b.payment_status = 'pending_payment' THEN 1 ELSE 0 END) AS pending_payments,
              SUM(CASE WHEN b.payment_status = 'payment_submitted' THEN 1 ELSE 0 END) AS submitted_payments
            FROM bookings b
            JOIN facilities f ON b.facility_id = f.facility_id
            JOIN users u ON b.user_id = u.user_id
            WHERE f.booking_flow_type = 'payment_required'
          `;

          db.query(paymentAnalyticsSql, (paymentAnalyticsErr, paymentAnalytics) => {
            if (paymentAnalyticsErr) {
              console.log("Payment analytics report error:", paymentAnalyticsErr);
              return res.json({
                success: false,
                message: "Failed to load payment analytics"
              });
            }

            const userUsageSql = `
              SELECT 
                u.role,
                COUNT(b.booking_id) AS total_bookings
              FROM bookings b
              JOIN users u ON b.user_id = u.user_id
              JOIN facilities f ON b.facility_id = f.facility_id
              ${where}
              GROUP BY u.role
              ORDER BY total_bookings DESC
            `;

            db.query(userUsageSql, params, (userUsageErr, userUsage) => {
              if (userUsageErr) {
                console.log("User usage report error:", userUsageErr);
                return res.json({
                  success: false,
                  message: "Failed to load student vs staff usage"
                });
              }

              return res.json({
                success: true,
                facilityUsage,
                bookingTrends,
                statusOverview,
                keyAnalytics: keyAnalytics[0],
                paymentAnalytics: paymentAnalytics[0],
                userUsage
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
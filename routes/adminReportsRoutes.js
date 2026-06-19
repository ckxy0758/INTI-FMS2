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
  } = req.query; // Removed keyStatus from here

  let params = [];
  let where = "WHERE 1=1";

  if (month && month !== "") {
    where += " AND MONTH(b.booking_date) = ?";
    params.push(month);
  }

  if (year && year !== "") {
    where += " AND YEAR(b.booking_date) = ?";
    params.push(year);
  }

  if (userType && userType !== "All") {
    where += " AND u.role = ?";
    params.push(userType.toLowerCase());
  }

  // Facility Type Filter (Supports "All")
  if (facilityType && facilityType !== "All") {
    where += " AND f.facility_type = ?";
    params.push(facilityType);
  }

  // Facility ID Filter (Supports "All")
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
      return res.json({ success: false, message: "Failed to load facility usage report" });
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
        return res.json({ success: false, message: "Failed to load booking trends report" });
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
          return res.json({ success: false, message: "Failed to load booking status overview" });
        }

        const cancellationSql = `
          SELECT f.facility_name, COUNT(b.booking_id) AS cancel_count
          FROM bookings b
          JOIN facilities f ON b.facility_id = f.facility_id
          JOIN users u ON b.user_id = u.user_id
          ${where} AND b.booking_status = 'cancelled'
          GROUP BY f.facility_id, f.facility_name
          ORDER BY cancel_count DESC
          LIMIT 1
        `;

        db.query(cancellationSql, params, (cancelErr, cancelResult) => {
          if (cancelErr) {
            console.log("Cancellation report error:", cancelErr);
            return res.json({ success: false, message: "Failed to load cancellations" });
          }
          
          const mostCancelled = cancelResult.length > 0 ? cancelResult[0].facility_name : "None";

          const keyAnalyticsSql = `
            SELECT
              COUNT(*) AS total_key_bookings,
              SUM(CASE WHEN b.key_status = 'returned' THEN 1 ELSE 0 END) AS returned_keys,
              SUM(CASE WHEN b.key_status = 'collected' THEN 1 ELSE 0 END) AS collected_keys,
              SUM(CASE 
                WHEN b.key_status = 'collected'
                AND CONCAT(b.booking_date, ' ', b.end_time) < NOW()
                THEN 1 ELSE 0 
              END) AS overdue_keys
            FROM bookings b
            JOIN facilities f ON b.facility_id = f.facility_id
            JOIN users u ON b.user_id = u.user_id
            ${where} AND f.booking_flow_type = 'staff_key_approval'
          `;

          db.query(keyAnalyticsSql, params, (keyAnalyticsErr, keyAnalytics) => {
            if (keyAnalyticsErr) {
              console.log("Key analytics report error:", keyAnalyticsErr);
              return res.json({ success: false, message: "Failed to load key analytics" });
            }

            const paymentAnalyticsSql = `
              SELECT
                IFNULL(SUM(CASE WHEN b.payment_status IN ('payment_submitted', 'verified') OR b.booking_status = 'approved' THEN b.payment_amount ELSE 0 END), 0) AS total_revenue,
                SUM(CASE WHEN b.payment_status = 'pending_payment' THEN 1 ELSE 0 END) AS pending_payments,
                SUM(CASE WHEN b.booking_status = 'approved' THEN 1 ELSE 0 END) AS submitted_payments
              FROM bookings b
              JOIN facilities f ON b.facility_id = f.facility_id
              JOIN users u ON b.user_id = u.user_id
              ${where} AND f.booking_flow_type = 'payment_required'
            `;

            db.query(paymentAnalyticsSql, params, (paymentAnalyticsErr, paymentAnalytics) => {
              if (paymentAnalyticsErr) {
                console.log("Payment analytics report error:", paymentAnalyticsErr);
                return res.json({ success: false, message: "Failed to load payment analytics" });
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
                  return res.json({ success: false, message: "Failed to load student vs staff usage" });
                }

                return res.json({
                  success: true,
                  facilityUsage,
                  bookingTrends,
                  statusOverview,
                  mostCancelledFacility: mostCancelled,
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
});

module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { verifyToken, requireRole, JWT_SECRET } = require("../middleware/authMiddleware");

// ============================================================================
// 1. EMAIL NOTIFICATION SETUP
// ============================================================================

// Configure the SMTP transport layer securely using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'courneyk8570@gmail.com',
    pass: 'hlkmpewoamjcdfrn' // Secure App Password integration goes here
  }
});

// Reusable helper to send emails asynchronously in the background
function sendEmailNotification(userEmail, title, message) {
  const mailOptions = { from: 'courneyk8570@gmail.com', to: userEmail, subject: title, text: message };
  // Non-blocking execution prevents the server from waiting for the email to send
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Email error:", error);
    else console.log("Email sent: " + info.response);
  });
}

// ============================================================================
// 2. AUTHENTICATION & SECURITY ROUTES
// ============================================================================

// Handle User Login and Stateless JWT Session Generation
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND status = 'active'";

  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length === 1) {
      const user = result[0];
      const isHashed = user.password.startsWith("$2"); // Check if password is encrypted


      // STATELESS AUTHENTICATION (Verifying and Token Generation)  
      // Centralized success handler for token generation (DRY principle)
      const handleSuccess = () => {
        const tokenData = {
          id: user.user_id,
          role: user.role
        };

        // Cryptographically sign a stateless token expiring in 8 hours
        const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '8h' });

        return res.json({
          success: true,
          message: "Login successful",
          token: token, // Send to frontend for API authorization
          user: {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            must_change_password: user.must_change_password
          }
        });
      };

  // Security Check: Verify if the stored password is a bcrypt hash (starts with $2)
    if (isHashed) {
        // Compare entered plain-text password with stored bcrypt hash
        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
          if (compareErr) return res.json({ success: false, message: "Error verifying credentials" });
          if (isMatch) return handleSuccess();
          return res.json({ success: false, message: "Invalid email or password" });
        });
      } else {
        // Fallback for legacy plain-text passwords
        if (password === user.password) return handleSuccess();
        return res.json({ success: false, message: "Invalid email or password" });
      }
    } else {
      return res.json({ success: false, message: "Invalid email or password" });
    }
  });
});

// Admin Route: Create a new user account with a hashed temporary password
router.post("/users", verifyToken, requireRole(['admin']), (req, res) => {
  const { name, user_code, email, role } = req.body;

  if (!name || !user_code || !email || !role) {
    return res.json({ success: false, message: "Please fill in all fields" });
  }

  if (role !== "student" && role !== "staff" && role !== "admin") {
    return res.json({ success: false, message: "Invalid role" });
  }

  const defaultPassword = user_code;

  // CRYPTOGRAPHIC SECURITY (Hashing new passwords)
  // Hash the temporary password before storing it to secure the database.
  // A salt factor of 10 is used to protect against brute-force and rainbow table attacks.
  bcrypt.hash(defaultPassword, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      return res.json({ success: false, message: "Error securing password" });
    }

    const sql = `
      INSERT INTO users 
      (name, user_code, email, password, role, status, must_change_password)
      VALUES (?, ?, ?, ?, ?, 'active', TRUE)
    `;

    // The plaintext is NEVER stored. Only the 'hashedPassword' is inserted.
    db.query(sql, [name, user_code, email, hashedPassword, role], (err) => {
      if (err) {
        return res.json({ success: false, message: "User already exists or database error" });
      }

      return res.json({
        success: true,
        message: `Account created successfully. Temporary password: ${defaultPassword}. Please tell the user to change password after first login.`,
        temporaryPassword: defaultPassword
      });
    });
  });
});

// Admin Route: Retrieve all users
router.get("/users", verifyToken, requireRole(['admin']), (req, res) => {
  const sql = "SELECT user_id, name, user_code, email, role, status FROM users ORDER BY user_id DESC";

  db.query(sql, (err, result) => {
    if (err) {
      return res.json({ success: false, users: [] });
    }

    return res.json({ success: true, users: result });
  });
});

// Allow a user to change their password and enforce strong password policies
router.post("/change-password", verifyToken, (req, res) => {
  const { user_id, newPassword } = req.body;

  if (!user_id || !newPassword) {
    return res.json({ success: false, message: "Missing user ID or password" });
  }

  // Regex enforcing uppercase, lowercase, number, special char, and length >= 8
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({ success: false, message: "Password must be at least 8 characters and contain uppercase, lowercase, a number and a special character." });
  }

  const sql = `UPDATE users SET password = ?, must_change_password = FALSE WHERE user_id = ?`;

  db.query(sql, [newPassword, user_id], (err) => {
    if (err) {
      return res.json({ success: false, message: "Database error" });
    }

    return res.json({ success: true, message: "Password changed successfully" });
  });
});

// Forgot Password Flow: Generates secure token and dispatches email
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  // Check if user exists 
  const checkUserSql = "SELECT * FROM users WHERE email = ? AND status = 'active'";
  
  db.query(checkUserSql, [email], (err, result) => {
    if (err) return res.json({ success: false, message: "Database error" });
    
    // Anti-Enumeration Security: Always return success to hide registered emails from attackers
    if (result.length === 0) {
      return res.json({ success: true, message: "If the email exists, a reset link was sent." });
    }

    // Generate a 32-byte secure hex token expiring in 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000);

    // Store token in database
    const insertTokenSql = `INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)`;

    db.query(insertTokenSql, [email, token, expiresAt], (insertErr) => {
      if (insertErr) {
        console.error("Token insert error:", insertErr);
        return res.json({ success: false, message: "Failed to process request" });
      }

      // Send Email 
      const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
      
      const mailOptions = {
        from: 'no-reply@yourdomain.com',
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link to set a new password: ${resetLink}\n\nThis link expires in 1 hour.`
      };

      // Dispatch the email asychronously
      transporter.sendMail(mailOptions, (mailErr) => {
        if (mailErr) {
          console.error("Email error:", mailErr);
          return res.json({ success: false, message: "Failed to send email" });
        }
        
        return res.json({ success: true, message: "If the email exists, a reset link was sent." });
      });
    });
  });
});

// Finalize Password Reset: Validate token and update to newly hashed password
router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.json({ success: false, message: "Token and new password are required" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({ success: false, message: "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character." });
  }

  const verifySql = "SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()";
  
  db.query(verifySql, [token], (err, result) => {
    if (err) return res.json({ success: false, message: "Database error" });

    // Reject if token doesn't exist or time has expired
    if (result.length === 0) {
      return res.json({ success: false, message: "Invalid or expired reset token" });
    }

    const email = result[0].email;

    bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
      if (hashErr) return res.json({ success: false, message: "Error securing password" });

      const updatePasswordSql = "UPDATE users SET password = ?, must_change_password = FALSE WHERE email = ?";
      
      db.query(updatePasswordSql, [hashedPassword, email], (updateErr) => {
        if (updateErr) return res.json({ success: false, message: "Failed to update password" });

        // Clean up token after successful use to prevent reuse
        const deleteTokenSql = "DELETE FROM password_resets WHERE email = ?";
        db.query(deleteTokenSql, [email], (deleteErr) => {
          if (deleteErr) console.error("Failed to clean up token:", deleteErr);
          return res.json({ success: true, message: "Password has been successfully reset" });
        });
      });
    });
  });
});

// Admin Route: Deactivate a user
router.put("/users/:id/deactivate", verifyToken, requireRole(['admin']), (req, res) => {
  const userId = req.params.id;

  const sql = "UPDATE users SET status = 'inactive' WHERE user_id = ?";

  db.query(sql, [userId], (err) => {
    if (err) {
      return res.json({ success: false, message: "Failed to deactivate user" });
    }

    return res.json({ success: true, message: "User account deactivated successfully" });
  });
});

// Admin Route: Reactivate a user
router.put("/users/:id/reactivate", verifyToken, requireRole(['admin']), (req, res) => {
  const userId = req.params.id;

  const sql = "UPDATE users SET status = 'active' WHERE user_id = ?";

  db.query(sql, [userId], (err) => {
    if (err) {
      return res.json({ success: false, message: "Failed to reactivate user" });
    }

    return res.json({ success: true, message: "User account reactivated successfully" });
  });
});

// ============================================================================
// 3. FACILITY MANAGEMENT ROUTES
// ============================================================================

// Fetch facilities dynamically based on role visibility filters
router.get("/facilities", verifyToken, (req, res) => {
  const role = req.query.role;

  let sql = `SELECT * FROM facilities`;

  if (role === "student") {
    sql += ` WHERE visible_to IN ('student', 'both')`;
  } else if (role === "staff") {
    sql += ` WHERE visible_to IN ('staff', 'both')`;
  }

  sql += ` ORDER BY facility_id DESC`;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Facilities load error:", err);
      return res.json({ success: false, facilities: [] });
    }

    return res.json({ success: true, facilities: result });
  });
});

// Admin Route: Create a new facility with base64 image parsing
router.post("/facilities", verifyToken, requireRole(['admin']), (req, res) => {
  const {
    facility_name, facility_type, location, max_people,
    operating_start, operating_end, description, rules,
    additional_info, equipment, image_path, availability_status,
    visible_to, key_required, booking_flow_type, time_slots
  } = req.body;

  if (!facility_name || !facility_type || !location || !max_people || !operating_start || !operating_end) {
    return res.json({ success: false, message: "Please fill in all required facility details" });
  }

  let finalImagePath = null;
  // Convert base64 image payload into physical JPG file
  if (image_path && image_path.startsWith("data:image")) {
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const base64Data = image_path.replace(/^data:image\/\w+;base64,/, "");
    const fileName = `facility_new_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, base64Data, "base64");
    finalImagePath = `uploads/${fileName}`;
  }

  const sql = `
    INSERT INTO facilities
    (facility_name, facility_type, location, max_people, operating_start, operating_end,
     description, rules, additional_info, equipment, image_path, availability_status,
     visible_to, key_required, booking_flow_type, time_slots)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    facility_name, facility_type, location, max_people, operating_start, operating_end,
    description || "", rules || "", additional_info || "", equipment || "",
    finalImagePath, availability_status || "available", visible_to || "both",
    key_required || 0, booking_flow_type || "normal_approval", JSON.stringify(time_slots || null)
  ], (err) => {
    if (err) {
      console.log("Create facility error:", err);
      return res.json({ success: false, message: "Failed to create facility" });
    }

    return res.json({ success: true, message: "Facility created successfully" });
  });
});

// Admin Route: Update an existing facility
router.put("/facilities/:id", verifyToken, requireRole(['admin']), (req, res) => {
  const facilityId = req.params.id;

  const {
    facility_name, facility_type, location, max_people,
    operating_start, operating_end, description, rules,
    additional_info, equipment, image_path, availability_status,
    visible_to, key_required, booking_flow_type, time_slots
  } = req.body;

  if (!facility_name || !facility_type || !location || !max_people || !operating_start || !operating_end) {
    return res.json({ success: false, message: "Please fill in all required facility details" });
  }

  let finalImagePath = image_path || null;
  // Parse and save new image if updated
  if (image_path && image_path.startsWith("data:image")) {
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const base64Data = image_path.replace(/^data:image\/\w+;base64,/, "");
    const fileName = `facility_${facilityId}_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, base64Data, "base64");
    finalImagePath = `uploads/${fileName}`;
  }

  const sql = `
    UPDATE facilities SET
      facility_name = ?, facility_type = ?, location = ?, max_people = ?,
      operating_start = ?, operating_end = ?, description = ?, rules = ?,
      additional_info = ?, equipment = ?, image_path = ?, availability_status = ?,
      visible_to = ?, key_required = ?, booking_flow_type = ?, time_slots = ?
    WHERE facility_id = ?
  `;

  const timeSlotsValue = (time_slots && time_slots.length > 0) ? JSON.stringify(time_slots) : null;

  db.query(sql, [
    facility_name, facility_type, location, max_people, operating_start, operating_end,
    description || "", rules || "", additional_info || "", equipment || "",
    finalImagePath, availability_status || "available", visible_to || "both",
    key_required || 0, booking_flow_type || "normal_approval", timeSlotsValue, facilityId
  ], (err) => {
    if (err) {
      console.log("Update facility error:", err);
      return res.json({ success: false, message: "Failed to update facility" });
    }

    return res.json({ success: true, message: "Facility updated successfully" });
  });
});

// Admin Route: Delete a facility (Restricted if booking records exist)
router.delete("/facilities/:id", verifyToken, requireRole(['admin']), (req, res) => {
  const facilityId = req.params.id;

  // Verify usage integrity: Prevents deletion if history relies on this ID
  const checkSql = `SELECT booking_id FROM bookings WHERE facility_id = ? LIMIT 1`;

  db.query(checkSql, [facilityId], (checkErr, checkResult) => {
    if (checkErr) {
      return res.json({ success: false, message: "Failed to check facility usage" });
    }

    if (checkResult.length > 0) {
      return res.json({ success: false, message: "This facility cannot be deleted because it already has booking records" });
    }

    const deleteSql = `DELETE FROM facilities WHERE facility_id = ?`;

    db.query(deleteSql, [facilityId], (deleteErr) => {
      if (deleteErr) {
        console.log("Delete facility error:", deleteErr);
        return res.json({ success: false, message: "Failed to delete facility" });
      }

      return res.json({ success: true, message: "Facility deleted successfully" });
    });
  });
});

// ============================================================================
// 4. DYNAMIC SLOT GENERATION & SCHEDULING
// ============================================================================

/* ===== AVAILABLE 1-HOUR TIME SLOTS ===== */
// Constructs dynamic time arrays based on capacity and operating hours
router.get("/facilities/:id/available-slots", verifyToken, (req, res) => {
  const facilityId = req.params.id;
  const selectedDate = req.query.date;

  // Interceptor: Clean expired reservations first to ensure data accuracy
  updateCubicleBookingStatuses(() => {
    if (!selectedDate) {
      return res.json({ success: false, message: "Date is required", slots: [] });
    }

    // Weekend validation (0 = Sunday, 6 = Saturday)
    const dayNumber = new Date(selectedDate).getDay();
    if (dayNumber === 0 || dayNumber === 6) {
      return res.json({ success: true, message: "Bookings are not available on Saturday and Sunday", slots: [] });
    }

    const selectedDay = new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" });

    const facilitySql = `
      SELECT facility_name, operating_start, operating_end, booking_flow_type, max_people, time_slots
      FROM facilities WHERE facility_id = ? LIMIT 1
    `;

    db.query(facilitySql, [facilityId], (facilityErr, facilityResult) => {
      if (facilityErr || facilityResult.length === 0) {
        return res.json({ success: false, message: "Facility not found", slots: [] });
      }

      const facility = facilityResult[0];
      
      let slotsSource = [];
      if (facility.time_slots) {
        try { slotsSource = JSON.parse(facility.time_slots); } catch (e) { slotsSource = []; }
      }

      const maxCapacity = facility.max_people || 1; 

      // Gather active bookings for conflict calculation
      const bookingSql = `
        SELECT start_time, end_time FROM bookings
        WHERE facility_id = ? AND booking_date = ?
        AND booking_status IN ('pending', 'pending_payment', 'payment_submitted', 'approved', 'reserved', 'checked_in', 'key_collected')
      `;

      db.query(bookingSql, [facilityId, selectedDate], (bookingErr, bookingResult) => {
        if (bookingErr) return res.json({ success: false, message: "Failed to check bookings", slots: [] });

        const timetableSql = `SELECT start_time, end_time FROM class_timetable WHERE facility_id = ? AND day_of_week = ?`;

        db.query(timetableSql, [facilityId, selectedDay], (timetableErr, timetableResult) => {
          if (timetableErr) return res.json({ success: false, message: "Failed to check class timetable", slots: [] });

          const slots = [];
          const operatingStart = Number(facility.operating_start.substring(0, 2));
          const operatingEnd = Number(facility.operating_end.substring(0, 2));

          // Calculate how many bookings overlap the target slot
          const getBookedCount = (start, end) => {
            return bookingResult.filter(b => isTimeOverlap(start, end, b.start_time, b.end_time)).length;
          };

          let slotList = [];
          if (slotsSource && slotsSource.length > 0) {
            // Apply customized, pre-defined slot blocks
            slotList = slotsSource
              .map(slot => ({
                start_time: slot.start + ":00",
                end_time: slot.end + ":00"
              }))
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
          } else {
            // Dynamically generate default 1-hour intervals
            for (let hour = operatingStart; hour < operatingEnd; hour++) {
              slotList.push({
                start_time: `${String(hour).padStart(2, "0")}:00:00`,
                end_time: `${String(hour + 1).padStart(2, "0")}:00:00`
              });
            }
          }

          // Validate slot availability against class timetable and capacity
          slotList.forEach(slot => {
            const startTime = slot.start_time;
            const endTime = slot.end_time;

            const isClassTime = timetableResult.some(classSlot =>
              isTimeOverlap(startTime, endTime, classSlot.start_time, classSlot.end_time)
            );

            const currentBookedCount = getBookedCount(startTime, endTime);

            // Push to UI only if it has remaining capacity and no academic classes
            if (!isClassTime && currentBookedCount < maxCapacity) {
              slots.push({
                start_time: startTime,
                end_time: endTime,
                label: `${formatSlotTime(startTime)} - ${formatSlotTime(endTime)} (${currentBookedCount}/${maxCapacity} booked)`
              });
            }
          });

          return res.json({ success: true, slots: slots });
        });
      });
    });
  });
});

router.get("/test-slots", (req, res) => {
  res.json({ success: true, message: "Available slots route file is loaded" });
});

router.get("/facilities/:id", verifyToken, (req, res) => {
  const facilityId = req.params.id;

  const sql = `SELECT * FROM facilities WHERE facility_id = ? LIMIT 1`;

  db.query(sql, [facilityId], (err, result) => {
    if (err || result.length === 0) {
      return res.json({ success: false, message: "Facility not found" });
    }

    return res.json({ success: true, facility: result[0] });
  });
});

// Helper: Format 24-hour SQL time to user-friendly AM/PM
function formatSlotTime(time) {
  const [hour, minute] = time.split(":");
  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${minute} ${ampm}`;
}

// Helper: Determine if two time boundaries intersect mathematically
function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// ============================================================================
// 5. AUTOMATED BACKGROUND TIME EVALUATIONS
// ============================================================================

// Auto-releases reservations that missed the 15-minute QR check-in window
function releaseExpiredCubicleBookings(callback) {
  const sql = `
    UPDATE bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    SET b.booking_status = 'expired'
    WHERE f.booking_flow_type = 'direct_reservation'
    AND b.booking_status = 'reserved'
    AND NOW() > DATE_ADD(
      GREATEST(TIMESTAMP(b.booking_date, b.start_time), b.created_at),
      INTERVAL 15 MINUTE
    )
  `;
  db.query(sql, callback);
}

// Marks checked-in cubicle bookings as completed once their time expires naturally
function completeFinishedCubicleBookings(callback) {
  const sql = `
    UPDATE bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    SET b.booking_status = 'completed'
    WHERE LOWER(TRIM(f.facility_name)) LIKE 'cubicle%'
    AND b.booking_status = 'checked_in'
    AND NOW() > TIMESTAMP(b.booking_date, b.end_time)
  `;
  db.query(sql, callback);
}

// Orchestrator interceptor wrapper for lifecycle updates
function updateCubicleBookingStatuses(callback) {
  releaseExpiredCubicleBookings((releaseErr) => {
    if (releaseErr) console.log("Release expired cubicle bookings error:", releaseErr);
    completeFinishedCubicleBookings((completeErr) => {
      if (completeErr) console.log("Complete cubicle bookings error:", completeErr);
      callback();
    });
  });
}

// ============================================================================
// 6. BOOKING TRANSACTION WORKFLOW
// ============================================================================

// Main Endpoint: Processes new facility reservation requests transactionally
router.post("/bookings", verifyToken, (req, res) => {
  const { user_id, facility_id, program, booking_date, start_time, end_time, remark, equipmentRequired } = req.body;
  const userIdInt = parseInt(user_id);

  const duration_hours = (new Date(`${booking_date}T${end_time}`) - new Date(`${booking_date}T${start_time}`)) / (1000 * 60 * 60);

  if (!user_id || !facility_id || !program || !booking_date || !start_time || !end_time) {
    return res.json({ success: false, message: "Please fill in all required booking details" });
  }

  // Booking creation route
  // Request a dedicated database connection from the pool 
  db.getConnection((connErr, connection) => {
    if (connErr) return res.json({ success: false, message: "Database connection failed" });

    // Begin atomic execution block to prevent concurrency anomalies
    connection.beginTransaction((transactionErr) => {
      if (transactionErr) { connection.release(); return res.json({ success: false, message: "Failed to start transaction" }); }

      // FOR UPDATE: Locks the facility row, preventing multiple concurrent read/writes to capacity
      const facilitySql = `SELECT facility_name, booking_flow_type, max_people, availability_status FROM facilities WHERE facility_id = ? FOR UPDATE`;
      connection.query(facilitySql, [facility_id], (facilityErr, facilityResult) => {

        // .............. Validation logic for capacity limits and time overlap ..................
        if (facilityErr || facilityResult.length === 0) {
          return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Facility not found" }); });
        }

        if (facilityResult[0].availability_status !== 'available') {
          return connection.rollback(() => { connection.release(); res.json({ success: false, message: "This facility is currently not available for booking." }); });
        }

        const facilityName = facilityResult[0].facility_name;
        const bookingFlowType = facilityResult[0].booking_flow_type || "normal_approval";
        const maxCapacity = facilityResult[0].max_people || 1;
        
        // State initialization based on Facility flow configuration
        let bookingStatus = bookingFlowType === "normal_approval" ? "approved" : "pending";
        let keyStatus = (bookingFlowType === "normal_approval" || bookingFlowType === "staff_key_approval") ? "pending_collection" : "not_required";
        if (bookingFlowType === "payment_required") bookingStatus = "pending_payment";
        if (bookingFlowType === "direct_reservation") bookingStatus = "reserved";

        const paymentRequired = bookingFlowType === "payment_required" ? 1 : 0;
        const paymentStatus = paymentRequired ? "pending_payment" : "not_required";
        const paymentAmount = 0; 

        // Notification variables 
        let nTitle = "Booking Submitted";
        let nMsg = `Your booking request for ${facilityName} has been submitted successfully.`;

        if (bookingFlowType === "payment_required") {
          nTitle = "Payment Required";
          nMsg = "Please proceed to AFM to make payment so that your booking request only can be approved.";
        } else if (bookingFlowType === "staff_key_approval") {
          nMsg = `Your booking request for ${facilityName} has been submitted successfully. Please wait admin to approve.`;
        } else if (bookingFlowType === "normal_approval") {
          nTitle = "Booking Approved";
          nMsg = "Your booking has been approved. Please proceed to AFM to collect your key.";
        } else if (bookingFlowType === "direct_reservation") {
          nTitle = "Reservation Successful";
          nMsg = `Your have successfully reserved ${facilityName}. Please remember to check in.`;
        }

        const checkSql = `SELECT booking_id, user_id FROM bookings WHERE facility_id = ? AND booking_date = ? AND booking_status NOT IN ('cancelled', 'expired', 'completed') AND (? < end_time AND ? > start_time)`;

        // Check for personal overlapping bookings or total capacity breach
        connection.query(checkSql, [facility_id, booking_date, start_time, end_time], (checkErr, checkResult) => {
          if (checkErr) return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Error" }); });

          if (checkResult.find(b => b.user_id === userIdInt)) {
            return connection.rollback(() => { connection.release(); res.json({ success: false, message: "You already have an active booking for this facility at this time." }); });
          }

          if (checkResult.length >= maxCapacity) {
            return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Capacity reached." }); });
          }

          //....................................................................................................

          const insertSql = `
            INSERT INTO bookings 
            (user_id, facility_id, program, booking_date, start_time, end_time, duration_hours, remark, equipment_required, booking_status, key_status, payment_required, payment_status, payment_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          // Execute INSERT. If it fails, completely rollback the transaction state
          connection.query(insertSql, [user_id, facility_id, program, booking_date, start_time, end_time, duration_hours, remark || "", equipmentRequired || "", bookingStatus, keyStatus, paymentRequired, paymentStatus, paymentAmount], (insertErr, insertResult) => {
            if (insertErr) {
              return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Booking failed", error: insertErr.message }); });
            }

            // Lock released and changes persisted upon successful commit
            connection.commit((commitErr) => {
              if (commitErr) return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Commit failed" }); });
              connection.release();
              
              // Broadcast system notification
              db.query(
                "INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read) VALUES (?, ?, ?, ?, 'booking', 0)", 
                [user_id, insertResult.insertId, nTitle, nMsg],
                (userNotifErr) => {
                  // Trigger parallel email notification
                  db.query("SELECT email FROM users WHERE user_id = ?", [user_id], (err, rows) => {
                    if (!err && rows.length > 0) {
                      sendEmailNotification(rows[0].email, nTitle, nMsg);
                    }
                  });

                  // Dispatch targeted admin notifications if approval is required
                  const requiresAdminAction = ["payment_required", "staff_key_approval"].includes(bookingFlowType);

                  if (requiresAdminAction) {
                    let adminTitle = "New Booking Request";
                    let adminMsg = `A new booking request for ${facilityName} has been submitted and requires review.`;
                    if (bookingFlowType === "payment_required") adminMsg = `A new booking request for ${facilityName} has been submitted, if user have make payment then approved.`;
                    
                    db.query("INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read) SELECT user_id, ?, ?, ?, 'system', 0 FROM users WHERE role = 'admin' AND status = 'active'", 
                    [insertResult.insertId, adminTitle, adminMsg], () => {
                      return res.json({ success: true, title: nTitle, message: nMsg });
                    });
                  } else {
                    return res.json({ success: true, title: nTitle, message: nMsg });
                  }
                }
              );
            });
          });
        });
      });
    });
  });
});

// Fetch personal booking history for users
router.get("/activities/:user_id", verifyToken, (req, res) => {
  const userId = req.params.user_id;

  updateCubicleBookingStatuses(() => {
    const sql = `
      SELECT 
        b.booking_id,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        b.start_time, b.end_time, b.booking_status, b.key_status,
        b.payment_required, b.payment_status, b.payment_amount,
        f.facility_name, f.booking_flow_type, f.description, f.location, f.image_path
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
    `;

    db.query(sql, [userId], (err, result) => {
      if (err) {
        console.log("Activities load error:", err);
        return res.json({ success: false, message: "Failed to load activities", activities: [] });
      }

      return res.json({ success: true, activities: result });
    });
  });
});

// Retrieve system notifications
router.get("/notifications/:user_id", verifyToken, (req, res) => {
  const sql = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
  db.query(sql, [req.params.user_id], (err, result) => {
    if (err) return res.json({ success: false, notifications: [] });
    return res.json({ success: true, notifications: result });
  });
});

router.put("/notifications/:user_id/read-all", verifyToken, (req, res) => {
  const userId = req.params.user_id;
  const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ?`;

  db.query(sql, [userId], (err) => {
    if (err) {
      console.log("Read-all error:", err);
      return res.json({ success: false, message: "Failed to mark notifications as read" });
    }
    return res.json({ success: true });
  });
});

router.put("/notifications/:user_id/unread-all", verifyToken, (req, res) => {
  const userId = req.params.user_id;
  const sql = `UPDATE notifications SET is_read = 0 WHERE user_id = ?`;

  db.query(sql, [userId], (err) => {
    if (err) {
      console.log("Unread-all error:", err);
      return res.json({ success: false, message: "Failed to mark notifications as unread" });
    }
    return res.json({ success: true });
  });
});

// Profile modifications logic internally bound
router.put("/settings/change-password", verifyToken, (req, res) => {
  const { user_id, currentPassword, newPassword } = req.body;

  if (!user_id || !currentPassword || !newPassword) {
    return res.json({ success: false, message: "Please fill in all password fields" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({ success: false, message: "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character." });
  }

  const checkSql = `SELECT password FROM users WHERE user_id = ? LIMIT 1`;

  db.query(checkSql, [user_id], (err, result) => {
    if (err) return res.json({ success: false, message: "Database error" });
    if (result.length === 0) return res.json({ success: false, message: "User not found" });

    const storedPassword = result[0].password;
    const isHashed = storedPassword.startsWith("$2");

    const proceedUpdate = (isMatch) => {
      if (!isMatch) return res.json({ success: false, message: "Current password is incorrect" });

      bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
        if (hashErr) return res.json({ success: false, message: "Error securing password" });

        const updateSql = `UPDATE users SET password = ?, must_change_password = FALSE WHERE user_id = ?`;

        db.query(updateSql, [hashedPassword, user_id], (updateErr) => {
          if (updateErr) return res.json({ success: false, message: "Failed to change password" });
          return res.json({ success: true, message: "Password changed successfully" });
        });
      });
    };

    if (isHashed) {
      bcrypt.compare(currentPassword, storedPassword, (err, match) => {
        if (err) return res.json({ success: false, message: "Server error" });
        proceedUpdate(match);
      });
    } else {
      proceedUpdate(currentPassword === storedPassword);
    }
  });
});

router.get("/profile/:user_id", verifyToken, (req, res) => {
  const userId = req.params.user_id;

  const sql = `SELECT user_id, name, email, role FROM users WHERE user_id = ? LIMIT 1`;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.json({ success: false, message: "Failed to load profile" });
    if (result.length === 0) return res.json({ success: false, message: "User not found" });
    return res.json({ success: true, user: result[0] });
  });
});

// Process QR Code Check-in and evaluate Grace Periods
router.put("/bookings/:id/check-in", verifyToken, (req, res) => {
  const bookingId = req.params.id;
  const { user_id } = req.body;

  const sql = `
    SELECT booking_id, user_id,
      DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(end_time, '%H:%i:%s') AS end_time,
      booking_status, created_at
    FROM bookings WHERE booking_id = ? AND user_id = ? LIMIT 1
  `;

  db.query(sql, [bookingId, user_id], (err, result) => {
    const booking = result[0];
    const bookingStatus = booking.booking_status ? booking.booking_status.trim().toLowerCase() : "";

    if (bookingStatus !== "reserved") {
      return res.json({ success: false, message: "This booking is not available for check-in" });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const createdAt = new Date(booking.created_at);
    const now = new Date();

    // Logic: Validates if current time falls within [-15m, +15m] window
    const baseTime = createdAt > startDateTime ? createdAt : startDateTime;

    const checkInStart = new Date(baseTime);
    checkInStart.setMinutes(checkInStart.getMinutes() - 15);

    const checkInEnd = new Date(baseTime);
    checkInEnd.setMinutes(checkInEnd.getMinutes() + 15);

    if (now < checkInStart) return res.json({ success: false, message: "Check-in is not open yet" });
    if (now > checkInEnd) return res.json({ success: false, message: "Check-in time has expired" });

    // Transition state from reserved -> checked_in
    const updateSql = `UPDATE bookings SET booking_status = 'checked_in' WHERE booking_id = ?`;

    db.query(updateSql, [bookingId], (updateErr) => {
      if (updateErr) return res.json({ success: false, message: "Failed to check in" });
      return res.json({ success: true, message: "Check-in successful" });
    });
  });
});

router.get("/bookings/:id", verifyToken, (req, res) => {
  const bookingId = req.params.id;

  updateCubicleBookingStatuses(() => {
    const sql = `
      SELECT 
        b.booking_id, b.user_id, b.facility_id, b.program, b.created_at,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,
        b.duration_hours, b.remark, b.booking_status, b.key_status,
        b.payment_required, b.payment_status, b.payment_amount,
        f.facility_name, f.facility_type, f.booking_flow_type, f.description, f.location, f.image_path
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      WHERE b.booking_id = ? LIMIT 1
    `;

    db.query(sql, [bookingId], (err, result) => {
      if (err) {
        console.log("Booking details error:", err);
        return res.json({ success: false, message: "Failed to load booking details" });
      }

      if (result.length === 0) return res.json({ success: false, message: "Booking not found" });
      return res.json({ success: true, booking: result[0] });
    });
  });
});

// Enforce 1-hour cancellation deadline
router.put("/bookings/:id/cancel", verifyToken, (req, res) => {
  const bookingId = req.params.id;
  const { user_id } = req.body;

  const sql = `
    SELECT booking_id, user_id,
      DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
      booking_status
    FROM bookings WHERE booking_id = ? AND user_id = ? LIMIT 1
  `;

  db.query(sql, [bookingId, user_id], (err, result) => {
    if (err || result.length === 0) return res.json({ success: false, message: "Booking not found" });

    const booking = result[0];
    const status = booking.booking_status ? booking.booking_status.trim().toLowerCase() : "";

    // Lock states that are finalized or active
    if (["cancelled", "completed", "expired", "checked_in", "key_collected"].includes(status)) {
      return res.json({ success: false, message: "This booking cannot be cancelled" });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const cancelDeadline = new Date(startDateTime);
    cancelDeadline.setMinutes(cancelDeadline.getMinutes() - 60);

    if (new Date() > cancelDeadline) {
      return res.json({ success: false, message: "You can only cancel at least 1 hour before the booking starts" });
    }

    const updateSql = `UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = ?`;

    db.query(updateSql, [bookingId], (updateErr) => {
      if (updateErr) return res.json({ success: false, message: "Failed to cancel booking" });

      const adminNotifSql = `
        INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
        SELECT user_id, ?, 'Booking Cancelled', 'User has cancelled a previously approved booking.', 'system', 0
        FROM users WHERE role = 'admin' AND status = 'active'
      `;
      db.query(adminNotifSql, [bookingId], (adminErr) => {
        if (adminErr) console.error("Failed to send admin cancellation notif:", adminErr);
      });

      return res.json({ success: true, message: "Booking cancelled successfully" });
    });
  });
});

// ============================================================================
// 7. ADMIN DASHBOARDS & LIFECYCLE CONTROLS
// ============================================================================

router.get("/admin/bookings", verifyToken, requireRole(['admin']), (req, res) => {
  const sql = `
    SELECT 
      b.booking_id,
      DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,
      b.remark, b.booking_status, b.payment_status, b.key_status,
      u.name AS user_name, u.role AS user_role, f.facility_name
    FROM bookings b
    JOIN users u ON b.user_id = u.user_id
    JOIN facilities f ON b.facility_id = f.facility_id
    ORDER BY b.booking_date DESC, b.start_time DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Admin bookings load error:", err);
      return res.json({ success: false, bookings: [] });
    }

    return res.json({ success: true, bookings: result });
  });
});

// Administrative booking approval transition logic
router.put("/admin/bookings/:id/approve", verifyToken, requireRole(['admin']), (req, res) => {
  const bookingId = req.params.id;

  const updateSql = `
    UPDATE bookings SET booking_status = 'approved'
    WHERE booking_id = ? AND booking_status IN ('pending', 'pending_payment', 'payment_submitted')
  `;

  db.query(updateSql, [bookingId], (err, result) => {
    if (err) return res.json({ success: false, message: "Failed to approve booking" });
    if (result.affectedRows === 0) return res.json({ success: false, message: "This booking cannot be approved" });

    const notificationSql = `
      INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
      SELECT b.user_id, b.booking_id, 'Booking Approved',
        CASE WHEN f.booking_flow_type = 'staff_key_approval'
          THEN CONCAT('Your booking request of ', f.facility_name, ' has been approved. Please go to AFM to collect the key.')
          ELSE CONCAT('Your booking request of ', f.facility_name, ' has been approved.')
        END, 'booking_approved', 0
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      WHERE b.booking_id = ?
    `;

    db.query(notificationSql, [bookingId], (notificationErr) => {
      if (notificationErr) console.log("Approval notification error:", notificationErr);

      const emailSql = `
        SELECT u.email, f.facility_name, f.booking_flow_type
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN facilities f ON b.facility_id = f.facility_id
        WHERE b.booking_id = ? LIMIT 1
      `;

      db.query(emailSql, [bookingId], (emailErr, emailResult) => {
        if (!emailErr && emailResult.length > 0) {
          const user = emailResult[0];
          const emailMessage = user.booking_flow_type === "staff_key_approval"
            ? `Your booking request of ${user.facility_name} has been approved. Please go to AFM to collect the key.`
            : `Your booking request of ${user.facility_name} has been approved.`;
          sendEmailNotification(user.email, "Booking Approved", emailMessage);
        }
      });

      return res.json({ success: true, message: "Booking approved successfully" });
    });
  });
});

router.put("/admin/bookings/:id/cancel", verifyToken, requireRole(['admin']), (req, res) => {
  const bookingId = req.params.id;

  const sql = `
    UPDATE bookings SET booking_status = 'cancelled'
    WHERE booking_id = ? AND booking_status NOT IN ('cancelled', 'completed', 'expired', 'checked_in', 'key_collected')
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) return res.json({ success: false, message: "Failed to cancel booking" });
    if (result.affectedRows === 0) return res.json({ success: false, message: "This booking cannot be cancelled" });

    const userNotifSql = `
      INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
      SELECT user_id, booking_id, 'Booking Cancelled', 'Admin did not approve your booking.', 'booking_cancelled', 0
      FROM bookings WHERE booking_id = ?
    `;
    db.query(userNotifSql, [bookingId], (userErr) => {
      if (userErr) console.error("Failed to send user cancellation notif:", userErr);
    });

    return res.json({ success: true, message: "Booking cancelled successfully" });
  });
});

// Retrieve physical key dependencies for tracking and monitoring
router.get("/admin/key-management", verifyToken, requireRole(['admin']), (req, res) => {
  const sql = `
    SELECT
      b.booking_id, b.user_id,
      DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,
      DATE_FORMAT(b.key_returned_at, '%Y-%m-%d %H:%i:%s') AS key_returned_at,
      b.booking_status, b.key_status,
      u.name AS holder_name, u.role AS holder_role,
      f.facility_name, f.image_path, f.booking_flow_type, f.key_required
    FROM bookings b
    JOIN users u ON b.user_id = u.user_id
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND f.key_required = 1
    AND (
      (b.booking_status = 'approved' AND b.key_status = 'pending_collection')
      OR (b.booking_status = 'key_collected' AND b.key_status = 'collected')
      OR (b.booking_status = 'completed' AND b.key_status = 'returned')
    )
    ORDER BY b.booking_date ASC, b.start_time ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Key management load error:", err);
      return res.json({ success: false, keys: [] });
    }

    return res.json({ success: true, keys: result });
  });
});

// Admin executes 'Collect Key' action
router.put("/admin/bookings/:id/collect-key", verifyToken, requireRole(['admin']), (req, res) => {
  const bookingId = req.params.id;

  const sql = `
    UPDATE bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    SET b.booking_status = 'key_collected', b.key_status = 'collected'
    WHERE b.booking_id = ? AND b.booking_status = 'approved'
    AND b.key_status = 'pending_collection'
    AND f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) return res.json({ success: false, message: "Failed to mark key as collected" });
    if (result.affectedRows === 0) return res.json({ success: false, message: "This booking is not ready for key collection" });
    return res.json({ success: true, message: "Key collected successfully" });
  });
});

// QR Return Key execution
router.put("/bookings/:id/return-key", verifyToken, (req, res) => {
  const bookingId = req.params.id;
  const { user_id } = req.body;

  const sql = `
    UPDATE bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    SET b.booking_status = 'completed', b.key_status = 'returned', b.key_returned_at = NOW()
    WHERE b.booking_id = ? AND b.user_id = ?
    AND b.booking_status = 'key_collected' AND b.key_status = 'collected'
    AND f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
  `;

  db.query(sql, [bookingId, user_id], (err, result) => {
    if (err) {
      console.log("Return key error:", err);
      return res.json({ success: false, message: "Failed to return key" });
    }

    if (result.affectedRows === 0) return res.json({ success: false, message: "This key cannot be returned yet" });
    return res.json({ success: true, message: "Key returned successfully" });
  });
});

// Generate automated prompt for completed sessions
function createKeyReturnReminders(callback) {
  const sql = `
    INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
    SELECT b.user_id, b.booking_id, 'Key Return Reminder', 
           CONCAT('Reminder: Please return the key for ', f.facility_name, '.'), 
           'key_return_reminder', 0
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE b.booking_status = 'key_collected'
    AND NOW() >= TIMESTAMP(b.booking_date, b.end_time)
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.booking_id = b.booking_id AND n.notification_type = 'key_return_reminder'
    )
  `;
  db.query(sql, (err, result) => {
    if (err) console.error("Error creating reminders:", err);
    callback();
  });
}

// Redirect logic mapping physical QR codes to system reservations
router.get("/bookings/current-booking/:facility_id/:user_id", verifyToken, (req, res) => {
  const facilityId = req.params.facility_id;
  const userId = req.params.user_id;

  const now = new Date();
  
  const localDate = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0');
                    
  const localTime = String(now.getHours()).padStart(2, '0') + ':' + 
                    String(now.getMinutes()).padStart(2, '0') + ':' + 
                    String(now.getSeconds()).padStart(2, '0');

  const sql = `
    SELECT b.booking_id 
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE b.user_id = ? AND b.facility_id = ? 
    AND (
      (b.booking_status = 'reserved' AND b.booking_date = ? AND ? BETWEEN b.start_time AND b.end_time)
      OR (b.booking_status = 'key_collected' AND b.key_status = 'collected' AND f.booking_flow_type IN ('staff_key_approval', 'normal_approval'))
    )
    LIMIT 1
  `;

  db.query(sql, [userId, facilityId, localDate, localTime], (err, result) => {
    if (err) {
      console.error("Database error in current-booking:", err);
      return res.json({ success: false, message: "Database error" });
    }
    
    if (result.length === 0) {
      return res.json({ success: false, message: "No active reservation or key return found for this facility at this time." });
    }

    return res.json({ success: true, booking_id: result[0].booking_id });
  });
});

// Critical System Alert: Flags users 30+ minutes past session end to mitigate access breaches
function createOverdueKeyNotifications(callback) {
  const userSql = `
    INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
    SELECT b.user_id, b.booking_id, 'OVERDUE: Key Return', 
      CONCAT('URGENT: Your booking for ', f.facility_name, ' ended over 30 minutes ago. Please return the key immediately to avoid penalties.'), 
      'key_overdue_warning', 0
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND b.booking_status = 'key_collected' AND b.key_status = 'collected'
    AND NOW() >= DATE_ADD(TIMESTAMP(b.booking_date, b.end_time), INTERVAL 30 MINUTE)
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.booking_id = b.booking_id AND n.notification_type = 'key_overdue_warning' AND n.user_id = b.user_id
    )
  `;

  const adminSql = `
    INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
    SELECT u.user_id, b.booking_id, 'OVERDUE: Key Return Alert', 
      CONCAT('URGENT: A key for ', f.facility_name, ' is overdue by over 30 minutes.'), 
      'admin_key_overdue', 0
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    CROSS JOIN users u
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND b.booking_status = 'key_collected' AND b.key_status = 'collected'
    AND NOW() >= DATE_ADD(TIMESTAMP(b.booking_date, b.end_time), INTERVAL 30 MINUTE)
    AND u.role = 'admin' AND u.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.booking_id = b.booking_id AND n.notification_type = 'admin_key_overdue' AND n.user_id = u.user_id
    )
  `;

  db.query(userSql, (err) => {
    if (err) console.error("Error creating user overdue reminders:", err);
    db.query(adminSql, (adminErr) => {
      if (adminErr) console.error("Error creating admin overdue reminders:", adminErr);
      if (callback) callback();
    });
  });
}

module.exports = router;
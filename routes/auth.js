const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'courneyk8570@gmail.com',
    pass: '' // REPLACE THIS
  }
});

function sendEmailNotification(userEmail, title, message) {
  const mailOptions = { from: 'courneyk8570@gmail.com', to: userEmail, subject: title, text: message };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Email error:", error);
    else console.log("Email sent: " + info.response);
  });
}

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND status = 'active'";

  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Database error" });
    }

    // If the user exists
    if (result.length === 1) {
      const user = result[0];

      // Check if the password in the database is a bcrypt hash (starts with $2)
      const isHashed = user.password.startsWith("$2");

      if (isHashed) {
        // --- NEW SECURE ACCOUNTS ---
        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
          if (compareErr) return res.json({ success: false, message: "Error verifying credentials" });
          
          if (isMatch) {
            return res.json({
              success: true,
              user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                must_change_password: user.must_change_password
              }
            });
          } else {
            return res.json({ success: false, message: "Invalid email or password" });
          }
        });
      } else {
        // --- OLD PLAIN-TEXT ACCOUNTS (Legacy) ---
        // Direct string comparison for accounts created before the bcrypt upgrade
        if (password === user.password) {
          return res.json({
            success: true,
            user: {
              id: user.user_id,
              name: user.name,
              email: user.email,
              role: user.role,
              must_change_password: user.must_change_password
            }
          });
        } else {
          return res.json({ success: false, message: "Invalid email or password" });
        }
      }
    } else {
      // User not found or inactive
      return res.json({ success: false, message: "Invalid email or password" });
    }
  });
});

router.post("/users", (req, res) => {
  const { name, user_code, email, role } = req.body;

  if (!name || !user_code || !email || !role) {
    return res.json({
      success: false,
      message: "Please fill in all fields"
    });
  }

  if (role !== "student" && role !== "staff" && role !== "admin") {
    return res.json({
      success: false,
      message: "Invalid role"
    });
  }

  // The raw password that will be given to the user
  const defaultPassword = user_code;

  // Hash the default password before saving to the database
  // The '10' is the salt rounds (standard security level)
  bcrypt.hash(defaultPassword, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      return res.json({
        success: false,
        message: "Error securing password"
      });
    }

    const sql = `
      INSERT INTO users 
      (name, user_code, email, password, role, status, must_change_password)
      VALUES (?, ?, ?, ?, ?, 'active', TRUE)
    `;

    // Insert the HASHED password, not the default text
    db.query(sql, [name, user_code, email, hashedPassword, role], (err) => {
      if (err) {
        return res.json({
          success: false,
          message: "User already exists or database error"
        });
      }

      // Return the plain text defaultPassword so the admin can tell the user
      return res.json({
        success: true,
        message: `Account created successfully. Temporary password: ${defaultPassword}. Please tell the user to change password after first login.`,
        temporaryPassword: defaultPassword
      });
    });
  });
});

router.get("/users", (req, res) => {
  const sql = "SELECT user_id, name, user_code, email, role, status FROM users ORDER BY user_id DESC";

  db.query(sql, (err, result) => {
    if (err) {
      return res.json({
        success: false,
        users: []
      });
    }

    return res.json({
      success: true,
      users: result
    });
  });
});

router.post("/change-password", (req, res) => {
  const { user_id, newPassword } = req.body;

  if (!user_id || !newPassword) {
    return res.json({
      success: false,
      message: "Missing user ID or password"
    });
  }

  const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters and contain uppercase, lowercase, a number and a special character."
    });
  }

  const sql = `
    UPDATE users
    SET password = ?, must_change_password = FALSE
    WHERE user_id = ?
  `;

  db.query(sql, [newPassword, user_id], (err) => {
    if (err) {
      return res.json({
        success: false,
        message: "Database error"
      });
    }

    return res.json({
      success: true,
      message: "Password changed successfully"
    });
  });
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  // 1. Check if user exists
  const checkUserSql = "SELECT * FROM users WHERE email = ? AND status = 'active'";
  
  db.query(checkUserSql, [email], (err, result) => {
    if (err) return res.json({ success: false, message: "Database error" });
    
    if (result.length === 0) {
      // Return success anyway to prevent email enumeration (fishing for valid emails)
      return res.json({ success: true, message: "If the email exists, a reset link was sent." });
    }

    // 2. Generate a secure random token and expiration (1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // 3. Store token in database
    const insertTokenSql = `
      INSERT INTO password_resets (email, token, expires_at) 
      VALUES (?, ?, ?)
    `;

    db.query(insertTokenSql, [email, token, expiresAt], (insertErr) => {
      if (insertErr) {
        console.error("Token insert error:", insertErr);
        return res.json({ success: false, message: "Failed to process request" });
      }

      // 4. Send the email
      const resetLink = `http://localhost:3000/reset-password.html?token=${token}`; // Update frontend URL as needed
      
      const mailOptions = {
        from: 'no-reply@yourdomain.com',
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link to set a new password: ${resetLink}\n\nThis link expires in 1 hour.`
      };

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

router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.json({ success: false, message: "Token and new password are required" });
  }

  const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character."
    });
  }

  // 1. Verify token exists and is not expired
  const verifySql = "SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()";
  
  db.query(verifySql, [token], (err, result) => {
    if (err) return res.json({ success: false, message: "Database error" });

    if (result.length === 0) {
      return res.json({ success: false, message: "Invalid or expired reset token" });
    }

    const email = result[0].email;

    // 2. Hash the new password using bcrypt
    bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
      if (hashErr) return res.json({ success: false, message: "Error securing password" });

      // 3. Update the user's password
      const updatePasswordSql = "UPDATE users SET password = ?, must_change_password = FALSE WHERE email = ?";
      
      db.query(updatePasswordSql, [hashedPassword, email], (updateErr) => {
        if (updateErr) return res.json({ success: false, message: "Failed to update password" });

        // 4. Delete the used token to prevent reuse
        const deleteTokenSql = "DELETE FROM password_resets WHERE email = ?";
        db.query(deleteTokenSql, [email], (deleteErr) => {
          if (deleteErr) console.error("Failed to clean up token:", deleteErr);
          
          return res.json({ success: true, message: "Password has been successfully reset" });
        });
      });
    });
  });
});

router.put("/users/:id/deactivate", (req, res) => {
  const userId = req.params.id;

  const sql = "UPDATE users SET status = 'inactive' WHERE user_id = ?";

  db.query(sql, [userId], (err) => {
    if (err) {
      return res.json({
        success: false,
        message: "Failed to deactivate user"
      });
    }

    return res.json({
      success: true,
      message: "User account deactivated successfully"
    });
  });
});

router.put("/users/:id/reactivate", (req, res) => {
  const userId = req.params.id;

  const sql = "UPDATE users SET status = 'active' WHERE user_id = ?";

  db.query(sql, [userId], (err) => {
    if (err) {
      return res.json({
        success: false,
        message: "Failed to reactivate user"
      });
    }

    return res.json({
      success: true,
      message: "User account reactivated successfully"
    });
  });
});

router.get("/facilities", (req, res) => {
  const role = req.query.role;

  let sql = `
    SELECT *
    FROM facilities
  `;

  if (role === "student") {
    sql += `
      WHERE visible_to IN ('student', 'both')
    `;
  } else if (role === "staff") {
    sql += `
      WHERE visible_to IN ('staff', 'both')
    `;
  }

  sql += `
    ORDER BY facility_id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Facilities load error:", err);

      return res.json({
        success: false,
        facilities: []
      });
    }

    return res.json({
      success: true,
      facilities: result
    });
  });
});

router.post("/facilities", (req, res) => {
const {
  facility_name,
  facility_type,
  location,
  max_people,
  operating_start,
  operating_end,
  description,
  rules,
  additional_info,
  equipment,
  image_path,
  availability_status,
  visible_to,
  key_required,
  booking_flow_type,
  time_slots
} = req.body;

  if (
    !facility_name ||
    !facility_type ||
    !location ||
    !max_people ||
    !operating_start ||
    !operating_end
  ) {
    return res.json({
      success: false,
      message: "Please fill in all required facility details"
    });
  }

  const sql = `
    INSERT INTO facilities
    (
      facility_name,
      facility_type,
      location,
      max_people,
      operating_start,
      operating_end,
      description,
      rules,
      additional_info,
      equipment,
      image_path,
      availability_status,
      visible_to,
      key_required,
      booking_flow_type,
      time_slots
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      facility_name,
      facility_type,
      location,
      max_people,
      operating_start,
      operating_end,
      description || "",
      rules || "",
      additional_info || "",
      equipment || "",
      finalImagePath || "images/bg-image-2.jpeg",
      availability_status || "available",
      visible_to || "both",
      key_required || 0,
      booking_flow_type || "normal_approval",
      JSON.stringify(time_slots || null)
    ],
    (err) => {
      if (err) {
        console.log("Create facility error:", err);

        return res.json({
          success: false,
          message: "Failed to create facility"
        });
      }

      return res.json({
        success: true,
        message: "Facility created successfully"
      });
    }
  );
});

router.put("/facilities/:id", (req, res) => {
  const facilityId = req.params.id;
  const fs = require("fs");
  const path = require("path");

  const {
    facility_name,
    facility_type,
    location,
    max_people,
    operating_start,
    operating_end,
    description,
    rules,
    additional_info,
    equipment,
    image_path,
    availability_status,
    visible_to,
    key_required,
    booking_flow_type,
    time_slots
  } = req.body;

  let finalImagePath = image_path;

  if (image_path && image_path.startsWith("data:image")) {
    const base64Data = image_path.replace(/^data:image\/\w+;base64,/, "");
    const fileName = `facility_${facilityId}_${Date.now()}.jpg`;
    const filePath = path.join(__dirname, "../public/uploads", fileName);
    fs.writeFileSync(filePath, base64Data, "base64");
    finalImagePath = `uploads/${fileName}`;
  }

  if (
    !facility_name ||
    !facility_type ||
    !location ||
    !max_people ||
    !operating_start ||
    !operating_end
  ) {
    return res.json({
      success: false,
      message: "Please fill in all required facility details"
    });
  }

  const sql = `
    UPDATE facilities
    SET 
      facility_name = ?,
      facility_type = ?,
      location = ?,
      max_people = ?,
      operating_start = ?,
      operating_end = ?,
      description = ?,
      rules = ?,
      additional_info = ?,
      equipment = ?,
      image_path = ?,
      availability_status = ?,
      visible_to = ?,
      key_required = ?,
      booking_flow_type = ?,
      time_slots = ?
    WHERE facility_id = ?
  `;

  db.query(
    sql,
    [
      facility_name,
      facility_type,
      location,
      max_people,
      operating_start,
      operating_end,
      description || "",
      rules || "",
      additional_info || "",
      equipment || "",
      finalImagePath || "images/bg-image-2.jpeg",
      availability_status || "available",
      visible_to || "both",
      key_required || 0,
      booking_flow_type || "normal_approval",
      JSON.stringify(time_slots || null),
      facilityId
    ],
    (err) => {
      if (err) {
        console.log("Update facility error:", err);

        return res.json({
          success: false,
          message: "Failed to update facility"
        });
      }

      return res.json({
        success: true,
        message: "Facility updated successfully"
      });
    }
  );
});

router.delete("/facilities/:id", (req, res) => {
  const facilityId = req.params.id;

  const checkSql = `
    SELECT booking_id
    FROM bookings
    WHERE facility_id = ?
    LIMIT 1
  `;

  db.query(checkSql, [facilityId], (checkErr, checkResult) => {
    if (checkErr) {
      return res.json({
        success: false,
        message: "Failed to check facility usage"
      });
    }

    if (checkResult.length > 0) {
      return res.json({
        success: false,
        message: "This facility cannot be deleted because it already has booking records"
      });
    }

    const deleteSql = `
      DELETE FROM facilities
      WHERE facility_id = ?
    `;

    db.query(deleteSql, [facilityId], (deleteErr) => {
      if (deleteErr) {
        console.log("Delete facility error:", deleteErr);

        return res.json({
          success: false,
          message: "Failed to delete facility"
        });
      }

      return res.json({
        success: true,
        message: "Facility deleted successfully"
      });
    });
  });
});

/* ===== AVAILABLE 1-HOUR TIME SLOTS ===== */
router.get("/facilities/:id/available-slots", (req, res) => {
  const facilityId = req.params.id;
  const selectedDate = req.query.date;

  updateCubicleBookingStatuses(() => {
    if (!selectedDate) {
      return res.json({ success: false, message: "Date is required", slots: [] });
    }

    const dayNumber = new Date(selectedDate).getDay();
    if (dayNumber === 0 || dayNumber === 6) {
      return res.json({ success: true, message: "Bookings are not available on Saturday and Sunday", slots: [] });
    }

    const selectedDay = new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" });

    // 1. ADDED max_people TO THIS QUERY
    const facilitySql = `
      SELECT facility_name, operating_start, operating_end, booking_flow_type, max_people
      FROM facilities
      WHERE facility_id = ?
      LIMIT 1
    `;

    db.query(facilitySql, [facilityId], (facilityErr, facilityResult) => {
      if (facilityErr || facilityResult.length === 0) {
        return res.json({ success: false, message: "Facility not found", slots: [] });
      }

      const facility = facilityResult[0];
      
      let slotsSource = [];

      if (facility.time_slots) {
        try {
          slotsSource = JSON.parse(facility.time_slots);
        } catch (e) {
          slotsSource = [];
        }
      }

      // 2. DEFINE THE CAPACITY LIMIT FROM DATABASE (Defaults to 1 if blank)
      const maxCapacity = facility.max_people || 1; 

      const bookingSql = `
        SELECT start_time, end_time
        FROM bookings
        WHERE facility_id = ?
        AND booking_date = ?
        AND booking_status IN ('pending', 'pending_payment', 'payment_submitted', 'approved', 'reserved', 'checked_in', 'key_collected')
      `;

      db.query(bookingSql, [facilityId, selectedDate], (bookingErr, bookingResult) => {
        const isBooked = (startTime, endTime) =>
          bookingResult.some(b =>
            isTimeOverlap(startTime, endTime, b.start_time, b.end_time)
          );

        if (bookingErr) return res.json({ success: false, message: "Failed to check bookings", slots: [] });

        const timetableSql = `
          SELECT start_time, end_time
          FROM class_timetable
          WHERE facility_id = ? AND day_of_week = ?
        `;

        db.query(timetableSql, [facilityId, selectedDay], (timetableErr, timetableResult) => {
          if (timetableErr) return res.json({ success: false, message: "Failed to check class timetable", slots: [] });

          const slots = [];
          const operatingStart = Number(facility.operating_start.substring(0, 2));
          const operatingEnd = Number(facility.operating_end.substring(0, 2));

          if (isNaN(operatingStart) || isNaN(operatingEnd) || operatingStart >= operatingEnd) {
            return res.json({ success: false, message: "Invalid operating hours", slots: [] });
          }

          const today = new Date().toISOString().split("T")[0];
          const now = new Date();
          const minimumBookingTime = new Date();
          minimumBookingTime.setMinutes(minimumBookingTime.getMinutes() + 30); 

          if (slotsSource.length > 0) {
            // ADMIN CUSTOM SLOTS (THIS FIXES YOUR ISSUE)
            slotsSource.forEach(slot => {
              const startTime = slot.start_time || slot.start;
              const endTime = slot.end_time || slot.end;

              const isClassTime = timetableResult.some(classSlot =>
                isTimeOverlap(startTime, endTime, classSlot.start_time, classSlot.end_time)
              );

              if (!isClassTime && !isBooked(startTime, endTime)) {
                slots.push({
                  start_time: startTime,
                  end_time: endTime,
                  label: `${formatSlotTime(startTime)} - ${formatSlotTime(endTime)}`
                });
              }
            });

          } else {
            // FALLBACK AUTO SLOTS (ONLY IF ADMIN DID NOT SET ANY)
            for (let hour = operatingStart; hour < operatingEnd; hour++) {
              const startTime = `${String(hour).padStart(2, "0")}:00:00`;
              const endTime = `${String(hour + 1).padStart(2, "0")}:00:00`;

              const isClassTime = timetableResult.some(classSlot =>
                isTimeOverlap(startTime, endTime, classSlot.start_time, classSlot.end_time)
              );

              if (!isClassTime && !isBooked(startTime, endTime)) {
                slots.push({
                  start_time: startTime,
                  end_time: endTime,
                  label: `${formatSlotTime(startTime)} - ${formatSlotTime(endTime)}`
                });
              }
            }
          }

          return res.json({ success: true, slots: slots });
        });
      });
    });
  });
});

router.get("/test-slots", (req, res) => {
  res.json({
    success: true,
    message: "Available slots route file is loaded"
  });
});

router.get("/facilities/:id", (req, res) => {
  const facilityId = req.params.id;

  const sql = `
    SELECT *
    FROM facilities
    WHERE facility_id = ?
    LIMIT 1
  `;

  db.query(sql, [facilityId], (err, result) => {
    if (err || result.length === 0) {
      return res.json({
        success: false,
        message: "Facility not found"
      });
    }

    return res.json({
      success: true,
      facility: result[0]
    });
  });
});

function formatSlotTime(time) {
  const [hour, minute] = time.split(":");

  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12;

  if (h === 0) h = 12;

  return `${h}:${minute} ${ampm}`;
}

function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

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

function updateCubicleBookingStatuses(callback) {
  releaseExpiredCubicleBookings((releaseErr) => {
    if (releaseErr) {
      console.log("Release expired cubicle bookings error:", releaseErr);
    }

    completeFinishedCubicleBookings((completeErr) => {
      if (completeErr) {
        console.log("Complete cubicle bookings error:", completeErr);
      }

      callback();
    });
  });
}

/* ===== SUBMIT BOOKING WITH TRANSACTION AND ROW LOCKING (CAPACITY & DUPLICATE CHECK) ===== */
router.post("/bookings", (req, res) => {
  const { user_id, facility_id, program, booking_date, start_time, end_time, purpose, equipmentRequired } = req.body;
  const userIdInt = parseInt(user_id);

  if (!user_id || !facility_id || !program || !booking_date || !start_time || !end_time) {
    return res.json({ success: false, message: "Please fill in all required booking details" });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) return res.json({ success: false, message: "Database connection failed" });

    connection.beginTransaction((transactionErr) => {
      if (transactionErr) { connection.release(); return res.json({ success: false, message: "Failed to start transaction" }); }

      const facilitySql = `SELECT facility_name, booking_flow_type, max_people FROM facilities WHERE facility_id = ? FOR UPDATE`;
      connection.query(facilitySql, [facility_id], (facilityErr, facilityResult) => {
        if (facilityErr || facilityResult.length === 0) {
          return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Facility not found" }); });
        }
        // --- ADD THIS SECURITY CHECK ---
        if (facilityResult[0].availability_status !== 'available') {
            return connection.rollback(() => {
                connection.release();
                res.json({ success: false, message: "This facility is currently not available for booking." });
            });
        }

        const facilityName = facilityResult[0].facility_name;
        const bookingFlowType = facilityResult[0].booking_flow_type || "normal_approval";
        const maxCapacity = facilityResult[0].max_people || 1;
        
        let bookingStatus = bookingFlowType === "normal_approval" ? "approved" : "pending";
        let keyStatus = (bookingFlowType === "normal_approval" || bookingFlowType === "staff_key_approval") ? "pending_collection" : "not_required";
        if (bookingFlowType === "payment_required") bookingStatus = "pending_payment";
        if (bookingFlowType === "direct_reservation") bookingStatus = "reserved";

        // Calculate missing variables
        const duration_hours = (new Date(`${booking_date}T${end_time}`) - new Date(`${booking_date}T${start_time}`)) / (1000 * 60 * 60);
        const paymentRequired = bookingFlowType === "payment_required" ? 1 : 0;
        const paymentStatus = paymentRequired ? "pending" : "not_required";
        const paymentAmount = 0; // Or calculate based on your logic

        // Notification Variables
        let nTitle = "Booking Submitted";
        let nMsg = `Your booking request for ${facilityName} has been submitted successfully.`;
        if (bookingFlowType === "payment_required") {
            nTitle = "Payment Required";
            nMsg = "Please proceed to AFM to make payment so that your booking request only can be approved.";
        } else if (bookingFlowType === "staff_key_approval") {
            nMsg = `Your booking request for ${facilityName} has been submitted successfully. Please wait admin to approve.`;
        } else if (bookingFlowType === "normal_approval") {
            nTitle = "Booking Approved";
            nMsg = "Your booking have been approved please proceed to AFM to collect your key.";
        }

        const checkSql = `SELECT booking_id, user_id FROM bookings WHERE facility_id = ? AND booking_date = ? AND booking_status NOT IN ('cancelled', 'expired', 'completed') AND (? < end_time AND ? > start_time)`;

        connection.query(checkSql, [facility_id, booking_date, start_time, end_time], (checkErr, checkResult) => {
          if (checkErr) return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Error" }); });

          if (checkResult.find(b => b.user_id === userIdInt)) {
            return connection.rollback(() => { connection.release(); res.json({ success: false, message: "You already have an active booking for this facility at this time." }); });
          }

          if (checkResult.length >= maxCapacity) {
            return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Capacity reached." }); });
          }

          const insertSql = `
            INSERT INTO bookings 
            (user_id, facility_id, program, booking_date, start_time, end_time, duration_hours, purpose, equipment_required, booking_status, key_status, payment_required, payment_status, payment_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          connection.query(
            insertSql, 
            [user_id, facility_id, program, booking_date, start_time, end_time, duration_hours, purpose || "", equipmentRequired || "", bookingStatus, keyStatus, paymentRequired, paymentStatus, paymentAmount], 
            (insertErr, insertResult) => {
            if (insertErr) {
              return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Booking failed", error: insertErr.message }); });
            }

            connection.commit((commitErr) => {
              if (commitErr) return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Commit failed" }); });
              connection.release();
              
              // 1. Insert User Notification
              db.query(
                "INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read) VALUES (?, ?, ?, ?, 'booking', 0)", 
                [user_id, insertResult.insertId, nTitle, nMsg],
                (userNotifErr) => {
                  // 2. Determine if Admins need to be notified
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

router.get("/activities/:user_id", (req, res) => {
  const userId = req.params.user_id;

  updateCubicleBookingStatuses(() => {
    const sql = `
      SELECT 
        b.booking_id,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        b.start_time,
        b.end_time,
        b.booking_status,
        b.key_status,
        b.payment_required,
        b.payment_status,
        b.payment_amount,
        f.facility_name,
        f.booking_flow_type,
        f.description,
        f.location,
        f.image_path
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
    `;

    db.query(sql, [userId], (err, result) => {
      if (err) {
        console.log("Activities load error:", err);

        return res.json({
          success: false,
          message: "Failed to load activities",
          activities: []
        });
      }

      return res.json({
        success: true,
        activities: result
      });
    });
  });
});

router.get("/notifications/:user_id", (req, res) => {
  const sql = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
  db.query(sql, [req.params.user_id], (err, result) => {
    if (err) return res.json({ success: false, notifications: [] });
    return res.json({ success: true, notifications: result });
  });
});


router.put("/notifications/:user_id/read-all", (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err) => {
    if (err) {
      console.log("Read-all error:", err);

      return res.json({
        success: false,
        message: "Failed to mark notifications as read"
      });
    }

    return res.json({
      success: true
    });
  });
});

router.put("/notifications/:user_id/unread-all", (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    UPDATE notifications
    SET is_read = 0
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err) => {
    if (err) {
      console.log("Unread-all error:", err);

      return res.json({
        success: false,
        message: "Failed to mark notifications as unread"
      });
    }

    return res.json({
      success: true
    });
  });
});

router.put("/settings/change-password", (req, res) => {
  const { user_id, currentPassword, newPassword } = req.body;

  if (!user_id || !currentPassword || !newPassword) {
    return res.json({
      success: false,
      message: "Please fill in all password fields"
    });
  }

  const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character."
    });
  }

  const checkSql = `
    SELECT password
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;

  db.query(checkSql, [user_id], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Database error"
      });
    }

    if (result.length === 0) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const storedPassword = result[0].password;
    const isHashed = storedPassword.startsWith("$2");

    const proceedUpdate = (isMatch) => {
      if (!isMatch) {
        return res.json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          return res.json({
            success: false,
            message: "Error securing password"
          });
        }

        const updateSql = `
          UPDATE users
          SET password = ?, must_change_password = FALSE
          WHERE user_id = ?
        `;

        db.query(updateSql, [hashedPassword, user_id], (updateErr) => {
          if (updateErr) {
            return res.json({
              success: false,
              message: "Failed to change password"
            });
          }
        });
      });
    };

    if (isHashed) {
      bcrypt.compare(currentPassword, storedPassword, (err, match) => {
        if (err) {
          return res.json({
            success: false,
            message: "Server error"
          });
        }
        proceedUpdate(match);
      });
    } else {
      proceedUpdate(currentPassword === storedPassword);
    }

      return res.json({
        success: true,
        message: "Password changed successfully"
      });
    });
  });

router.get("/profile/:user_id", (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    SELECT 
      user_id,
      name,
      email,
      role
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Failed to load profile"
      });
    }

    if (result.length === 0) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      user: result[0]
    });
  });
});

router.put("/bookings/:id/check-in", (req, res) => {
  const bookingId = req.params.id;
  const { user_id } = req.body;

  const sql = `
    SELECT 
      booking_id, user_id,
      DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(end_time, '%H:%i:%s') AS end_time,
      booking_status, created_at
    FROM bookings
    WHERE booking_id = ? AND user_id = ? LIMIT 1
  `;

  db.query(sql, [bookingId, user_id], (err, result) => {
    // ... keep error checks ...
    const booking = result[0];
    const bookingStatus = booking.booking_status ? booking.booking_status.trim().toLowerCase() : "";

    if (bookingStatus !== "reserved") {
      return res.json({ success: false, message: "This booking is not available for check-in" });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const createdAt = new Date(booking.created_at);
    const now = new Date();

    // --- NEW LOGIC: Walk-in Grace Period ---
    // If they booked AFTER the start time, base the 15 mins on the time they booked
    const baseTime = createdAt > startDateTime ? createdAt : startDateTime;

    const checkInStart = new Date(baseTime);
    checkInStart.setMinutes(checkInStart.getMinutes() - 15);

    const checkInEnd = new Date(baseTime);
    checkInEnd.setMinutes(checkInEnd.getMinutes() + 15);

    if (now < checkInStart) {
      return res.json({ success: false, message: "Check-in is not open yet" });
    }
    if (now > checkInEnd) {
      return res.json({ success: false, message: "Check-in time has expired" });
    }

    const updateSql = `
      UPDATE bookings
      SET booking_status = 'checked_in'
      WHERE booking_id = ?
    `;

    db.query(updateSql, [bookingId], (updateErr) => {
      if (updateErr) {
        return res.json({
          success: false,
          message: "Failed to check in"
        });
      }

      return res.json({
        success: true,
        message: "Check-in successful"
      });
    });
  });
});

router.get("/bookings/:id", (req, res) => {
  const bookingId = req.params.id;

  updateCubicleBookingStatuses(() => {
    const sql = `
      SELECT 
        b.booking_id,
        b.user_id,
        b.facility_id,
        b.program,
        b.created_at,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,
        b.duration_hours,
        b.purpose,
        b.booking_status,
        b.key_status,
        b.payment_required,
        b.payment_status,
        b.payment_amount,
        f.facility_name,
        f.facility_type,
        f.booking_flow_type,
        f.description,
        f.location,
        f.image_path
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      WHERE b.booking_id = ?
      LIMIT 1
    `;

    db.query(sql, [bookingId], (err, result) => {
      if (err) {
        console.log("Booking details error:", err);

        return res.json({
          success: false,
          message: "Failed to load booking details"
        });
      }

      if (result.length === 0) {
        return res.json({
          success: false,
          message: "Booking not found"
        });
      }

      return res.json({
        success: true,
        booking: result[0]
      });
    });
  });
});

router.put("/bookings/:id/cancel", (req, res) => {
  const bookingId = req.params.id;
  const { user_id } = req.body;

  const sql = `
    SELECT 
      booking_id,
      user_id,
      DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
      booking_status
    FROM bookings
    WHERE booking_id = ?
    AND user_id = ?
    LIMIT 1
  `;

  db.query(sql, [bookingId, user_id], (err, result) => {
    if (err || result.length === 0) {
      return res.json({
        success: false,
        message: "Booking not found"
      });
    }

    const booking = result[0];

    const status = booking.booking_status
      ? booking.booking_status.trim().toLowerCase()
      : "";

    if (
      status === "cancelled" ||
      status === "completed" ||
      status === "expired" ||
      status === "checked_in" ||
      status === "key_collected"
    ) {
      return res.json({
        success: false,
        message: "This booking cannot be cancelled"
      });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const cancelDeadline = new Date(startDateTime);
    cancelDeadline.setMinutes(cancelDeadline.getMinutes() - 60);

    const now = new Date();

    if (now > cancelDeadline) {
      return res.json({
        success: false,
        message: "You can only cancel at least 1 hour before the booking starts"
      });
    }

    const updateSql = `
      UPDATE bookings
      SET booking_status = 'cancelled'
      WHERE booking_id = ?
    `;

    db.query(updateSql, [bookingId], (updateErr) => {
      if (updateErr) {
        return res.json({ success: false, message: "Failed to cancel booking" });
      }

      // ADDED: Notify Admins that the user cancelled
      const adminNotifSql = `
        INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
        SELECT user_id, ?, 'Booking Cancelled', 'User has cancelled a previously approved booking.', 'system', 0
        FROM users WHERE role = 'admin' AND status = 'active'
      `;
      db.query(adminNotifSql, [bookingId], (adminErr) => {
        if (adminErr) console.error("Failed to send admin cancellation notif:", adminErr);
      });

      return res.json({
        success: true,
        message: "Booking cancelled successfully"
      });
    });
  });
});

router.get("/admin/bookings", (req, res) => {
  const sql = `
    SELECT 
      b.booking_id,
      DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,
      b.purpose,
      b.booking_status,
      b.payment_status,
      b.key_status,
      u.name AS user_name,
      u.role AS user_role,
      f.facility_name
    FROM bookings b
    JOIN users u ON b.user_id = u.user_id
    JOIN facilities f ON b.facility_id = f.facility_id
    ORDER BY b.booking_date DESC, b.start_time DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Admin bookings load error:", err);

      return res.json({
        success: false,
        bookings: []
      });
    }

    return res.json({
      success: true,
      bookings: result
    });
  });
});

router.put("/admin/bookings/:id/approve", (req, res) => {
  const bookingId = req.params.id;

  const updateSql = `
    UPDATE bookings
    SET booking_status = 'approved'
    WHERE booking_id = ?
    AND booking_status IN ('pending', 'pending_payment', 'payment_submitted')
  `;

  db.query(updateSql, [bookingId], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Failed to approve booking"
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "This booking cannot be approved"
      });
    }

    const notificationSql = `
      INSERT INTO notifications
      (
        user_id,
        booking_id,
        title,
        message,
        notification_type,
        is_read
      )
      SELECT
        b.user_id,
        b.booking_id,
        'Booking Approved',
        CASE
          WHEN f.booking_flow_type = 'staff_key_approval'
            THEN CONCAT('Your booking request of ', f.facility_name, ' has been approved. Please go to AFM to collect the key.')
          ELSE
            CONCAT('Your booking request of ', f.facility_name, ' has been approved.')
        END,
        'booking_approved',
        0
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.facility_id
      WHERE b.booking_id = ?
    `;

    db.query(notificationSql, [bookingId], (notificationErr) => {
      if (notificationErr) {
        console.log("Approval notification error:", notificationErr);
      }

      return res.json({
        success: true,
        message: "Booking approved successfully"
      });
    });
  });
});

router.put("/admin/bookings/:id/cancel", (req, res) => {
  const bookingId = req.params.id;

  const sql = `
    UPDATE bookings
    SET booking_status = 'cancelled'
    WHERE booking_id = ?
    AND booking_status NOT IN (
      'cancelled',
      'completed',
      'expired',
      'checked_in',
      'key_collected'
    )
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Failed to cancel booking" });
    }

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: "This booking cannot be cancelled" });
    }

    // ADDED: Notify User that the admin did not approve/cancelled it
    const userNotifSql = `
      INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
      SELECT user_id, booking_id, 'Booking Cancelled', 'Admin did not approve your booking.', 'booking_cancelled', 0
      FROM bookings WHERE booking_id = ?
    `;
    db.query(userNotifSql, [bookingId], (userErr) => {
        if (userErr) console.error("Failed to send user cancellation notif:", userErr);
    });

    return res.json({
      success: true,
      message: "Booking cancelled successfully"
    });
  });
});

router.get("/admin/key-management", (req, res) => {
  const sql = `
  SELECT
    b.booking_id,
    b.user_id,
    DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
    TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
    TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,
    DATE_FORMAT(b.key_returned_at, '%Y-%m-%d %H:%i:%s') AS key_returned_at,
    b.booking_status,
    b.key_status,
      u.name AS holder_name,
      u.role AS holder_role,
      f.facility_name,
      f.image_path,
      f.booking_flow_type,
      f.key_required
    FROM bookings b
    JOIN users u ON b.user_id = u.user_id
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND f.key_required = 1
    -- AND u.role = 'staff'  <-- Comment this out so students can collect keys too!
    AND (
      (b.booking_status = 'approved' AND b.key_status = 'pending_collection')
      OR
      (b.booking_status = 'key_collected' AND b.key_status = 'collected')
      OR
      (b.booking_status = 'completed' AND b.key_status = 'returned')
    )
    ORDER BY b.booking_date ASC, b.start_time ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Key management load error:", err);

      return res.json({
        success: false,
        keys: []
      });
    }

    return res.json({
      success: true,
      keys: result
    });
  });
});

router.put("/admin/bookings/:id/collect-key", (req, res) => {
  const bookingId = req.params.id;

  const sql = `
    UPDATE bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    SET b.booking_status = 'key_collected',
        b.key_status = 'collected'
    WHERE b.booking_id = ?
    AND b.booking_status = 'approved'
    AND b.key_status = 'pending_collection'
    AND f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Failed to mark key as collected"
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "This booking is not ready for key collection"
      });
    }

    return res.json({
      success: true,
      message: "Key collected successfully"
    });
  });
});

router.put("/bookings/:id/return-key", (req, res) => {
  const bookingId = req.params.id;
  const { user_id } = req.body;

  const sql = `
    UPDATE bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    SET b.booking_status = 'completed',
        b.key_status = 'returned',
        b.key_returned_at = NOW()
    WHERE b.booking_id = ?
    AND b.user_id = ?
    AND b.booking_status = 'key_collected'
    AND b.key_status = 'collected'
    AND f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
  `;

  db.query(sql, [bookingId, user_id], (err, result) => {
    if (err) {
      console.log("Return key error:", err);

      return res.json({
        success: false,
        message: "Failed to return key"
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "This key cannot be returned yet"
      });
    }

    return res.json({
      success: true,
      message: "Key returned successfully"
    });
  });
});

function createKeyReturnReminders(callback) {
  // Try running this query directly in phpMyAdmin to see if it works
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

// GET CURRENT BOOKING ID FOR QR REDIRECT
// SINGLE, CLEAN ROUTE: Handle QR Code current booking lookup for Cubicles AND Key Returns
router.get("/bookings/current-booking/:facility_id/:user_id", (req, res) => {
  const facilityId = req.params.facility_id;
  const userId = req.params.user_id;

  // 1. GET EXACT LOCAL TIME FROM NODE.JS
  const now = new Date();
  
  // Format Date to YYYY-MM-DD
  const localDate = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0');
                    
  // Format Time to HH:MM:SS
  const localTime = String(now.getHours()).padStart(2, '0') + ':' + 
                    String(now.getMinutes()).padStart(2, '0') + ':' + 
                    String(now.getSeconds()).padStart(2, '0');

  // 2. Modified SQL: Finds a reserved cubicle today OR any unreturned key for this facility
  const sql = `
    SELECT b.booking_id 
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE b.user_id = ? 
    AND b.facility_id = ? 
    AND (
      (b.booking_status = 'reserved' AND b.booking_date = ? AND ? BETWEEN b.start_time AND b.end_time)
    OR 
      (b.booking_status = 'key_collected' AND b.key_status = 'collected' AND f.booking_flow_type IN ('staff_key_approval', 'normal_approval'))
    )
    LIMIT 1
  `;

  db.query(sql, [userId, facilityId, localDate, localTime], (err, result) => {
    if (err) {
      console.error("Database error in current-booking:", err);
      return res.json({ success: false, message: "Database error" });
    }
    
    if (result.length === 0) {
      return res.json({ 
        success: false, 
        message: "No active reservation or key return found for this facility at this time." 
      });
    }

    return res.json({ success: true, booking_id: result[0].booking_id });
  });
});

function createOverdueKeyNotifications(callback) {
  // 1. Alert the User
  const userSql = `
    INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
    SELECT 
      b.user_id, 
      b.booking_id, 
      'OVERDUE: Key Return', 
      CONCAT('URGENT: Your booking for ', f.facility_name, ' ended over 30 minutes ago. Please return the key immediately to avoid penalties.'), 
      'key_overdue_warning', 
      0
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND b.booking_status = 'key_collected'
    AND b.key_status = 'collected'
    AND NOW() >= DATE_ADD(TIMESTAMP(b.booking_date, b.end_time), INTERVAL 30 MINUTE)
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.booking_id = b.booking_id 
      AND n.notification_type = 'key_overdue_warning'
      AND n.user_id = b.user_id
    )
  `;

  // 2. Alert the Admins
  const adminSql = `
    INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read)
    SELECT 
      u.user_id, 
      b.booking_id, 
      'OVERDUE: Key Return Alert', 
      CONCAT('URGENT: A key for ', f.facility_name, ' is overdue by over 30 minutes.'), 
      'admin_key_overdue', 
      0
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    CROSS JOIN users u
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND b.booking_status = 'key_collected'
    AND b.key_status = 'collected'
    AND NOW() >= DATE_ADD(TIMESTAMP(b.booking_date, b.end_time), INTERVAL 30 MINUTE)
    AND u.role = 'admin' AND u.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.booking_id = b.booking_id 
      AND n.notification_type = 'admin_key_overdue'
      AND n.user_id = u.user_id
    )
  `;

  db.query(userSql, (err) => {
    if (err) console.error("Error creating user overdue reminders:", err);
    
    db.query(adminSql, (adminErr) => {
      if (adminErr) console.error("Error creating admin overdue reminders:", adminErr);
      if(callback) callback();
    });
  });
}

module.exports = router;
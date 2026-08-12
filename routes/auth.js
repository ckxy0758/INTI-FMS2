const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { BrevoClient } = require("@getbrevo/brevo");

const {
    verifyToken,
    requireRole,
    JWT_SECRET
} = require("../middleware/authMiddleware");

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY
});


// ============================================================================
// 1. EMAIL NOTIFICATION SETUP
// ============================================================================

/**
 * Reusable helper to send emails asynchronously in the background.
 * @param {string} userEmail - Recipient email address.
 * @param {string} title - Email subject line.
 * @param {string} message - Plain-text email body.
 */
async function sendEmailNotification(userEmail, title, message) {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: "INTI Facility Management System",
                email: "iicp.facilities@gmail.com"
            },
            to: [
                {
                    email: userEmail
                }
            ],
            subject: title,
            textContent: message
        });

        console.log("Email sent successfully:", result);

        return {
            success: true,
            data: result
        };

    } catch (error) {
        console.error("Brevo email error:", error);

        return {
            success: false,
            error: error
        };
    }
}

// --- GLOBAL NOTIFICATION HELPERS ---
// These three helpers centralize the "insert a notification row + send an email"
// pattern that was previously duplicated with raw SQL across multiple routes.

/**
 * 1. Notify all active admins.
 * Looks up every user with role = 'admin' and status = 'active', then creates
 * an in-app notification row and sends an email to each one.
 * @param {number} bookingId - Related booking ID (stored on the notification row).
 * @param {string} title - Notification/email title.
 * @param {string} message - Notification/email body.
 * @param {string} type - notification_type value stored in the notifications table.
 */
function notifyAllAdmins(bookingId, title, message, type) {
  db.query("SELECT user_id, email FROM users WHERE role = 'admin' AND status = 'active'", (err, admins) => {
    // Silently bail out if the query failed or there are no active admins
    if (err || admins.length === 0) return;
    admins.forEach(admin => {
      // Insert an unread (is_read = 0) notification record for this admin
      db.query("INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read) VALUES (?, ?, ?, ?, ?, 0)", 
        [admin.user_id, bookingId, title, message, type]);
      // Also send an email copy of the notification
      sendEmailNotification(admin.email, title, message);
    });
  });
}

/**
 * 2. Notify a specific user by their User ID.
 * Looks up the user's email, inserts a notification row, and emails them.
 * @param {number} userId - Target user_id.
 * @param {number} bookingId - Related booking ID.
 * @param {string} title - Notification/email title.
 * @param {string} message - Notification/email body.
 * @param {string} type - notification_type value stored in the notifications table.
 */
function notifySpecificUser(userId, bookingId, title, message, type) {
  db.query("SELECT email FROM users WHERE user_id = ?", [userId], (err, rows) => {
    if (!err && rows.length > 0) {
      db.query("INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read) VALUES (?, ?, ?, ?, ?, 0)", 
        [userId, bookingId, title, message, type]);
      sendEmailNotification(rows[0].email, title, message);
    }
  });
}

/**
 * 3. Notify a specific user using a Booking ID (useful for admin actions where
 * only the booking ID is known, not the owning user's ID directly).
 * Joins bookings -> users to resolve the booking's owner and their email.
 * @param {number} bookingId - The booking whose owner should be notified.
 * @param {string} title - Notification/email title.
 * @param {string} message - Notification/email body.
 * @param {string} type - notification_type value stored in the notifications table.
 */
function notifyUserByBooking(bookingId, title, message, type) {
  db.query("SELECT b.user_id, u.email FROM bookings b JOIN users u ON b.user_id = u.user_id WHERE b.booking_id = ?", [bookingId], (err, rows) => {
    if (!err && rows.length > 0) {
      db.query("INSERT INTO notifications (user_id, booking_id, title, message, notification_type, is_read) VALUES (?, ?, ?, ?, ?, 0)", 
        [rows[0].user_id, bookingId, title, message, type]);
      sendEmailNotification(rows[0].email, title, message);
    }
  });
}

// ============================================================================
// 2. AUTHENTICATION & SECURITY ROUTES
// ============================================================================

/**
 * POST /login
 * Handles user login and issues a stateless JWT session token.
 * Supports both modern bcrypt-hashed passwords and legacy plain-text passwords
 * (for backward compatibility with accounts created before hashing was added).
 * Request body: { email, password }
 */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Only active accounts are allowed to log in
  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length === 1) {
      const user = result[0];

      // Check account status
      if (user.status === "pending") {
          return res.json({
              success: false,
              message: "Your account is pending admin approval."
          });
      }

      if (user.status === "rejected") {
          return res.json({
              success: false,
              message: "Your registration has been rejected. Please contact the administrator."
          });
      }

      if (user.status !== "active") {
          return res.json({
              success: false,
              message: "Your account is currently inactive or suspended."
          });
      }

      const isHashed = user.password.startsWith("$2"); // Check if password is encrypted (bcrypt hashes start with "$2")


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
        // Fallback for legacy plain-text passwords: direct string comparison
        if (password === user.password) return handleSuccess();
        return res.json({ success: false, message: "Invalid email or password" });
      }
    } else {
      // No matching active user found for this email
      return res.json({ success: false, message: "Invalid email or password" });
    }
  });
});

/**
 * POST /register
 * Allows students/staff to register themselves.
 * Default password = user_code.
 * Account requires admin approval before login.
 */
router.post("/register", (req, res) => {
  const { name, user_id, email, role } = req.body;

  // Check required fields
  if (!name || !user_id || !email || !role) {
    return res.json({
      success: false,
      message: "Please fill in all fields"
    });
  }

  // Only student and staff can self-register
  if (role !== "student" && role !== "staff") {
    return res.json({
      success: false,
      message: "Invalid role"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUserId = user_id.trim();

  // If email contains "student", role must be student
  if (normalizedEmail.includes("student") && role !== "student") {
    return res.json({
      success: false,
      message: "Email containing 'student' can only register as Student."
    });
  }

  // Only allow INTI email addresses
  if (
    !normalizedEmail.endsWith("@student.newinti.edu.my") &&
    !normalizedEmail.endsWith("@newinti.edu.my")
  ) {
    return res.json({
      success: false,
      message: "Please use a valid INTI email address."
    });
  }

  // Check if email or user ID already exists
  const checkSql = `
    SELECT user_id
    FROM users
    WHERE email = ? OR user_code = ?
  `;

  db.query(
    checkSql,
    [normalizedEmail, normalizedUserId],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.json({
          success: false,
          message: "Database error"
        });
      }

      if (result.length > 0) {
        return res.json({
          success: false,
          message: "Email or ID is already registered."
        });
      }

      // Default password is the user's ID
      const defaultPassword = normalizedUserId;

      // Hash the default password
      bcrypt.hash(defaultPassword, 10, (hashErr, hashedPassword) => {

        if (hashErr) {
          console.error(hashErr);
          return res.json({
            success: false,
            message: "Error securing password"
          });
        }

        const sql = `
          INSERT INTO users
          (name, user_code, email, password, role, status, must_change_password)
          VALUES (?, ?, ?, ?, ?, 'pending', TRUE)
        `;

        db.query(
          sql,
          [
            name.trim(),
            normalizedUserId,
            normalizedEmail,
            hashedPassword,
            role
          ],
          (err) => {

            if (err) {
              console.error(err);
              return res.json({
                success: false,
                message: "Registration failed"
              });
            }

            return res.json({
              success: true,
              message: "Registration successful. Please wait for admin approval."
            });
          }
        );
      });
    }
  );
});

/**
 * POST /users (admin only)
 * Creates a new user account with a temporary password equal to their user_code.
 * The temporary password is bcrypt-hashed before being stored, and
 * must_change_password is set to TRUE to force a password change on first login.
 * Request body: { name, user_code, email, role }
 */
router.post("/users", verifyToken, requireRole(['admin']), (req, res) => {
  const { name, user_code, email, role } = req.body;

  // Basic required-field validation
  if (!name || !user_code || !email || !role) {
    return res.json({ success: false, message: "Please fill in all fields" });
  }

  // Restrict role to one of the three known values
  if (role !== "student" && role !== "staff" && role !== "admin") {
    return res.json({ success: false, message: "Invalid role" });
  }

  // The user's temporary password is simply their user_code
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
        // Most likely cause: duplicate email/user_code violating a unique constraint
        return res.json({ success: false, message: "User already exists or database error" });
      }

      // Return the plaintext temporary password once, so the admin can relay it to the user
      return res.json({
        success: true,
        message: `Account created successfully. Temporary password: ${defaultPassword}. Please tell the user to change password after first login.`,
        temporaryPassword: defaultPassword
      });
    });
  });
});

/**
 * GET /users (admin only)
 * Retrieves all user accounts (excluding password field), newest first.
 */
router.get("/users", verifyToken, requireRole(['admin']), (req, res) => {
  const sql = "SELECT user_id, name, user_code, email, role, status FROM users ORDER BY user_id DESC";

  db.query(sql, (err, result) => {
    if (err) {
      return res.json({ success: false, users: [] });
    }

    return res.json({ success: true, users: result });
  });
});

/**
 * POST /change-password
 * Allows an authenticated user to set a new password, enforcing a strong
 * password policy. NOTE: this endpoint stores the new password as-is
 * (no bcrypt hashing call here — unlike /settings/change-password below,
 * which does hash it) and clears must_change_password.
 * Request body: { user_id, newPassword }
 */
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

/**
 * POST /forgot-password
 * Starts the password-reset flow: generates a secure random token, stores it
 * with a 1-hour expiry, and emails the user a reset link.
 * Deliberately always responds with a generic success message (even if the
 * email doesn't exist) to prevent attackers from enumerating valid accounts.
 * Request body: { email }
 */
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({
            success: false,
            message: "Email is required"
        });
    }

    const checkUserSql =
        "SELECT * FROM users WHERE email = ? AND status = 'active'";

    db.query(checkUserSql, [email], async (err, result) => {

        if (err) {
            console.error("Database error:", err);

            return res.json({
                success: false,
                message: "Database error"
            });
        }

        // Anti-enumeration protection
        if (result.length === 0) {
            return res.json({
                success: true,
                message: "If the email exists, a reset link was sent."
            });
        }

        const token = crypto
            .randomBytes(32)
            .toString("hex");

        const expiresAt =
            new Date(Date.now() + 3600000);

        const insertTokenSql = `
            INSERT INTO password_resets
            (email, token, expires_at)
            VALUES (?, ?, ?)
        `;

        db.query(
            insertTokenSql,
            [email, token, expiresAt],
            async (insertErr) => {

                if (insertErr) {
                    console.error(
                        "Token insert error:",
                        insertErr
                    );

                    return res.json({
                        success: false,
                        message: "Failed to process request"
                    });
                }

                const resetLink =
                    `${process.env.APP_URL}/reset-password.html?token=${token}`;

                const message = `
Hello,

You requested to reset your password for the INTI Facility Management System.

Click the link below to reset your password:

${resetLink}

This link will expire after 1 hour.

If you did not request this password reset, please ignore this email.
`;

                const emailResult =
                    await sendEmailNotification(
                        email,
                        "Reset Password - INTI Facility Management System",
                        message
                    );

                if (!emailResult.success) {
                    console.error(
                        "Failed to send password reset email:",
                        emailResult.error
                    );

                    return res.json({
                        success: false,
                        message: "Failed to send reset email"
                    });
                }

                return res.json({
                    success: true,
                    message: "Password reset link sent to your email"
                });
            }
        );
    });
});

/**
 * POST /reset-password
 * Finalizes a password reset: validates the reset token (must exist and not
 * be expired), hashes and saves the new password, then deletes the token so
 * it can't be reused.
 * Request body: { token, newPassword }
 */
router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.json({ success: false, message: "Token and new password are required" });
  }

  // Same strong-password policy as the other password-setting endpoints
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.json({ success: false, message: "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character." });
  }

  // Only accept tokens that exist AND have not yet expired
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

/**
 * POST /users/approve
 * Admin approves multiple pending registrations.
 *
 * Request body:
 * {
 *   userIds: [1, 2, 3]
 * }
 */
router.post(
  "/users/approve",
  verifyToken,
  requireRole(["admin"]),
  (req, res) => {

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.json({
        success: false,
        message: "No users selected."
      });
    }

    const sql = `
      UPDATE users
      SET status = 'active'
      WHERE user_id IN (?) 
      AND status = 'pending'
    `;

    db.query(sql, [userIds], (err, result) => {

      if (err) {
        console.error("Approve users error:", err);

        return res.json({
          success: false,
          message: "Database error while approving users."
        });
      }

      return res.json({
        success: true,
        message: `${result.affectedRows} user(s) approved successfully.`
      });
    });
  }
);

/**
 * POST /users/reject
 * Admin rejects multiple pending registrations.
 *
 * Request body:
 * {
 *   userIds: [1, 2, 3]
 * }
 */
router.post(
  "/users/reject",
  verifyToken,
  requireRole(["admin"]),
  (req, res) => {

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.json({
        success: false,
        message: "No users selected."
      });
    }

    const sql = `
      UPDATE users
      SET status = 'rejected'
      WHERE user_id IN (?)
      AND status = 'pending'
    `;

    db.query(sql, [userIds], (err, result) => {

      if (err) {
        console.error("Reject users error:", err);

        return res.json({
          success: false,
          message: "Database error while rejecting users."
        });
      }

      return res.json({
        success: true,
        message: `${result.affectedRows} user(s) rejected successfully.`
      });
    });
  }
);

/**
 * PUT /users/:id/deactivate (admin only)
 * Soft-disables a user account by flipping status to 'inactive'
 * (does not delete the row, so booking history etc. is preserved).
 */
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

/**
 * PUT /users/:id/reactivate (admin only)
 * Re-enables a previously deactivated user account by flipping status back to 'active'.
 */
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

/**
 * GET /facilities
 * Lists facilities, optionally filtered by the requesting role's visibility.
 * Query param: role ("student" | "staff" | anything else = no filter, e.g. admin)
 * - student sees facilities with visible_to IN ('student', 'both')
 * - staff sees facilities with visible_to IN ('staff', 'both')
 * - any other/absent role sees all facilities (used by admin views)
 */
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

/**
 * POST /facilities (admin only)
 * Creates a new facility. If image_path is a base64 data URI, it is decoded
 * and written to disk under /public/uploads, and the stored image_path is
 * replaced with the relative file path instead of the raw base64 data.
 * Request body: facility fields (see destructured list below).
 */
router.post("/facilities", verifyToken, requireRole(['admin']), (req, res) => {
  const {
    facility_name, facility_type, location, max_people,
    operating_start, operating_end, description, rules,
    additional_info, equipment, image_path, availability_status,
    visible_to, key_required, booking_flow_type, time_slots
  } = req.body;

  // Required-field validation for the core facility attributes
  if (!facility_name || !facility_type || !location || !max_people || !operating_start || !operating_end) {
    return res.json({ success: false, message: "Please fill in all required facility details" });
  }

  let finalImagePath = null;
  // Convert base64 image payload into physical JPG file
  if (image_path && image_path.startsWith("data:image")) {
    const uploadsDir = path.join(__dirname, "../public/uploads");
    // Ensure the uploads directory exists (recursive: true creates parent dirs too)
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    // Strip the "data:image/xxx;base64," prefix to get raw base64 payload
    const base64Data = image_path.replace(/^data:image\/\w+;base64,/, "");
    // Use a timestamp to avoid filename collisions
    const fileName = `facility_new_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, base64Data, "base64");
    // Store only the relative path (served statically) rather than the raw image data
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

/**
 * PUT /facilities/:id (admin only)
 * Updates an existing facility's details. If a new base64 image is supplied,
 * it is decoded and saved to disk (overwriting the stored image_path);
 * otherwise the existing image_path value passed in the body is kept as-is.
 * Request body: facility fields (see destructured list below).
 */
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

  // Default to whatever image_path was passed in (could be an existing relative path, or null)
  let finalImagePath = image_path || null;
  // Parse and save new image if updated (i.e. a fresh base64 data URI was submitted)
  if (image_path && image_path.startsWith("data:image")) {
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const base64Data = image_path.replace(/^data:image\/\w+;base64,/, "");
    // Filename includes facility ID + timestamp for uniqueness/traceability
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

  // Only store a JSON string for time_slots if a non-empty array was provided; otherwise NULL
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

/**
 * DELETE /facilities/:id (admin only)
 * Deletes a facility, but only if no bookings reference it — this preserves
 * referential/historical integrity for facilities that have booking records.
 */
router.delete("/facilities/:id", verifyToken, requireRole(['admin']), (req, res) => {
  const facilityId = req.params.id;

  // Verify usage integrity: Prevents deletion if history relies on this ID
  const checkSql = `SELECT booking_id FROM bookings WHERE facility_id = ? LIMIT 1`;

  db.query(checkSql, [facilityId], (checkErr, checkResult) => {
    if (checkErr) {
      return res.json({ success: false, message: "Failed to check facility usage" });
    }

    // If at least one booking references this facility, refuse to delete it
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
/**
 * GET /facilities/:id/available-slots
 * Constructs the list of bookable time slots for a facility on a given date,
 * taking into account:
 *  - weekends being fully blocked (no bookings Sat/Sun)
 *  - custom pre-defined time_slots on the facility (if configured), otherwise
 *    auto-generated 1-hour blocks between operating_start and operating_end
 *  - existing active bookings (to compute remaining capacity per slot)
 *  - class timetable entries that block a slot entirely (academic classes)
 * Query param: date (YYYY-MM-DD)
 * Also runs updateCubicleBookingStatuses() first, to make sure statuses like
 * "expired"/"completed" are refreshed before slot availability is computed.
 */
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

    // Full weekday name (e.g. "Monday") used to match against class_timetable.day_of_week
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
      
      // time_slots is stored as a JSON string on the facility row; parse it if present
      let slotsSource = [];
      if (facility.time_slots) {
        try { slotsSource = JSON.parse(facility.time_slots); } catch (e) { slotsSource = []; }
      }

      const maxCapacity = facility.max_people || 1; 

      // Gather active bookings for conflict calculation.
      // Only statuses that represent a "live"/still-holding-a-slot booking are counted.
      const bookingSql = `
        SELECT start_time, end_time FROM bookings
        WHERE facility_id = ? AND booking_date = ?
        AND booking_status IN ('pending', 'pending_payment', 'payment_submitted', 'approved', 'reserved', 'checked_in', 'key_collected')
      `;

      db.query(bookingSql, [facilityId, selectedDate], (bookingErr, bookingResult) => {
        if (bookingErr) return res.json({ success: false, message: "Failed to check bookings", slots: [] });

        // Fetch any recurring class timetable entries that fall on this weekday for this facility
        const timetableSql = `SELECT start_time, end_time FROM class_timetable WHERE facility_id = ? AND day_of_week = ?`;

        db.query(timetableSql, [facilityId, selectedDay], (timetableErr, timetableResult) => {
          if (timetableErr) return res.json({ success: false, message: "Failed to check class timetable", slots: [] });

          const slots = [];
          // Extract just the hour portion (e.g. "09:00:00" -> 9) from operating hours
          const operatingStart = Number(facility.operating_start.substring(0, 2));
          const operatingEnd = Number(facility.operating_end.substring(0, 2));

          /**
           * Calculate how many existing bookings overlap the target [start, end) slot.
           * Used to determine remaining capacity for that slot.
           */
          const getBookedCount = (start, end) => {
            return bookingResult.filter(b => isTimeOverlap(start, end, b.start_time, b.end_time)).length;
          };

          let slotList = [];
          if (slotsSource && slotsSource.length > 0) {
            // Apply customized, pre-defined slot blocks (facility-specific schedule),
            // normalizing "HH:MM" into "HH:MM:00" and sorting chronologically
            slotList = slotsSource
              .map(slot => ({
                start_time: slot.start + ":00",
                end_time: slot.end + ":00"
              }))
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
          } else {
            // Dynamically generate default 1-hour intervals across the operating hours range
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

            // A slot is unusable if it overlaps any scheduled academic class
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

/**
 * GET /test-slots
 * Simple health-check/smoke-test route confirming this router file is mounted correctly.
 */
router.get("/test-slots", (req, res) => {
  res.json({ success: true, message: "Available slots route file is loaded" });
});

/**
 * GET /facilities/:id
 * Fetches full details for a single facility by ID.
 */
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

/**
 * Helper: Format 24-hour SQL time ("HH:MM:SS"/"HH:MM") to user-friendly AM/PM string.
 * @param {string} time - Time string starting with "HH:MM".
 * @returns {string} Formatted 12-hour time, e.g. "2:30 PM".
 */
function formatSlotTime(time) {
  const [hour, minute] = time.split(":");
  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12; // 0/12/24-hour edge case: midnight/noon should display as "12"
  return `${h}:${minute} ${ampm}`;
}

/**
 * Helper: Determine if two time ranges [startA, endA) and [startB, endB) intersect.
 * Uses simple interval-overlap math: ranges overlap if one starts before the
 * other ends, in both directions.
 * @param {string} startA
 * @param {string} endA
 * @param {string} startB
 * @param {string} endB
 * @returns {boolean} True if the two ranges overlap at all.
 */
function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// ============================================================================
// 5. AUTOMATED BACKGROUND TIME EVALUATIONS
// ============================================================================

/**
 * Auto-releases direct_reservation bookings that missed their 15-minute QR
 * check-in window. A booking is only eligible for expiry if it's still in
 * 'reserved' status and more than 15 minutes have passed since whichever is
 * later: the booking's scheduled start time, or when the booking was created
 * (this covers same-day/immediate bookings made after the slot start).
 * @param {Function} callback - Node-style callback invoked with the query result/error.
 */
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

/**
 * Marks checked-in cubicle bookings as 'completed' once their scheduled end
 * time has naturally passed. Only applies to facilities whose name starts
 * with "cubicle" (case-insensitive, trimmed).
 * @param {Function} callback - Node-style callback invoked with the query result/error.
 */
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

/**
 * Orchestrator wrapper that runs both cubicle-lifecycle updates in sequence
 * (release expired reservations, then complete finished check-ins) before
 * invoking the caller's callback. Used as a pre-step interceptor on routes
 * that read booking/slot data, so statuses are always fresh at read time.
 * @param {Function} callback - Called once both background updates have run.
 */
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

/**
 * POST /bookings
 * Main endpoint for creating a new facility booking. Runs as a DB transaction
 * with row-level locking (FOR UPDATE) on the facility row to safely handle
 * concurrent booking attempts against the same facility/time slot.
 *
 * Booking status/key status/payment fields are derived from the facility's
 * booking_flow_type:
 *  - normal_approval: auto-approved, key pending collection
 *  - staff_key_approval: pending admin approval, key pending collection
 *  - payment_required: pending_payment, requires payment before approval
 *  - direct_reservation: immediately 'reserved' (e.g. cubicles), no key needed
 *
 * Validates that:
 *  - the facility exists and is currently 'available'
 *  - the requesting user doesn't already have an overlapping active booking
 *    for this facility/time
 *  - the facility hasn't reached max_people capacity for the requested slot
 *
 * On success, notifies the booking user, and if the flow type requires admin
 * action (payment_required or staff_key_approval), also notifies all admins.
 *
 * Request body: { user_id, facility_id, program, booking_date, start_time,
 *                  end_time, remark, equipmentRequired }
 */
router.post("/bookings", verifyToken, (req, res) => {
  const { user_id, facility_id, program, booking_date, start_time, end_time, remark, equipmentRequired } = req.body;
  const userIdInt = parseInt(user_id);

  // Compute booking duration in hours from the date-combined start/end timestamps
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

        // Facility must currently be marked as available (not under maintenance/disabled)
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

        // Direct Booking Flow handling (auto-approved, no key required)
        if (bookingFlowType === "direct_booking") {
          bookingStatus = "approved";
          keyStatus = "not_required";
        }

        const paymentRequired = bookingFlowType === "payment_required" ? 1 : 0;
        const paymentStatus = paymentRequired ? "pending_payment" : "not_required";
        const paymentAmount = 0; 

        // Notification variables 
        // Default messaging (used as a base, then overridden per flow type below)
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
        } else if (bookingFlowType === "direct_booking") {
          nTitle = "Booking Approved";
          nMsg = `Your booking request for ${facilityName} has been approved.`;
        }

        // Look for any other active (non-final) bookings on this facility/date that
        // time-overlap the requested slot — used both for the "already booked by you"
        // check and the capacity check below
        const checkSql = `SELECT booking_id, user_id FROM bookings WHERE facility_id = ? AND booking_date = ? AND booking_status NOT IN ('cancelled', 'expired', 'completed') AND (? < end_time AND ? > start_time)`;

        // Check for personal overlapping bookings or total capacity breach
        connection.query(checkSql, [facility_id, booking_date, start_time, end_time], (checkErr, checkResult) => {
          if (checkErr) return connection.rollback(() => { connection.release(); res.json({ success: false, message: "Error" }); });

          // Prevent the same user from double-booking the same facility/time slot
          if (checkResult.find(b => b.user_id === userIdInt)) {
            return connection.rollback(() => { connection.release(); res.json({ success: false, message: "You already have an active booking for this facility at this time." }); });
          }

          // Prevent exceeding the facility's configured max capacity for this slot
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
              
              // Send system notification and email to the user using the helper
              notifySpecificUser(user_id, insertResult.insertId, nTitle, nMsg, 'booking');

              // Dispatch targeted admin notifications if approval is required
              const requiresAdminAction = ["payment_required", "staff_key_approval"].includes(bookingFlowType);

              if (requiresAdminAction) {
                let adminTitle = "New Booking Request";
                let adminMsg = `A new booking request for ${facilityName} has been submitted and requires review.`;
                if (bookingFlowType === "payment_required") adminMsg = `A new booking request for ${facilityName} has been submitted, if user have make payment then approved.`;
                
                // Replaces the raw SQL query with the helper
                notifyAllAdmins(insertResult.insertId, adminTitle, adminMsg, 'system');
                return res.json({ success: true, title: nTitle, message: nMsg });
              } else {
                return res.json({ success: true, title: nTitle, message: nMsg });
                  }
            });
          });
        });
      });
    });
  });
});

/**
 * GET /activities/:user_id
 * Fetches the full personal booking history for a given user, joined with
 * facility details, ordered newest booking date/time first. Runs the cubicle
 * status-refresh interceptor first so statuses are current.
 */
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

/**
 * GET /notifications/:user_id
 * Retrieves all system notifications for a user, newest first.
 */
router.get("/notifications/:user_id", verifyToken, (req, res) => {
  const sql = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
  db.query(sql, [req.params.user_id], (err, result) => {
    if (err) return res.json({ success: false, notifications: [] });
    return res.json({ success: true, notifications: result });
  });
});

/**
 * PUT /notifications/:user_id/read-all
 * Marks all of a user's notifications as read (is_read = 1).
 */
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

/**
 * PUT /notifications/:user_id/unread-all
 * Marks all of a user's notifications as unread (is_read = 0).
 */
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

/**
 * PUT /settings/change-password
 * Standard "change my password" flow for a logged-in user: verifies the
 * supplied current password (supporting both bcrypt-hashed and legacy
 * plain-text stored passwords), enforces the strong-password policy on the
 * new password, then hashes and stores it.
 * Request body: { user_id, currentPassword, newPassword }
 */
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

    /**
     * Shared continuation once we know whether currentPassword matched.
     * @param {boolean} isMatch - Whether the supplied current password is correct.
     */
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
      // Legacy plain-text comparison fallback
      proceedUpdate(currentPassword === storedPassword);
    }
  });
});

/**
 * GET /profile/:user_id
 * Fetches basic profile info (name, email, role) for a user.
 */
router.get("/profile/:user_id", verifyToken, (req, res) => {
  const userId = req.params.user_id;

  const sql = `SELECT user_id, name, email, role FROM users WHERE user_id = ? LIMIT 1`;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.json({ success: false, message: "Failed to load profile" });
    if (result.length === 0) return res.json({ success: false, message: "User not found" });
    return res.json({ success: true, user: result[0] });
  });
});

/**
 * PUT /bookings/:id/check-in
 * Processes a QR-code check-in for a direct_reservation-style booking.
 * Only bookings currently in 'reserved' status are eligible. A grace-period
 * window is computed as [-15min, +15min] around whichever is later: the
 * booking's scheduled start time, or its created_at time (covers bookings
 * made after the slot's nominal start). Check-in must occur within that window.
 * Request body: { user_id }
 *
 * NOTE: this handler does not check `err` or an empty `result` before reading
 * `result[0]` — a missing/invalid booking_id would throw here rather than
 * returning a clean JSON error, since booking lookup failure isn't handled.
 */
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

    // Only 'reserved' bookings (direct_reservation flow) are eligible for check-in
    if (bookingStatus !== "reserved") {
      return res.json({ success: false, message: "This booking is not available for check-in" });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const createdAt = new Date(booking.created_at);
    const now = new Date();

    // Logic: Validates if current time falls within [-15m, +15m] window
    // Base time is whichever is later: the scheduled start, or when the booking was made
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

/**
 * GET /bookings/:id
 * Fetches full details of a single booking (joined with facility info),
 * used for the booking-details view. Refreshes cubicle statuses first.
 */
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

/**
 * PUT /bookings/:id/submit-payment
 * Lets the booking's owner attach a proof-of-payment file (image or PDF,
 * sent as a base64 data URI, matching the pattern already used for facility
 * images) for a facility whose booking_flow_type is "payment_required".
 *
 * Only bookings currently in payment_status = 'pending_payment' (owned by
 * the requesting user) are eligible. The file is decoded and written to
 * disk under /public/uploads, and the relative path is stored in the new
 * bookings.proof_of_payment column. payment_status moves to
 * 'payment_submitted', and all admins are notified so one of them can
 * verify the payment and approve the booking.
 *
 * Request body: { user_id, proof_of_payment }
 * proof_of_payment must be a base64 data URI, e.g.
 * "data:image/png;base64,...." or "data:application/pdf;base64,....".
 */
router.put("/bookings/:id/submit-payment", verifyToken, (req, res) => {
  const bookingId = req.params.id;
  const { user_id, proof_of_payment } = req.body;

  if (!user_id || !proof_of_payment) {
    return res.json({ success: false, message: "Missing proof of payment" });
  }

  // Match the "data:<mime>;base64,<data>" shape and figure out a sensible
  // file extension from the mime type. Falls back to treating it as a
  // generic binary blob (.bin) if the mime type isn't one of the common
  // receipt formats, so an unexpected file type still gets saved.
  const dataUriMatch = proof_of_payment.match(/^data:([\w/+.-]+);base64,(.+)$/);

  if (!dataUriMatch) {
    return res.json({ success: false, message: "Invalid file format" });
  }

  const mimeType = dataUriMatch[1];
  const base64Data = dataUriMatch[2];

  const extensionByMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf"
  };
  const extension = extensionByMime[mimeType] || "bin";

  const uploadsDir = path.join(__dirname, "../public/uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `payment_${bookingId}_${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFile(filePath, base64Data, "base64", (writeErr) => {
    if (writeErr) {
      console.log("Proof of payment save error:", writeErr);
      return res.json({ success: false, message: "Failed to save proof of payment" });
    }

    const relativePath = `uploads/${fileName}`;

    const updateSql = `
      UPDATE bookings
      SET payment_status = 'payment_submitted', proof_of_payment = ?
      WHERE booking_id = ? AND user_id = ? AND payment_status = 'pending_payment' AND booking_status != 'cancelled'
    `;

    db.query(updateSql, [relativePath, bookingId, user_id], (updateErr, result) => {
      if (updateErr) {
        console.log("Submit payment error:", updateErr);
        return res.json({ success: false, message: "Failed to submit proof of payment" });
      }

      if (result.affectedRows === 0) {
        return res.json({ success: false, message: "This booking is not awaiting payment" });
      }

      // Let admins know a payment is ready to be verified
      db.query(
        "SELECT f.facility_name FROM bookings b JOIN facilities f ON b.facility_id = f.facility_id WHERE b.booking_id = ?",
        [bookingId],
        (lookupErr, rows) => {
          if (!lookupErr && rows.length > 0) {
            const adminMsg = `Proof of payment submitted for ${rows[0].facility_name}. Please verify and approve.`;
            notifyAllAdmins(bookingId, "Payment Submitted", adminMsg, "system");
          }
        }
      );

      return res.json({ success: true, message: "Proof of payment submitted successfully" });
    });
  });
});

/**
 * PUT /bookings/:id/cancel
 * Lets the owning user cancel their own booking, enforcing a 1-hour-before-
 * start cancellation deadline. Bookings that are already finalized or
 * actively in progress (cancelled/completed/expired/checked_in/key_collected)
 * cannot be cancelled. On success, notifies admins and confirms to the user.
 * Request body: { user_id }
 */
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

    // Reject cancellation if we're already within 1 hour of the booking's start time
    if (new Date() > cancelDeadline) {
      return res.json({ success: false, message: "You can only cancel at least 1 hour before the booking starts" });
    }

    const updateSql = `UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = ?`;

      db.query(updateSql, [bookingId], (updateErr) => {
        if (updateErr) return res.json({ success: false, message: "Failed to cancel booking" });

        // 1. Alert all admins that the user cancelled (Already in your code)
        notifyAllAdmins(bookingId, 'Booking Cancelled', 'User has cancelled a previously approved booking.', 'system');

        // 2. NEW: Send an email & system notification to the student/staff confirming success
        notifySpecificUser(user_id, bookingId, 'Cancellation Confirmed', 'You have successfully cancelled your booking.', 'booking_cancelled');

        return res.json({ success: true, message: "Booking cancelled successfully" });
      });
  });
});

// ============================================================================
// 7. ADMIN DASHBOARDS & LIFECYCLE CONTROLS
// ============================================================================

/**
 * GET /admin/bookings (admin only)
 * Retrieves every booking in the system, joined with user and facility info,
 * for the admin bookings-management dashboard.
 */
router.get("/admin/bookings", verifyToken, requireRole(['admin']), (req, res) => {
  const sql = `
  SELECT 
    b.booking_id,
    DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
    TIME_FORMAT(b.start_time, '%H:%i:%s') AS start_time,
    TIME_FORMAT(b.end_time, '%H:%i:%s') AS end_time,

    b.remark,
    b.booking_status,
    b.payment_required,
    b.payment_status,
    b.payment_amount,
    b.proof_of_payment,
    b.key_status,

    u.name AS user_name,
    u.role AS user_role,

    f.facility_name,
    f.booking_flow_type

  FROM bookings b

  JOIN users u
    ON b.user_id = u.user_id

  JOIN facilities f
    ON b.facility_id = f.facility_id

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

/**
 * PUT /admin/bookings/:id/approve (admin only)
 * Approves a pending booking (only allowed from pending / pending_payment /
 * payment_submitted states). Sends a tailored approval notification depending
 * on whether the facility requires key collection.
 */
// Administrative booking approval transition logic
// =====================================================
// ADMIN APPROVE BOOKING
// Normal booking + payment-required booking
// =====================================================
router.put(
  "/admin/bookings/:id/approve",
  verifyToken,
  requireRole(["admin"]),
  (req, res) => {

    const bookingId = req.params.id;

    // First get the booking + facility flow
    const checkSql = `
      SELECT
        b.booking_id,
        b.booking_status,
        b.payment_required,
        b.payment_status,
        f.facility_name,
        f.booking_flow_type
      FROM bookings b
      JOIN facilities f
        ON b.facility_id = f.facility_id
      WHERE b.booking_id = ?
      LIMIT 1
    `;

    db.query(checkSql, [bookingId], (checkErr, rows) => {

      if (checkErr) {
        console.log("Approve booking check error:", checkErr);

        return res.json({
          success: false,
          message: "Failed to approve booking"
        });
      }

      if (rows.length === 0) {
        return res.json({
          success: false,
          message: "Booking not found"
        });
      }

      const booking = rows[0];

      const bookingStatus = booking.booking_status
        ? booking.booking_status.trim().toLowerCase()
        : "";

      const paymentStatus = booking.payment_status
        ? booking.payment_status.trim().toLowerCase()
        : "";

      const paymentRequired =
        booking.payment_required === 1 ||
        booking.payment_required === "1" ||
        booking.booking_flow_type === "payment_required";


      // =================================================
      // PAYMENT REQUIRED BOOKING
      // =================================================

      if (paymentRequired) {

        // Admin can approve only after proof is submitted
        if (paymentStatus !== "payment_submitted") {
          return res.json({
            success: false,
            message: "Payment proof has not been submitted yet."
          });
        }

        const updatePaymentSql = `
          UPDATE bookings
          SET
            booking_status = 'approved',
            payment_status = 'verified'
          WHERE booking_id = ?
        `;

        db.query(updatePaymentSql, [bookingId], (updateErr) => {

          if (updateErr) {
            console.log("Payment booking approve error:", updateErr);

            return res.json({
              success: false,
              message: "Failed to approve booking"
            });
          }

          notifyUserByBooking(
            bookingId,
            "Booking Approved",
            `Your payment has been verified and your booking request of ${booking.facility_name} has been approved.`,
            "booking_approved"
          );

          return res.json({
            success: true,
            message: "Booking approved successfully"
          });

        });

        return;
      }


      // =================================================
      // NORMAL / STAFF KEY APPROVAL
      // =================================================

      if (bookingStatus !== "pending") {
        return res.json({
          success: false,
          message: "This booking cannot be approved"
        });
      }

      const updateNormalSql = `
        UPDATE bookings
        SET booking_status = 'approved'
        WHERE booking_id = ?
      `;

      db.query(updateNormalSql, [bookingId], (updateErr) => {

        if (updateErr) {
          console.log("Normal booking approve error:", updateErr);

          return res.json({
            success: false,
            message: "Failed to approve booking"
          });
        }

        const emailMessage =
          booking.booking_flow_type === "staff_key_approval"
            ? `Your booking request of ${booking.facility_name} has been approved. Please go to AFM to collect the key.`
            : `Your booking request of ${booking.facility_name} has been approved.`;

        notifyUserByBooking(
          bookingId,
          "Booking Approved",
          emailMessage,
          "booking_approved"
        );

        return res.json({
          success: true,
          message: "Booking approved successfully"
        });

      });

    });

  }
);

/**
 * PUT /admin/bookings/:id/cancel (admin only)
 * Admin-initiated cancellation. Blocked for bookings already in a finalized
 * or actively-in-progress state. Notifies the booking's owner that their
 * request was not approved.
 */
router.put("/admin/bookings/:id/cancel", verifyToken, requireRole(['admin']), (req, res) => {
  const bookingId = req.params.id;

  const sql = `
    UPDATE bookings SET booking_status = 'cancelled'
    WHERE booking_id = ? AND booking_status NOT IN ('cancelled', 'completed', 'expired', 'checked_in', 'key_collected')
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) return res.json({ success: false, message: "Failed to cancel booking" });
    if (result.affectedRows === 0) return res.json({ success: false, message: "This booking cannot be cancelled" });

    // Replaces the raw SQL query with the helper
        notifyUserByBooking(bookingId, 'Booking Cancelled', 'Admin did not approve your booking.', 'booking_cancelled');

        return res.json({ success: true, message: "Booking cancelled successfully" });
  });
});

/**
 * GET /admin/key-management (admin only)
 * Retrieves all bookings for facilities that require a physical key
 * (staff_key_approval / normal_approval flows with key_required = 1), across
 * the three "key lifecycle" states: pending collection, collected, or
 * returned (completed). Used to power the admin key-tracking dashboard.
 */
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

/**
 * PUT /admin/bookings/:id/collect-key (admin only)
 * Admin marks a physical key as collected by the user. Only valid for
 * bookings currently 'approved' with key_status 'pending_collection', on
 * facilities using the staff_key_approval or normal_approval flow.
 */
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

/**
 * PUT /bookings/:id/return-key
 * Lets the booking's owner (via QR scan) mark their key as returned, which
 * also completes the booking. Only valid for bookings currently
 * 'key_collected' with key_status 'collected'. Records the exact return
 * timestamp via key_returned_at = NOW().
 * Request body: { user_id }
 */
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

/**
 * Generate automated reminder notifications for users who still hold a key
 * (booking_status = 'key_collected') after their booking's end time has
 * passed. Uses a NOT EXISTS guard against the notifications table so each
 * booking only ever gets one 'key_return_reminder' notification.
 * @param {Function} [callback] - Optional callback invoked once processing is done.
 */
// Generate automated prompt for completed sessions
function createKeyReturnReminders(callback) {
  const sql = `
    SELECT b.booking_id, b.user_id, f.facility_name
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE b.booking_status = 'key_collected'
    AND NOW() >= TIMESTAMP(b.booking_date, b.end_time)
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.booking_id = b.booking_id AND n.notification_type = 'key_return_reminder'
    )
  `;
  db.query(sql, (err, results) => {
    if (!err && results.length > 0) {
      results.forEach(row => {
        const msg = `Reminder: Please return the key for ${row.facility_name}.`;
        notifySpecificUser(row.user_id, row.booking_id, 'Key Return Reminder', msg, 'key_return_reminder');
      });
    }
    if (callback) callback();
  });
}

/**
 * GET /bookings/current-booking/:facility_id/:user_id
 * Resolves a physical QR code scan (tied to a facility_id) to the specific
 * active booking it should act on for the scanning user. Computes the local
 * "now" date/time (server local time, not UTC) to match against:
 *  - a 'reserved' direct_reservation booking whose slot covers the current time, OR
 *  - a 'key_collected' booking (staff_key_approval/normal_approval) awaiting key return
 * Used to drive the QR scan flow (deciding whether to check-in or return-key).
 */
// Redirect logic mapping physical QR codes to system reservations
router.get("/bookings/current-booking/:facility_id/:user_id", verifyToken, (req, res) => {
  const facilityId = req.params.facility_id;
  const userId = req.params.user_id;

  const now = new Date();
  
  // Build a local YYYY-MM-DD date string (avoids UTC offset issues from toISOString)
  const localDate = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0');
                    
  // Build a local HH:MM:SS time string
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

/**
 * Critical system alert: flags bookings where a key has been collected but
 * not returned more than 30 minutes after the booking's scheduled end time,
 * to help mitigate unauthorized/prolonged access to a facility.
 * Sends both a user-facing urgent reminder and an admin alert, guarded by a
 * NOT EXISTS check so each booking only triggers one 'key_overdue_warning'.
 * @param {Function} [callback] - Optional callback invoked once processing is done.
 */
// Critical System Alert: Flags users 30+ minutes past session end to mitigate access breaches
function createOverdueKeyNotifications(callback) {
  const sql = `
    SELECT b.booking_id, b.user_id, f.facility_name
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE f.booking_flow_type IN ('staff_key_approval', 'normal_approval')
    AND b.booking_status = 'key_collected' AND b.key_status = 'collected'
    AND NOW() >= DATE_ADD(TIMESTAMP(b.booking_date, b.end_time), INTERVAL 30 MINUTE)
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.booking_id = b.booking_id AND n.notification_type = 'key_overdue_warning'
    )
  `;
  
  db.query(sql, (err, results) => {
    if (!err && results.length > 0) {
      results.forEach(row => {
        // 1. Email & notify the user
        const userMsg = `URGENT: Your booking for ${row.facility_name} ended over 30 minutes ago. Please return the key immediately to avoid penalties.`;
        notifySpecificUser(row.user_id, row.booking_id, 'OVERDUE: Key Return', userMsg, 'key_overdue_warning');
        
        // 2. Email & notify all admins
        const adminMsg = `URGENT: A key for ${row.facility_name} is overdue by over 30 minutes.`;
        notifyAllAdmins(row.booking_id, 'OVERDUE: Key Return Alert', adminMsg, 'admin_key_overdue');
      });
    }
    if (callback) callback();
  });
}

router.put("/bookings/:id/submit-payment", (req, res) => {
  const bookingId = req.params.id;
  const { user_id, proof_of_payment } = req.body;

  if (!proof_of_payment) {
    return res.status(400).json({
      success: false,
      message: "Please attach proof of payment."
    });
  }

  const sql = `
    UPDATE bookings
    SET proof_of_payment = ?,
        payment_status = 'payment_submitted'
    WHERE booking_id = ?
      AND user_id = ?
  `;

  db.query(
    sql,
    [proof_of_payment, bookingId, user_id],
    (err, result) => {
      if (err) {
        console.error("Submit proof of payment error:", err);

        return res.status(500).json({
          success: false,
          message: "Failed to submit proof of payment."
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found."
        });
      }

      return res.json({
        success: true,
        message: "Proof of payment submitted successfully."
      });
    }
  );
});

// testing send email api
router.get("/test-email", async (req, res) => {
    const result = await sendEmailNotification(
        "p24016691@student.newinti.edu.my",
        "INTI FMS Test Email",
        "This is a test email from INTI Facility Management System."
    );

    if (!result.success) {
        return res.status(500).json({
            success: false,
            message: "Failed to send test email",
            error: result.error
        });
    }

    res.json({
        success: true,
        message: "Test email sent successfully",
        data: result.data
    });
});

module.exports = router;
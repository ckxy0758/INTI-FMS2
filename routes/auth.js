const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ? AND status = 'active'";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Database error"
      });
    }

    if (result.length === 1) {
      const user = result[0];

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
      return res.json({
        success: false,
        message: "Invalid email or password"
      });
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

  const defaultPassword = user_code;

  const sql = `
    INSERT INTO users 
    (name, user_code, email, password, role, status, must_change_password)
    VALUES (?, ?, ?, ?, ?, 'active', TRUE)
  `;

  db.query(sql, [name, user_code, email, defaultPassword, role], (err) => {
    if (err) {
      return res.json({
        success: false,
        message: "User already exists or database error"
      });
    }

    return res.json({
      success: true,
      message: `Account created successfully. Temporary password: ${defaultPassword}. Please tell the user to change password after first login.`,
      temporaryPassword: defaultPassword
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

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.json({
      success: false,
      message: "Please fill in all fields"
    });
  }

  const sql = `
    UPDATE users
    SET password = ?, must_change_password = FALSE
    WHERE email = ?
    AND status = 'active'
  `;

  db.query(sql, [newPassword, email], (err, result) => {

    if (err) {
      return res.json({
        success: false,
        message: "Database error"
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "Email not found"
      });
    }

    return res.json({
      success: true,
      message: "Password updated successfully"
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
  booking_flow_type
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
      booking_flow_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
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
      image_path || "images/bg-image-2.jpeg",
      availability_status || "available",
      visible_to || "both",
      key_required || 0,
      booking_flow_type || "normal_approval"
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
    booking_flow_type
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
      booking_flow_type = ? 
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
      image_path || "images/bg-image-2.jpeg",
      availability_status || "available",
      visible_to || "both",
      key_required || 0,
      booking_flow_type || "normal_approval",
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
      return res.json({
        success: false,
        message: "Date is required",
        slots: []
      });
    }

    const dayNumber = new Date(selectedDate).getDay();

    if (dayNumber === 0 || dayNumber === 6) {
      return res.json({
        success: true,
        message: "Bookings are not available on Saturday and Sunday",
        slots: []
      });
    }

    const selectedDay = new Date(selectedDate).toLocaleDateString("en-US", {
      weekday: "long"
    });

    const facilitySql = `
      SELECT operating_start, operating_end
      FROM facilities
      WHERE facility_id = ?
      LIMIT 1
    `;

    db.query(facilitySql, [facilityId], (facilityErr, facilityResult) => {
      if (facilityErr || facilityResult.length === 0) {
        return res.json({
          success: false,
          message: "Facility not found",
          slots: []
        });
      }

      const facility = facilityResult[0];

      const bookingSql = `
        SELECT start_time, end_time
        FROM bookings
        WHERE facility_id = ?
        AND booking_date = ?
        AND booking_status IN (
          'pending',
          'pending_payment',
          'payment_submitted',
          'approved',
          'reserved',
          'checked_in',
          'key_collected'
        )
      `;

      db.query(bookingSql, [facilityId, selectedDate], (bookingErr, bookingResult) => {
        if (bookingErr) {
          return res.json({
            success: false,
            message: "Failed to check bookings",
            slots: []
          });
        }

        const timetableSql = `
          SELECT start_time, end_time
          FROM class_timetable
          WHERE facility_id = ?
          AND day_of_week = ?
        `;

        db.query(timetableSql, [facilityId, selectedDay], (timetableErr, timetableResult) => {
          if (timetableErr) {
            console.log("Timetable load error:", timetableErr);

            return res.json({
              success: false,
              message: "Failed to check class timetable",
              slots: []
            });
          }

          const slots = [];

          const operatingStart = Number(facility.operating_start.substring(0, 2));
          const operatingEnd = Number(facility.operating_end.substring(0, 2));

          if (isNaN(operatingStart) || isNaN(operatingEnd) || operatingStart >= operatingEnd) {
            return res.json({
              success: false,
              message: "Invalid operating hours for this facility",
              slots: []
            });
          }

          const today = new Date().toISOString().split("T")[0];

          const minimumBookingTime = new Date();
          minimumBookingTime.setMinutes(minimumBookingTime.getMinutes() + 30);

          for (let hour = operatingStart; hour < operatingEnd; hour++) {
            const startTime = `${String(hour).padStart(2, "0")}:00:00`;
            const endTime = `${String(hour + 1).padStart(2, "0")}:00:00`;

            const slotDateTime = new Date(`${selectedDate}T${startTime}`);

            if (selectedDate === today && slotDateTime < minimumBookingTime) {
              continue;
            }

            const isBooked = bookingResult.some(booking => {
              return isTimeOverlap(
                startTime,
                endTime,
                booking.start_time,
                booking.end_time
              );
            });

            const isClassTime = timetableResult.some(classSlot => {
              return isTimeOverlap(
                startTime,
                endTime,
                classSlot.start_time,
                classSlot.end_time
              );
            });

            if (!isBooked && !isClassTime) {
              slots.push({
                start_time: startTime,
                end_time: endTime,
                label: `${formatSlotTime(startTime)} - ${formatSlotTime(endTime)}`
              });
            }
          }

          return res.json({
            success: true,
            slots: slots
          });
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
    WHERE LOWER(TRIM(f.facility_name)) LIKE 'cubicle%'
    AND b.booking_status = 'reserved'
    AND NOW() > DATE_ADD(
      TIMESTAMP(b.booking_date, b.start_time),
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

/* ===== SUBMIT BOOKING WITH PAYMENT LOGIC ===== */
router.post("/bookings", (req, res) => {
  const {
    user_id,
    facility_id,
    program,
    booking_date,
    start_time,
    end_time,
    purpose
  } = req.body;

  if (
    !user_id ||
    !facility_id ||
    !program ||
    !booking_date ||
    !start_time ||
    !end_time
  ) {
    return res.json({
      success: false,
      message: "Please fill in all required booking details"
    });
  }

  const bookingDayNumber = new Date(booking_date).getDay();

  if (bookingDayNumber === 0 || bookingDayNumber === 6) {
    return res.json({
      success: false,
      message: "Bookings are not allowed on Saturday and Sunday"
    });
  }

  const start = new Date(`${booking_date}T${start_time}`);
  const end = new Date(`${booking_date}T${end_time}`);

  if (start >= end) {
    return res.json({
      success: false,
      message: "End time must be later than start time"
    });
  }

  const now = new Date();

  if (start < now) {
    return res.json({
      success: false,
      message: "You cannot book a date or time that has already passed"
    });
  }

  const duration_hours = (end - start) / (1000 * 60 * 60);

    const facilitySql = `
      SELECT facility_name, booking_flow_type
      FROM facilities
      WHERE facility_id = ?
      LIMIT 1
    `;

  db.query(facilitySql, [facility_id], (facilityErr, facilityResult) => {
    if (facilityErr || facilityResult.length === 0) {
      return res.json({
        success: false,
        message: "Facility not found"
      });
    }

  const bookingFlowType = facilityResult[0].booking_flow_type || "normal_approval";
  const facilityName = facilityResult[0].facility_name;

  let bookingStatus = "pending";
  let paymentRequired = 0;
  let paymentStatus = "not_required";
  let paymentAmount = 0.00;
  let keyStatus = "not_required";

  if (bookingFlowType === "normal_approval") {
    bookingStatus = "pending";
    paymentRequired = 0;
    paymentStatus = "not_required";
    paymentAmount = 0.00;
    keyStatus = "not_required";
  }

  if (bookingFlowType === "payment_required") {
    bookingStatus = "pending_payment";
    paymentRequired = 1;
    paymentStatus = "pending_payment";
    paymentAmount = 5.00;
    keyStatus = "not_required";
  }

  if (bookingFlowType === "direct_reservation") {
    bookingStatus = "reserved";
    paymentRequired = 0;
    paymentStatus = "not_required";
    paymentAmount = 0.00;
    keyStatus = "not_required";
  }

  if (bookingFlowType === "staff_key_approval") {
    bookingStatus = "pending";
    paymentRequired = 0;
    paymentStatus = "not_required";
    paymentAmount = 0.00;
    keyStatus = "pending_collection";
  }

    const checkSql = `
      SELECT booking_id
      FROM bookings
      WHERE facility_id = ?
      AND booking_date = ?
      AND start_time = ?
      AND booking_status IN (
        'pending',
        'pending_payment',
        'payment_submitted',
        'approved',
        'reserved',
        'checked_in',
        'key_collected'
      )
      LIMIT 1
    `;

    db.query(checkSql, [facility_id, booking_date, start_time], (checkErr, checkResult) => {
      if (checkErr) {
        return res.json({
          success: false,
          message: "Failed to check booking availability"
        });
      }

      if (checkResult.length > 0) {
        return res.json({
          success: false,
          message: "This time slot has already been booked"
        });
      }

      const sql = `
        INSERT INTO bookings
        (
          user_id,
          facility_id,
          program,
          booking_date,
          start_time,
          end_time,
          duration_hours,
          purpose,
          booking_status,
          key_status,
          payment_required,
          payment_status,
          payment_amount
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [
          user_id,
          facility_id,
          program,
          booking_date,
          start_time,
          end_time,
          duration_hours,
          purpose || "",
          bookingStatus,
          keyStatus,
          paymentRequired,
          paymentStatus,
          paymentAmount
        ],
        (err, result) => {
          if (err) {
            console.log("Booking insert error:", err);

            return res.json({
              success: false,
              message: "Booking submission failed",
              error: err.message
            });
          }

          const bookingId = result.insertId;

          const requiresAdminReview = [
            "normal_approval",
            "payment_required",
            "staff_key_approval"
          ];

          if (requiresAdminReview.includes(bookingFlowType)) {

            const adminNotificationSql = `
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
                user_id,
                ?,
                ?,
                ?,
                'admin_booking',
                0
              FROM users
              WHERE role = 'admin'
              AND status = 'active'
            `;

            db.query(
              adminNotificationSql,
              [
                bookingId,
                "New Booking Request",
                `A new booking request for ${facilityName} has been submitted and requires review.`
              ],
              (adminNotificationErr) => {
                if (adminNotificationErr) {
                  console.log("Admin notification insert error:", adminNotificationErr);
                }
              }
            );

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
            VALUES (?, ?, ?, ?, ?, 0)
          `;

          let notificationTitle = "Booking Submitted";
          let notificationMessage = `Your booking request of ${facilityName} has been submitted successfully.`;

          if (bookingFlowType === "payment_required") {
            notificationTitle = "Payment Required";
            notificationMessage = `Your booking request of ${facilityName} has been submitted. Please proceed to AFM to make payment.`;
          }

          if (bookingFlowType === "direct_reservation") {
            notificationTitle = "Reservation Successful";
            notificationMessage = `Your reservation of ${facilityName} has been successful.`;
          }

          if (bookingFlowType === "staff_key_approval") {
            notificationTitle = "Booking Submitted";
            notificationMessage = `Your booking of ${facilityName} has been submitted. Please wait for admin approval.`;
          }

          db.query(
            notificationSql,
            [
              user_id,
              bookingId,
              notificationTitle,
              notificationMessage,
              "booking"
            ],
            (notificationErr) => {
              if (notificationErr) {
                console.log("Notification insert error:", notificationErr);
              }

              return res.json({
                success: true,
                message: paymentRequired === 1
                  ? "Booking request submitted. Please proceed to AFM to make payment."
                  : "Booking request submitted successfully.",
                booking_id: bookingId,
                booking_status: bookingStatus,
                payment_required: paymentRequired,
                payment_status: paymentStatus,
                payment_amount: paymentAmount
              });
            }
          );
        }
      );
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
  const userId = req.params.user_id;

  createKeyReturnReminders((reminderErr) => {
    if (reminderErr) {
      console.log("Key reminder creation error:", reminderErr);
    }

    const sql = `
      SELECT *
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, result) => {
      if (err) {
        console.log("Notifications load error:", err);

        return res.json({
          success: false,
          notifications: []
        });
      }

      return res.json({
        success: true,
        notifications: result
      });
    });
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

    if (result[0].password !== currentPassword) {
      return res.json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const updateSql = `
      UPDATE users
      SET password = ?, must_change_password = FALSE
      WHERE user_id = ?
    `;

    db.query(updateSql, [newPassword, user_id], (updateErr) => {
      if (updateErr) {
        return res.json({
          success: false,
          message: "Failed to change password"
        });
      }

      return res.json({
        success: true,
        message: "Password changed successfully"
      });
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
      booking_id,
      user_id,
      DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
      TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(end_time, '%H:%i:%s') AS end_time,
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

    const bookingStatus = booking.booking_status
      ? booking.booking_status.trim().toLowerCase()
      : "";

    if (bookingStatus !== "reserved") {
      return res.json({
        success: false,
        message: "This booking is not available for check-in"
      });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();

    const checkInStart = new Date(startDateTime);
    checkInStart.setMinutes(checkInStart.getMinutes() - 15);

    const checkInEnd = new Date(startDateTime);
    checkInEnd.setMinutes(checkInEnd.getMinutes() + 15);

    console.log("Check-in debug:", {
      bookingId,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      now,
      checkInStart,
      checkInEnd
    });

    if (now < checkInStart) {
      return res.json({
        success: false,
        message: "Check-in is not open yet"
      });
    }

    if (now > checkInEnd) {
      return res.json({
        success: false,
        message: "Check-in time has expired"
      });
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
    cancelDeadline.setMinutes(cancelDeadline.getMinutes() - 30);

    const now = new Date();

    if (now > cancelDeadline) {
      return res.json({
        success: false,
        message: "You can only cancel at least 30 minutes before the booking starts"
      });
    }

    const updateSql = `
      UPDATE bookings
      SET booking_status = 'cancelled'
      WHERE booking_id = ?
    `;

    db.query(updateSql, [bookingId], (updateErr) => {
      if (updateErr) {
        return res.json({
          success: false,
          message: "Failed to cancel booking"
        });
      }

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
      return res.json({
        success: false,
        message: "Failed to cancel booking"
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "This booking cannot be cancelled"
      });
    }

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
    WHERE f.booking_flow_type = 'staff_key_approval'
    AND f.key_required = 1
    AND u.role = 'staff'
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
    AND f.booking_flow_type = 'staff_key_approval'
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
    AND f.booking_flow_type = 'staff_key_approval'
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
  const sql = `
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
      'Key Return Reminder',
      CONCAT('Reminder: Please return the key for ', f.facility_name, ' as your booking time has ended.'),
      'key_return_reminder',
      0
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.facility_id
    WHERE f.booking_flow_type = 'staff_key_approval'
    AND b.booking_status = 'key_collected'
    AND b.key_status = 'collected'
    AND NOW() >= TIMESTAMP(b.booking_date, b.end_time)
    AND NOT EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.booking_id = b.booking_id
      AND n.notification_type = 'key_return_reminder'
    )
  `;

  db.query(sql, callback);
}

// GET CURRENT BOOKING ID FOR QR REDIRECT
// SINGLE, CLEAN ROUTE: Handle QR Code current booking lookup
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

  // 2. We inject localDate and localTime directly into the query
  const sql = `
    SELECT booking_id 
    FROM bookings 
    WHERE user_id = ? 
    AND facility_id = ? 
    AND booking_status = 'reserved'
    AND booking_date = ?
    AND ? BETWEEN start_time AND end_time
    LIMIT 1
  `;

  // 3. Pass all 4 variables to the database query
  db.query(sql, [userId, facilityId, localDate, localTime], (err, result) => {
    if (err) {
      console.error("Database error in current-booking:", err);
      return res.json({ success: false, message: "Database error" });
    }
    
    if (result.length === 0) {
      return res.json({ 
        success: false, 
        message: "No active reservation found for this cubicle at this time." 
      });
    }

    return res.json({ success: true, booking_id: result[0].booking_id });
  });
});

module.exports = router;
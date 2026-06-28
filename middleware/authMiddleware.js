// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// Use a strong secret key (In production, put this in a .env file)
const JWT_SECRET = "your_super_secret_key_change_this_later"; 

// 1. Middleware to check if the user is logged in (Valid Token)
const verifyToken = (req, res, next) => {
  // The frontend will send the token in the headers
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ success: false, message: "Access Denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // Attach the user data (id, role) to the request object
    next(); // Move on to the actual API route
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token." });
  }
};

// 2. Middleware to check if the user has the right role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // req.user was set by verifyToken just before this ran
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You do not have permission to perform this action." 
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, JWT_SECRET };
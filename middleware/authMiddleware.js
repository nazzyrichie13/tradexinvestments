// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header: expected format "Bearer <token>"
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. Token malformed.' });
  }

  try {
    // Verify token with your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info to the request
    req.user = decoded;
    next(); // proceed to next middleware or route handler
  } catch (err) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

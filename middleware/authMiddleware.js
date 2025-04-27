require('dotenv').config();
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_KEY;

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    console.log('Token Not Found');
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    console.log("Verified");
    next();
  } catch (e) {
    console.error('Token verification failed:', e);
    res.status(400).send('Invalid token.');
  }
};

module.exports = authenticateJWT;

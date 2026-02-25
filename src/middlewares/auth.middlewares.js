import jwt from 'jsonwebtoken';
import { User } from '../models/users.models.js';
import cloudinary from '../config/cloudinary.configs.js'; // Cloudinary configuration file
import fs from 'fs';
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ OPTION 1: Check the token using the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2️⃣ OPTION 2: If not found in the header, check from cookies
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // 3️⃣If the token is not found in either place
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not found. Please log in'
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // ✅ Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ Attach user to request
    req.user = { id: user._id, email: user.email, name: user.name };
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'The token has expired',
        expired: true
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

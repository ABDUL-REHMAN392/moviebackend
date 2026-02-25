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
// ============= UPDATE PROFILE PICTURE (Cloudinary) =============
export const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if file uploaded hai
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture upload karein'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User nahi mila'
      });
    }

    //If there is an old profile picture, delete it (unless it’s the default)
    if (user.profilePicture.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }

    // Upload new image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'user-profiles',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });

    // Update user profile picture
    user.profilePicture = {
      publicId: result.public_id,
      url: result.secure_url
    };

    await user.save();

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });

  } catch (error) {
    console.error('Update profile picture error:', error);
    // Cleanup: delete local file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Profile picture update failed',
      error: error.message
    });
  }
};

import { User } from "../models/users.models.js";
import jwt from "jsonwebtoken";
// ============= JWT TOKEN GENERATION =============
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }, // 15 minutes
  );
};
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }, // 7 days
  );
};

// ============= USER REGISTRATION (Email/Password) =============
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email aur password required hain",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "The user is already registered with this email",
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      authProvider: "local",
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in HTTP-only cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      message: "User successfully registered",
      user,
      accessToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// ============= USER LOGIN (Email/Password) =============
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user with password field (by default select: false hai)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user registered with Google
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Use Google login for this email address'
      });
    }


    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();

    // Set cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

// ============= GOOGLE OAUTH CALLBACK =============
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, ''); // trailing slash remove
    const redirectUrl = `${clientUrl}/auth/success?token=${accessToken}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google auth error:', error);
    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, '');
    res.redirect(`${clientUrl}/auth/failure`);
  }
};

// ============= REFRESH ACCESS TOKEN =============
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token was not received'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

// ============= GET USER PROFILE =============
export const getUserProfile = async (req, res) => {
  try {
    // req.user will be available through middleware (after authentication)
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile fetch failed',
      error: error.message
    });
  }
};

// ============= UPDATE USER PROFILE =============
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // ✅ 1. Check if at least one field is provided
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name or email) is required for update'
      });
    }

    // ✅ 2. Validate name (if provided)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name must be a valid string and cannot be empty'
        });
      }
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long'
        });
      }
      if (name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot exceed 50 characters'
        });
      }
    }

    // ✅ 3. Validate email (if provided)
    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Email must be a valid string'
        });
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    }

    // ✅ 4. Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ 5. Check if user is trying to update email with Google account
    if (user.authProvider === 'google' && email && email !== user.email) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change email for Google authenticated accounts'
      });
    }

    // ✅ 6. Track what's being updated
    const updates = {};

    // Update name
    if (name && name.trim() !== user.name) {
      user.name = name.trim();
      updates.name = true;
    }
    
    // Update email with duplicate check
    if (email && email.trim().toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ 
        email: email.trim().toLowerCase() 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This email is already associated with another account'
        });
      }
      
      user.email = email.trim().toLowerCase();
      updates.email = true;
    }

    // ✅ 7. Check if anything actually changed
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes detected. Provided values are same as current values.'
      });
    }

    // ✅ 8. Save updated user
    await user.save();

    // ✅ 9. Success response with updated fields info
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      updatedFields: Object.keys(updates),
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // ✅ Handle specific Mongoose errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error.message
    });
  }
};

// ============= DELETE PROFILE PICTURE =============
export const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User nahi mila'
      });
    }

    // Cloudinary se delete karo
    if (user.profilePicture.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }

    // Set to default
    user.profilePicture = {
      publicId: null,
      url: 'https://res.cloudinary.com/default/image/upload/v1234567890/default-avatar.png'
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile picture delete failed',
      error: error.message
    });
  }
};

// ============= DELETE USER ACCOUNT =============
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User nahi mila'
      });
    }

    // Cloudinary se profile picture delete karo
    if (user.profilePicture.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }

    // User delete karo
    await User.findByIdAndDelete(userId);

    // Clear cookies
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Account successfully deleted'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Account delete failed',
      error: error.message
    });
  }
};

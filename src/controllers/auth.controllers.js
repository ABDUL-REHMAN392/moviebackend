import { User } from "../models/users.models.js";
import { Favorite } from "../models/favorite.models.js";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.configs.js";
import fs from "fs";

// ============= JWT TOKEN GENERATION =============
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "7d",
  });
};

// ============= USER REGISTRATION =============
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email aur password required hain",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "The user is already registered with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      authProvider: "local",
    });

    const accessToken = generateAccessToken(user._id);

    res.cookie("accessToken", accessToken, {
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

// ============= USER LOGIN =============
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message: "Use Google login for this email address",
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken(user._id);

    user.lastLogin = Date.now();
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    user.lastLogin = Date.now();
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");
    res.redirect(`${clientUrl}/auth/success?token=${accessToken}`);
  } catch (error) {
    console.error("Google auth error:", error);
    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");
    res.redirect(`${clientUrl}/auth/failure`);
  }
};

// ============= GET USER PROFILE =============
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Profile fetch failed",
      error: error.message,
    });
  }
};

// ============= UPDATE USER PROFILE =============
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: "At least one field (name or email) is required for update",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Name must be a valid string and cannot be empty",
          });
      }
      if (name.trim().length < 2) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Name must be at least 2 characters long",
          });
      }
      if (name.trim().length > 50) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Name cannot exceed 50 characters",
          });
      }
    }

    if (email !== undefined) {
      if (typeof email !== "string" || email.trim().length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Email must be a valid string" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email format" });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.authProvider === "google" && email && email !== user.email) {
      return res.status(403).json({
        success: false,
        message: "Cannot change email for Google authenticated accounts",
      });
    }

    const updates = {};

    if (name && name.trim() !== user.name) {
      user.name = name.trim();
      updates.name = true;
    }

    if (email && email.trim().toLowerCase() !== user.email) {
      const existingUser = await User.findOne({
        email: email.trim().toLowerCase(),
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "This email is already associated with another account",
        });
      }
      user.email = email.trim().toLowerCase();
      updates.email = true;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No changes detected. Provided values are same as current values.",
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      updatedFields: Object.keys(updates),
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res
      .status(500)
      .json({
        success: false,
        message: "Profile update failed",
        error: error.message,
      });
  }
};

// ============= UPDATE PROFILE PICTURE =============
export const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Profile picture upload karein" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User nahi mila" });
    }

    if (user.profilePicture.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "user-profiles",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto" },
      ],
    });

    user.profilePicture = {
      publicId: result.public_id,
      url: result.secure_url,
    };
    await user.save();
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error("Update profile picture error:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res
      .status(500)
      .json({
        success: false,
        message: "Profile picture update failed",
        error: error.message,
      });
  }
};

// ============= DELETE PROFILE PICTURE =============
export const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User nahi mila" });
    }

    if (user.profilePicture.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }

    user.profilePicture = {
      publicId: null,
      url: "https://www.gravatar.com/avatar/?d=mp&f=y",
    };

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Profile picture deleted successfully" });
  } catch (error) {
    console.error("Delete profile picture error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Profile picture delete failed",
        error: error.message,
      });
  }
};

// ============= DELETE USER ACCOUNT =============
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await Favorite.deleteMany({ userId });

    if (user.profilePicture.publicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePicture.publicId);
      } catch (cloudinaryError) {
        console.error("⚠️ Cloudinary deletion failed:", cloudinaryError);
      }
    }

    await User.findByIdAndDelete(userId);

    res.clearCookie("accessToken");

    res
      .status(200)
      .json({ success: true, message: "Account successfully deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Account deletion failed",
        error: error.message,
      });
  }
};

// ============= LOGOUT =============
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("accessToken");

    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res
      .status(500)
      .json({ success: false, message: "Logout failed", error: error.message });
  }
};

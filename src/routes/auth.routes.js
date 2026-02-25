import express from "express";
import {
  registerUser,
  loginUser,
  googleAuthCallback,
  refreshAccessToken,
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
  deleteProfilePicture,
  deleteUserAccount
} from "../controllers/auth.controllers.js";
import passport from "passport";
import { authenticate } from '../middlewares/auth.middlewares.js';
import { upload } from '../middlewares/upload.middlewares.js' // Multer configuration
const router = express.Router();

// ============= PUBLIC ROUTES =============
// Registration & Login
router.post("/register", registerUser);
router.post("/login", loginUser);
// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/failure",
    session: false,
  }),
  googleAuthCallback,
);
// Refresh Token
router.post('/refresh-token', refreshAccessToken);

// ============= PROTECTED ROUTES =============
// Profile Routes
router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, updateUserProfile);

// Profile Picture Routes
router.put('/profile-picture', 
  authenticate, 
  upload.single('profilePicture'), 
  updateProfilePicture
);
router.delete('/profile-picture', authenticate, deleteProfilePicture);

// Account Management
router.delete('/account', authenticate, deleteUserAccount);

export default router;

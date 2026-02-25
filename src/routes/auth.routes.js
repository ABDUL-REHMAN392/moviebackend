import express from "express";
import {
  registerUser,
  loginUser,
  googleAuthCallback,
  refreshAccessToken,
  getUserProfile
} from "../controllers/auth.controllers.js";
import passport from "passport";
import { authenticate } from '../middlewares/auth.middlewares.js';
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

export default router;

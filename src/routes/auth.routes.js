import express from "express";
import {
  registerUser,
  loginUser,
  googleAuthCallback,
} from "../controllers/auth.controllers.js";
import passport from "passport";
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

export default router;

import express from "express";
import { registerUser, loginUser } from "../controllers/auth.controllers.js";

const router = express.Router();

// ============= PUBLIC ROUTES =============
// Registration & Login
router.post("/register", registerUser);
router.post("/login", loginUser);
export default router;

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './config/passport.configs.js';
import userRoutes from './routes/auth.routes.js';
import { mongoConnection } from './config/mongo.configs.js';
import fs from 'fs';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
// ============= MIDDLEWARES =============
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

// Create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ============= ROUTES =============
app.use('/api/auth', userRoutes);


// ============= DATABASE CONNECTION =============
// Connect DB and Start Server
(async () => {
  try {
    await mongoConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
})();

// ============= ERROR HANDLING =============
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
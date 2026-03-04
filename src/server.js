import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './config/passport.configs.js';
import userRoutes from './routes/auth.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import { mongoConnection } from './config/mongo.configs.js';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
origin: process.env.CLIENT_URL,
credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());

if (!fs.existsSync('uploads')) {
fs.mkdirSync('uploads');
}

// Health Check Route for Railway
app.get("/", (req, res) => {
res.status(200).send("✅ Backend is LIVE!");
});

app.use('/api/auth', userRoutes);
app.use('/api/favorites', favoriteRoutes);

// Fix: Listen first, Connect DB later
app.listen(PORT, "0.0.0.0", () => {
console.log(`🚀 Server is listening on port ${PORT}`);

mongoConnection()
.then(() => {
console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
console.error('❌ MongoDB Connection Error:', err.message);
});
});

app.use((err, req, res, next) => {
console.error(err.stack);
res.status(500).json({
success: false,
message: err.message || 'Internal Server Error'
});
});

export default app;
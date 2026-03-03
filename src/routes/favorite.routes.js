// routes/favorite.routes.js
import express from 'express';
import {
  addToFavorites
} from '../controllers/favorite.controllers.js';
import { authenticate } from '../middlewares/auth.middlewares.js';

const router = express.Router();

// ============= ALL ROUTES ARE PROTECTED =============

// Add to favorites
router.post('/add', authenticate, addToFavorites);



export default router;
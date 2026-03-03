// routes/favorite.routes.js
import express from 'express';

import { authenticate } from '../middlewares/auth.middlewares.js';
import {
  addToFavorites,
  removeFromFavorites,
  getAllFavorites,
  checkFavorite,
  getFavoritesCount,
  clearAllFavorites
} from '../controllers/favorite.controllers.js';

const router = express.Router();

// ============= ALL ROUTES ARE PROTECTED =============

// Add to favorites
router.post('/add', authenticate, addToFavorites);

// Remove from favorites
router.delete('/remove/:tmdbId/:mediaType', authenticate, removeFromFavorites);

// Get all favorites (with optional filtering & pagination)
router.get('/', authenticate, getAllFavorites);

// Check if item is favorited
router.get('/check/:tmdbId/:mediaType', authenticate, checkFavorite);

// Get favorites count
router.get('/count', authenticate, getFavoritesCount);

// Clear all favorites
router.delete('/clear', authenticate, clearAllFavorites);







export default router;
// routes/favorite.routes.js
import express from 'express';

import { authenticate } from '../middlewares/auth.middlewares.js';
import {
  addToFavorites,
  removeFromFavorites,
} from '../controllers/favorite.controllers.js';

const router = express.Router();

// ============= ALL ROUTES ARE PROTECTED =============

// Add to favorites
router.post('/add', authenticate, addToFavorites);

// Remove from favorites
router.delete('/remove/:tmdbId/:mediaType', authenticate, removeFromFavorites);




export default router;
// controllers/favorite.controller.js
import { Favorite } from '../models/favorite.models.js';
import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ============= FETCH TMDB DETAILS =============
const fetchTMDBDetails = async (tmdbId, mediaType) => {
  try {
    const endpoint = mediaType === 'movie' 
      ? `${TMDB_BASE_URL}/movie/${tmdbId}`
      : `${TMDB_BASE_URL}/tv/${tmdbId}`;

    const response = await axios.get(endpoint, {
      params: { api_key: TMDB_API_KEY }
    });

    const data = response.data;

    return {
      title: data.title || data.name,
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      overview: data.overview,
      releaseDate: data.release_date || data.first_air_date,
      voteAverage: data.vote_average,
      genres: data.genres?.map(g => g.name) || []
    };
  } catch (error) {
    console.error('TMDB fetch error:', error.message);
    return null;
  }
};

// ============= ADD TO FAVORITES =============
export const addToFavorites = async (req, res) => {
  try {
    const { tmdbId, mediaType } = req.body;
    const userId = req.user.id;

    // Validation
    if (!tmdbId || !mediaType) {
      return res.status(400).json({
        success: false,
        message: 'TMDB ID and media type are required'
      });
    }

    if (!['movie', 'tv'].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: 'Media type must be either "movie" or "tv"'
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      userId,
      tmdbId,
      mediaType
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'This item is already in your favorites'
      });
    }

    // Fetch details from TMDB
    const tmdbDetails = await fetchTMDBDetails(tmdbId, mediaType);

    if (!tmdbDetails) {
      return res.status(404).json({
        success: false,
        message: 'Could not fetch details from TMDB'
      });
    }

    // Create favorite
    const favorite = await Favorite.create({
      userId,
      tmdbId,
      mediaType,
      ...tmdbDetails
    });

    res.status(201).json({
      success: true,
      message: 'Added to favorites successfully',
      favorite
    });

  } catch (error) {
    console.error('Add to favorites error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This item is already in your favorites'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add to favorites',
      error: error.message
    });
  }
};


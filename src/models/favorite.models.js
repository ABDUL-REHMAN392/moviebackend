// models/favorite.model.js
import { Schema, model } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Fast queries 
    },
    tmdbId: {
      type: Number,
      required: true
    },
    mediaType: {
      type: String,
      enum: ['movie', 'tv'],
      required: true
    },
    // We cache basic information from TMDB (for faster display).
    title: {
      type: String,
      required: true
    },
    posterPath: {
      type: String,
      default: null
    },
    backdropPath: {
      type: String,
      default: null
    },
    overview: {
      type: String,
      default: null
    },
    releaseDate: {
      type: String, // YYYY-MM-DD format
      default: null
    },
    voteAverage: {
      type: Number,
      default: 0
    },
    genres: [{
      type: String
    }]
  },
  { 
    timestamps: true // createdAt, updatedAt
  }
);

// Compound index: A user can favorite a movie only once
favoriteSchema.index(
  { userId: 1, tmdbId: 1, mediaType: 1 }, 
  { unique: true }
);

// Query optimization
favoriteSchema.index({ userId: 1, createdAt: -1 });

export const Favorite = model('Favorite', favoriteSchema);
import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { 
      type: String,
      required: function() {
        return !this.googleId;
      },
      minlength: 6,
      select: false
    },
    googleId: { 
      type: String,
      sparse: true,
      unique: true
    },
    profilePicture: {
      publicId: { type: String },
      url: { 
        type: String,
        default: 'https://www.gravatar.com/avatar/?d=mp&f=y'
      }
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    refreshToken: {
      type: String,
      select: false
    },
    lastLogin: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true 
  }
);

// Password hash middleware
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Password compare method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// JSON serialization - remove sensitive data
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

export const User = model('User', userSchema);
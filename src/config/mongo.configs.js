import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config();
export const mongoConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI,{  dbName: process.env.DATABASE_NAME} )
        console.log('MongoDB connected successfully');}
         catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }           }
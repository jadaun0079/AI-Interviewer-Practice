import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { Interview, RefreshToken, Resume, User } from '../models';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB, serverSelectionTimeoutMS: 10_000 });
    await Promise.all([User, RefreshToken, Resume, Interview].map((m) => m.init())); // make sure indexes exist
    logger.info(`MongoDB connected (database: ${env.MONGODB_DB})`);
  } catch (err: any) {
    console.error('\nCould not connect to MongoDB Atlas:', err.message);
    console.error('Check these three things:');
    console.error('  1. MONGODB_URI in backend/.env is the full connection string (no < > brackets, password URL-encoded).');
    console.error('  2. Atlas -> Security -> Network Access: add your current IP address (or 0.0.0.0/0 while testing).');
    console.error('  3. Atlas -> Database Access: the user and password are correct.\n');
    process.exit(1);
  }
}

export async function disconnectDb() {
  await mongoose.connection.close();
}

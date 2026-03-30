import mongoose from 'mongoose';
import { mongoUri } from './env';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });

  return mongoose.connection;
}

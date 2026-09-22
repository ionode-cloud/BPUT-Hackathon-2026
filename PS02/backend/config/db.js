import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let memServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heatwaves_edge_ai';

  try {
    // Attempt standard connection with 2s timeout
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Local MongoDB unavailable (${err.message}). Starting MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memServer = await MongoMemoryServer.create();
      const memUri = memServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[Database] In-Memory MongoDB Connected at: ${memUri}`);
      return conn;
    } catch (memErr) {
      console.error('[Database] Failed to initialize MongoMemoryServer:', memErr.message);
      throw memErr;
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memServer) {
    await memServer.stop();
  }
};

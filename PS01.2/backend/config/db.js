const mongoose = require('mongoose');

let isConnecting = false;

const connectWithRetry = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    return;
  }

  if (mongoose.connection.readyState === 1 || isConnecting) {
    return;
  }

  isConnecting = true;
  const options = {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    isConnecting = false;
  } catch (err) {
    isConnecting = false;
    console.warn(`\n⚠️  MongoDB connection failed: ${err.message}`);
    console.warn('👉 If using MongoDB Atlas, check if your current IP is whitelisted in Network Access:');
    console.warn('   https://www.mongodb.com/docs/atlas/security-whitelist/\n');
    console.log('🔄 Will retry connecting to MongoDB in 8 seconds...\n');
    setTimeout(connectWithRetry, 8000);
  }
};

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  setTimeout(connectWithRetry, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

const connectDB = async () => {
  return connectWithRetry();
};

module.exports = connectDB;


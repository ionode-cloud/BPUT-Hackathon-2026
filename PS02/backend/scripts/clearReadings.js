import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import SensorReading from '../models/SensorReading.js';
import Alert from '../models/Alert.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const clearData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const readingsDeleted = await SensorReading.deleteMany({});
    console.log(`Deleted ${readingsDeleted.deletedCount} sensor readings`);

    const alertsDeleted = await Alert.deleteMany({});
    console.log(`Deleted ${alertsDeleted.deletedCount} alerts`);

    console.log('API dummy data successfully wiped from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing data:', err);
    process.exit(1);
  }
};

clearData();

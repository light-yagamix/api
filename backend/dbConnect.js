const mongoose = require("mongoose");

// dotenv is already loaded in server.js before this runs
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error(
    "❌ MONGO_URI is not defined. Check your .env file.\n" +
    "Expected format: MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname"
  );
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log("✅ MongoDB connected successfully");
        return m;
      })
      .catch((err) => {
        console.error(`❌ MongoDB Connection Failed: ${err.message}`);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null; // reset so next call retries
    throw err;
  }
}

module.exports = dbConnect;

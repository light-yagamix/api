const dotenv = require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;


if (!MONGO_URI) {
  throw new Error(
    "❌ MONGO_URI is not defined. Please add MONGO_URI to your .env file.\n" +
    "Example: MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      })
      .then((mongoose) => {
        console.log("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((err) => {
        const errorMsg = `
❌ MongoDB Connection Failed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: ${err.name || "Unknown Error"}
Message: ${err.message}
Time: ${new Date().toISOString()}

Troubleshooting Steps:
1. Verify MONGO_URI in .env file is correct
2. Check your MongoDB Atlas cluster is active
3. Verify IP whitelist allows your connection
4. Check username and password are correct
5. Ensure network connectivity to MongoDB servers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        console.error(errorMsg);
        throw new Error(errorMsg);
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
}

module.exports = dbConnect;
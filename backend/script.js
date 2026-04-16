/**
 * Script to create test tradesman users with specific scores
 *
 * This script creates 4 test tradesman accounts with varying profile completion
 * levels and predefined scores to test the scoring system functionality.
 *
 * Usage: node api/backend/script.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { createHmac, randomBytes } = require("node:crypto");
const UserModel = require("./user/model");
const dbConnect = require("./dbConnect");

// Password hashing function (same as in datasource)
function generateHash(salt, password) {
  const hashedPassword = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return hashedPassword;
}

// Test user data
const testUsers = [
  {
    email: "tradesman2@gmail.com",
    first_name: "Ahmed",
    last_name: "Khan",
    password: "Password@123",
    role: "tradesman",
    gender: "male",
    age: 28,
    score: 40,
    // Missing: cnic, phone, profile_picture, bio, skills
    // This will result in partial profile completion
  },
  {
    email: "tradesman3@gmail.com",
    first_name: "Hassan",
    last_name: "Ali",
    password: "Password@123",
    role: "tradesman",
    gender: "male",
    age: 32,
    phone: "+923001234567",
    score: 50,
    // Missing: cnic, profile_picture, bio, skills
  },
  {
    email: "tradesman4@gmail.com",
    first_name: "Fatima",
    last_name: "Ahmed",
    password: "Password@123",
    role: "tradesman",
    gender: "female",
    age: 26,
    phone: "+923002234567",
    cnic: "12345-6789012-3",
    score: 60,
    bio: "Professional plumber with 5 years experience",
    // Missing: profile_picture, skills
  },
  {
    email: "tradesman5@gmail.com",
    first_name: "Muhammad",
    last_name: "Hassan",
    password: "Password@123",
    role: "tradesman",
    gender: "male",
    age: 35,
    phone: "+923003234567",
    cnic: "98765-4321098-7",
    profile_picture: "https://via.placeholder.com/150",
    bio: "Experienced electrician. Licensed and insured. 8+ years in the field.",
    experience: 8,
    job_counts: 150,
    score: 110,
    verified: ["email"],
    // Nearly complete profile with high score (star badge eligible)
  },
];

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await dbConnect();

    console.log("✓ Connected to MongoDB");

    // Check if users already exist and optionally delete them
    for (const userData of testUsers) {
      const existingUser = await UserModel.findOne({ email: userData.email });
      if (existingUser) {
        console.log(
          `⚠ User with email ${userData.email} already exists. Skipping...`
        );
        continue;
      }

      // Hash password using the same logic as in datasource
      const salt = randomBytes(32).toString("hex");
      const hashedPassword = generateHash(salt, userData.password);

      // Prepare user data with password hash
      const userDataWithPassword = {
        ...userData,
        salt,
        password: hashedPassword,
        verified: userData.verified || ["email"], // Mark email as verified by default
        status: "not-approved", // Default status
        account_status: "active", // Make account active for testing
      };

      // Create the user
      const createdUser = await UserModel.create(userDataWithPassword);

      console.log(`✓ Created user: ${userData.email}`);
      console.log(`  - Name: ${userData.first_name} ${userData.last_name}`);
      console.log(`  - Score: ${userData.score}`);
      console.log(`  - Role: ${userData.role}`);
      console.log(`  - ID: ${createdUser._id}`);
      console.log(
        `  - Profile Completeness: ${getProfileCompleteness(userData)}`
      );
      console.log("");
    }

    console.log("\n✓ Script completed successfully!");
    console.log("\nTest users created:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    testUsers.forEach((user) => {
      console.log(`📧 ${user.email}`);
      console.log(`   Score: ${user.score} | Fields: ${getFieldsStatus(user)}`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\nPassword for all users: Password@123");
    console.log("Role: tradesman");
    console.log("\nYou can now test:");
    console.log("✓ Score-based sorting in tradesmen listings");
    console.log("✓ Score badge display (tradesman5 has score > 100)");
    console.log("✓ Profile completion scoring logic");
    console.log("✓ Subscription plan purchases to increase scores");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test users:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Helper function to show profile completeness
function getProfileCompleteness(user) {
  const fields = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "cnic",
    "profile_picture",
    "bio",
  ];
  const filledFields = fields.filter(
    (field) => user[field] && user[field].trim?.().length > 0
  ).length;
  const percentage = Math.round((filledFields / fields.length) * 100);
  return `${percentage}% (${filledFields}/${fields.length})`;
}

// Helper function to show which fields are filled
function getFieldsStatus(user) {
  const fields = ["first_name", "last_name", "email", "phone", "cnic", "bio"];
  const filled = fields
    .filter((field) => user[field] && user[field].trim?.().length > 0)
    .map((f) => f.charAt(0).toUpperCase() + f.slice(1));
  const missing = fields
    .filter((field) => !user[field] || user[field].trim?.().length === 0)
    .map((f) => `-${f}`);
  return [...filled, ...missing].join(" ");
}

// Run the script
createTestUsers();

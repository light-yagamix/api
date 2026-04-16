const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const UserModel = require("./user/model");
const ServiceModel = require("./service/model");
const servicesJson = require("../backend/assistant/services.json");

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/work";

// Function to generate random score between 10 and 50
function getRandomScore() {
  return Math.floor(Math.random() * (50 - 10 + 1)) + 10;
}

async function addAllServicesToUsers() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully!");

    // Step 1: Fetch all service IDs
    console.log("\n📋 Fetching all services...");
    const services = await ServiceModel.find({}, "_id name").lean();

    if (services.length === 0) {
      console.log("⚠️  No services found in the database!");
      return;
    }

    console.log(`✅ Found ${services.length} services`);
    console.log(
      "Services:",
      services.map((s) => ({ id: s._id, name: s.name })),
    );

    // Step 1.5: Sync service_type from services.json to DB
    console.log("\n🔄 Syncing service_type from services.json to DB...");
    let serviceTypeUpdated = 0;
    for (const jsonService of servicesJson) {
      const serviceId =
        typeof jsonService._id === "object"
          ? jsonService._id.$oid
          : jsonService._id;
      if (!serviceId || !jsonService.service_type) continue;
      const res = await ServiceModel.updateOne(
        { _id: serviceId },
        { $set: { service_type: jsonService.service_type } },
      );
      if (res.modifiedCount > 0) serviceTypeUpdated++;
    }
    console.log(`✅ Updated service_type on ${serviceTypeUpdated} services`);

    // Step 2: Fetch all users
    console.log("\n👥 Fetching all users...");
    const users = await UserModel.find(
      {},
      "_id first_name last_name email role",
    ).lean();

    if (users.length === 0) {
      console.log("⚠️  No users found in the database!");
      return;
    }

    console.log(`✅ Found ${users.length} users`);

    // Step 3: Update each user with all services
    console.log("\n🔄 Starting to update users...\n");

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Create skills_rating array with all services and random scores
        const skillsRating = services.map((service) => ({
          skill_id: service._id,
          rating: getRandomScore(),
          school_id: null,
          student_id: null,
          section_id: null,
        }));

        // Also add service IDs to skills array (just the ObjectIds)
        const skillsArray = services.map((service) => service._id);

        // Update the user
        const result = await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              skills_rating: skillsRating,
              skills: skillsArray,
            },
          },
        );

        if (result.modifiedCount > 0) {
          console.log(
            `✅ Updated user: ${user.first_name} ${user.last_name} (${
              user.email || user.phone || user._id
            })`,
          );
          console.log(`   - Role: ${user.role}`);
          console.log(`   - Added ${skillsRating.length} services with scores`);
          successCount++;
        } else {
          console.log(
            `⚠️  No changes for user: ${user.first_name} ${user.last_name}`,
          );
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user._id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total services found: ${services.length}`);
    console.log(`Total users found: ${users.length}`);
    console.log(`Successfully updated: ${successCount} users`);
    console.log(`Errors: ${errorCount}`);
    console.log(
      `Each user now has ${services.length} services with random scores (10-50)`,
    );
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    console.log("\n🔌 Closing database connection...");
    await mongoose.connection.close();
    console.log("✅ Connection closed. Script completed!");
    process.exit(0);
  }
}

// Run the script
console.log("🚀 Starting script: Add All Services to All Users");
console.log("=".repeat(60));
addAllServicesToUsers();

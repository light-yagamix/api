/**
 * Migration Script: Add tier field to existing subscriptions
 * Run this once to update all existing activeSubscription records with the tier field
 *
 * Usage: node api/backend/subscription/migration-add-tier.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../user/model");

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function migrateTiers() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    console.log("\n📊 Checking for users with activeSubscription...");

    const usersWithSubscriptions = await User.find({
      "activeSubscription.planId": { $exists: true },
    });

    console.log(
      `Found ${usersWithSubscriptions.length} users with active subscriptions`
    );

    if (usersWithSubscriptions.length === 0) {
      console.log("No migrations needed!");
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let alreadyHaveTier = 0;
    let errors = 0;

    for (const user of usersWithSubscriptions) {
      try {
        // Skip if tier already exists
        if (user.activeSubscription.tier) {
          alreadyHaveTier++;
          continue;
        }

        const planId = user.activeSubscription.planId;
        let tier = null;
        let planName = user.activeSubscription.planName;

        // Map old plan IDs to new tiers
        if (planId === "plan-100" || planId === "plan-bronze") {
          tier = "bronze";
          planName = "Bronze";
        } else if (planId === "plan-250" || planId === "plan-silver") {
          tier = "silver";
          planName = "Silver";
        } else if (planId === "plan-500" || planId === "plan-gold") {
          tier = "gold";
          planName = "Gold";
        }

        if (!tier) {
          console.warn(`⚠️  Unknown planId "${planId}" for user ${user._id}`);
          errors++;
          continue;
        }

        // Update the user
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              "activeSubscription.tier": tier,
              "activeSubscription.planName": planName,
              // Optionally update planId to new format
              "activeSubscription.planId": `plan-${tier}`,
            },
          }
        );

        updated++;
        console.log(`✓ Updated user ${user._id}: ${planId} → ${tier} tier`);
      } catch (err) {
        console.error(`✗ Error updating user ${user._id}:`, err.message);
        errors++;
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   Total users checked: ${usersWithSubscriptions.length}`);
    console.log(`   ✓ Updated: ${updated}`);
    console.log(`   ℹ Already had tier: ${alreadyHaveTier}`);
    console.log(`   ✗ Errors: ${errors}`);

    console.log("\n✅ Migration completed!");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateTiers();

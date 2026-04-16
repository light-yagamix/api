const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

// Import models
const MessageModel = require("../backend/tradesmanChat/model");

/**
 * Migration script to add group chat support fields to existing messages
 * Run with: node migrate-add-group-chat-fields.js
 */
async function migrateMessages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Update all existing documents with default values for new fields
    const result = await MessageModel.updateMany(
      {},
      {
        $set: {
          recipients: [],
          participants: [],
          isGroupChat: false,
        },
      }
    );

    console.log("📊 Migration Results:");
    console.log(`   • Documents matched: ${result.matchedCount}`);
    console.log(`   • Documents modified: ${result.modifiedCount}`);

    // Verify migration
    const totalMessages = await MessageModel.countDocuments();
    const messagesWithoutRecipients = await MessageModel.countDocuments({
      recipients: { $exists: false },
    });

    console.log("\n✅ Verification:");
    console.log(`   • Total messages: ${totalMessages}`);
    console.log(`   • Messages without recipients array: ${messagesWithoutRecipients}`);

    if (messagesWithoutRecipients === 0) {
      console.log("\n✅ Migration completed successfully!");
      console.log("   All messages now have group chat support fields.");
    } else {
      console.log(
        "\n⚠️  Warning: Some messages may not have been updated correctly."
      );
    }

    // Log sample of updated document
    const sampleMessage = await MessageModel.findOne().select(
      "sender recipient recipients isGroupChat participants"
    );

    if (sampleMessage) {
      console.log("\n📋 Sample updated message structure:");
      console.log(JSON.stringify(sampleMessage, null, 2));
    }

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateMessages();

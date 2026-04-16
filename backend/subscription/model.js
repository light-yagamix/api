const mongoose = require("mongoose");

const SubscriptionPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: String,
      enum: ["plan-bronze", "plan-silver", "plan-gold"],
    },
    planName: {
      type: String,
      required: true,
      enum: ["Bronze", "Silver", "Gold"],
    },
    tier: {
      type: String,
      required: true,
      enum: ["bronze", "silver", "gold"],
    },
    pointsAdded: {
      type: Number,
      required: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "PKR",
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
SubscriptionPurchaseSchema.index({ userId: 1 });
SubscriptionPurchaseSchema.index({ status: 1 });
SubscriptionPurchaseSchema.index({ expiresAt: 1 });

const SubscriptionPurchaseModel = mongoose.model(
  "SubscriptionPurchase",
  SubscriptionPurchaseSchema
);

module.exports = SubscriptionPurchaseModel;

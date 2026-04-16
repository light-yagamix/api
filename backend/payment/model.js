const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },

    total_charges: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "PKR",
    },

    payment_method: {
      type: String,
      default: "cashOnDelivery",
      enum: ["cashOnDelivery", "online"],
    },

    payment_status: {
      type: String,
      default: "pending",
      enum: ["pending", "completed", "failed"],
    },

    stripe_payment_intent_id: { type: String }, // Main Stripe payment reference
    stripe_charge_id: { type: String }, // Charge ID (used for refunds/receipt)
    stripe_session_id: { type: String }, // Checkout session ID
    stripe_customer_id: { type: String }, // Optional: if using Stripe customers
    stripe_refund_id: { type: String }, // Stripe refund ID
    receipt_url: { type: String }, // Stripe-hosted receipt page
    refund_status: {
      type: String,
      enum: ["none", "pending", "completed", "failed"],
      default: "none",
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingModel",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports =
  mongoose.models.PaymentModel || mongoose.model("PaymentModel", PaymentSchema);

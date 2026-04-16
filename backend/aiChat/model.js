const mongoose = require("mongoose");
const { Schema } = mongoose;

// Extracted booking data schema (embedded in messages)
const extractedDataSchema = new Schema(
  {
    service_id: {
      type: String,
      default: null,
    },
    service_name: { type: String, default: null },
    service_type: {
      type: String,
      enum: ["customer_based", "tradesman_based", null],
      default: null,
    },
    service_option: {
      type: {
        _id: { type: String },
        label: { type: String },
        price: { type: Number },
      },
      default: null,
    },
    problem_description: { type: String, default: null },
    preferred_date: { type: String, default: null },
    start_time: { type: String, default: null },
    end_time: { type: String, default: null },
    duration_hours: { type: Number, default: null },
    number_of_customers: { type: Number, default: null },
    number_of_tradesmen: { type: Number, default: null },
    location: { type: String, default: null },
    booking_mode: {
      type: String,
      enum: ["automatic", "manual", null],
      default: null,
    },
    phase: {
      type: String,
      enum: [
        "initial",
        "greeting",
        "problem_solving",
        "diy_help",
        "time_selection",
        "booking",
      ],
      default: "initial",
    },
    booking_ready: { type: Boolean, default: false },
    allFieldsCollected: { type: Boolean, default: false },
    suggested_options: {
      type: [
        {
          date: String,
          start_time: String,
          end_time: String,
          reason: String,
        },
      ],
      default: [],
    },
    confirmation_status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
  },
  { _id: false },
);

// Conversation Message Schema
const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "ConversationModel",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    image_url: {
      type: String,
      default: null,
    },
    extracted_data: {
      type: extractedDataSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

messageSchema.index({ conversation: 1, created_at: 1 });

// Conversation Schema
const conversationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
      index: true,
    },
    session_id: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "booking_initiated", "booking_completed", "closed"],
      default: "active",
    },
    last_extracted_data: {
      type: extractedDataSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

conversationSchema.index({ status: 1 });
conversationSchema.index({ created_at: -1 });

const ConversationModel =
  mongoose.models.ConversationModel ||
  mongoose.model("ConversationModel", conversationSchema);

const ConversationMessageModel =
  mongoose.models.ConversationMessageModel ||
  mongoose.model("ConversationMessageModel", messageSchema);

module.exports = { ConversationModel, ConversationMessageModel };

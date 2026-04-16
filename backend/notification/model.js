const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
    },
    category: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["delivered", "read", "unread"],
      default: "unread",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    action_url: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ created_at: -1 });

module.exports =
  mongoose.models.NotificationModel ||
  mongoose.model("NotificationModel", NotificationSchema);

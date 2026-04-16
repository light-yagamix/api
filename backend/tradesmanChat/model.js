const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      default: null,
    },
    recipients: [
      {
        type: Schema.Types.ObjectId,
        ref: "UserModel",
      },
    ],
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "UserModel",
      },
    ],
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingModel",
      required: true,
    },
    content: { type: String },
    images: [
      {
        url: { type: String, required: true },
        key: { type: String, required: true },
        width: { type: Number },
        height: { type: Number },
      },
    ],
    offer: {
      amount: Number,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "countered"],
        default: "pending",
      },
      counterOffer: Number,
      terms: String,
    },
    type: {
      type: String,
      enum: ["message", "offer", "image", "system"],
      default: "message",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    conversationId: { type: String },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "MessageModel",
      default: null,
    },
  },
  { timestamps: true }
);
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ sender: 1, recipients: 1 });
messageSchema.index({ conversationId: 1 });
messageSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.MessageModel || mongoose.model("MessageModel", messageSchema);

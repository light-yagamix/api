const mongoose = require("mongoose");
const { Schema } = mongoose;

const ratingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    tradesman: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: "BookingModel",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      required: [true, "Rating is required"],
      index: true,
    },
    comment: {
      type: String,
      maxLength: [500, "Comment must not exceed 500 characters"],
      trim: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Index for efficient queries
ratingSchema.index({ tradesman: 1, created_at: -1 });
ratingSchema.index({ booking: 1 });
ratingSchema.index({ user: 1 });
ratingSchema.index({ rating: 1 });

// Index for finding ratings by tradesman and user (to prevent duplicate ratings)
ratingSchema.index({ tradesman: 1, user: 1, booking: 1 }, { unique: true });

module.exports =
  mongoose.models.RatingModel || mongoose.model("RatingModel", ratingSchema);

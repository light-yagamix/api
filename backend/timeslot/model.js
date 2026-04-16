const mongoose = require("mongoose");

const TimeSlotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    tradesman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingModel",
    },
    booking_id: {
      type: String,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceModel",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

TimeSlotSchema.index({ user: 1 });
TimeSlotSchema.index({ tradesman: 1 });
TimeSlotSchema.index({ booking: 1 });
TimeSlotSchema.index({ service: 1 });
TimeSlotSchema.index({ date: 1 });
TimeSlotSchema.index({ startTime: 1, endTime: 1 });
TimeSlotSchema.index({ created_at: -1 });

module.exports =
  mongoose.models.TimeSlotModel ||
  mongoose.model("TimeSlotModel", TimeSlotSchema);

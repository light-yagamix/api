const mongoose = require("mongoose");

const AddonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
    },
    quantity: {
      type: Number,
    },
    out_of_stock: {
      type: Boolean,
      default: false,
    },
    isReusable: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceModel",
    },
    price_type: {
      type: String,
      required: true,
      enum: ["fixed", "hourly"],
    },
    prices: {
      type: [
        {
          label: { type: String, required: true },
          price: { type: Number, required: true },
        },
      ],
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

AddonSchema.index({ name: 1 });
AddonSchema.index({ supplier: 1 });
AddonSchema.index({ service: 1 });
AddonSchema.index({ status: 1 });
AddonSchema.index({ out_of_stock: 1 });
AddonSchema.index({ price_type: 1 });
AddonSchema.index({ created_at: -1 });

module.exports =
  mongoose.models.AddonModel || mongoose.model("AddonModel", AddonSchema);

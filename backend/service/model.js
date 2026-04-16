const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // required: true,
    },
    description: {
      type: String,
      // required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryModel",
      // required: true,
    },
    sub_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategoryModel",
    },
    tradesman: {
      type: String,
    },
    price_type: {
      type: String,
      // required: true,
      enum: ["fixed", "hourly"],
    },
    service_type: {
      type: String,
      enum: ["customer_based", "tradesman_based"],
      default: "tradesman_based",
    },
    prices: {
      type: [
        {
          label: { type: String, required: true },
          price: { type: Number, required: true },
        },
      ],
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    duration: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      // required: true,
      enum: ["active", "inactive"],
      default: "active",
    },
    visit_type: {
      type: String,
      // required: true,
      trim: true,
    },
    image: {
      type: String,
      // required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    requires_advance_payment: {
      type: Boolean,
      default: false,
    },
    advance_payment_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    keywords: {
      type: [String],
      default: [],
    },
    addons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AddonModel",
      },
    ],
    service_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

ServiceSchema.index({ name: 1 });
ServiceSchema.index({ category: 1 });
ServiceSchema.index({ sub_category: 1 });
ServiceSchema.index({ status: 1 });
ServiceSchema.index({ isFeatured: 1 });
ServiceSchema.index({ price_type: 1 });
ServiceSchema.index({ service_type: 1 });
ServiceSchema.index({ created_at: -1 });

module.exports =
  mongoose.models.ServiceModel || mongoose.model("ServiceModel", ServiceSchema);
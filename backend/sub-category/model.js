const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryModel",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceModel",
      },
    ],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
SubCategorySchema.index({ name: 1 });
SubCategorySchema.index({ category: 1 });
SubCategorySchema.index({ status: 1 });
SubCategorySchema.index({ isFeatured: 1 });
SubCategorySchema.index({ created_at: -1 });
module.exports =
  mongoose.models.SubCategoryModel ||
  mongoose.model("SubCategoryModel", SubCategorySchema);

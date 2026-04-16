const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    banner: {
      type: String,
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
    sub_categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SubCategoryModel" },
    ],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

CategorySchema.index({ name: 1 });
CategorySchema.index({ status: 1 });
CategorySchema.index({ isFeatured: 1 });
CategorySchema.index({ created_at: -1 });

module.exports =
  mongoose.models.CategoryModel ||
  mongoose.model("CategoryModel", CategorySchema);

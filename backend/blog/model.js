const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    date: { type: Date },

    banner: { type: String },
    images: [{ type: String }],

    descriptions: [{ type: String }],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ title: 1 });
blogSchema.index({ date: -1 });
blogSchema.index({ status: 1 });

module.exports =
  mongoose.models.BlogModel || mongoose.model("BlogModel", blogSchema);

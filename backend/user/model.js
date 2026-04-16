const mongoose = require("mongoose");
const { Schema } = mongoose;

const skilsRatingSchema = new Schema({
  school_id: { type: Number },
  student_id: { type: Number },
  section_id: { type: String, maxLength: 100 },
  rating: { type: Number },
  skill_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceModel",
  },
});

const ratingSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "UserModel",
    required: true,
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: "BookingModel",
  },
  rating: {
    type: Number,
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating must be at most 5"],
    required: [true, "Rating is required"],
  },
  comment: {
    type: String,
    maxLength: [500, "Comment must not exceed 500 characters"],
    trim: true,
  },
  created_at: { type: Date, default: Date.now },
});

const addressSchema = new Schema({
  city: { type: String, maxLength: 50 },
  flat: { type: String, maxLength: 100 },
  full_address: { type: String, maxLength: 200 },
  is_default: { type: Boolean, default: false },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
    },
  },
});

const userSchema = new Schema(
  {
    first_name: { type: String, maxLength: 50 },
    last_name: { type: String, maxLength: 50 },
    email: {
      type: String,
      maxLength: 50,
      set: function (v) {
        return v === "" ? null : v;
      },
    },
    age: { type: Number, index: true, default: 0, maxLength: 3 },
    role: {
      type: String,
      default: "user",
      enum: ["tradesman", "admin", "user", "supplier"],
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      index: true,
      default: "male",
    },
    cnic: { type: String, maxLength: 15 },
    profile_picture: { type: String },
    cnic_back_image: { type: String },
    cnic_front_image: { type: String },
    phone: {
      type: String,
      maxLength: 20,
      unique: true,
      sparse: true,
      set: function (v) {
        return v === "" ? null : v;
      },
    },

    student_id: { type: String },
    school_id: { type: String },
    addresses: [addressSchema],
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    verified: [String],
    status: { type: String, default: "not-approved" },
    account_status: { type: String, default: "active" },
    password: { type: String, maxLength: 100 },
    salt: { type: String },
    token: { type: String },
    otp: { type: String },
    otp_expiry: { type: Date },
    deviceTokens: [{ type: String, default: [] }],
    skills_rating: [skilsRatingSchema],
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceModel",
      },
    ],
    job_counts: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    ratings: [ratingSchema],
    avg_rating: { type: Number, default: 0 },
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Legacy score field - kept for backward compatibility, but will use virtual totalScore
    score: { type: Number, default: 0, index: true },

    // New separated score fields
    profileScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 15,
      index: true,
    },
    subscriptionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 500,
    },

    // Active subscription (embedded document - NO separate collection)
    // Three tiers: Bronze, Silver, and Gold
    activeSubscription: {
      planId: {
        type: String,
        enum: [null, "plan-bronze", "plan-silver", "plan-gold"],
        default: null,
      },
      planName: {
        type: String,
        enum: [null, "Bronze", "Silver", "Gold"],
        default: null,
      },
      tier: {
        type: String,
        enum: [null, "bronze", "silver", "gold"],
        default: null,
      },
      points: {
        type: Number,
        default: 0,
      },
      activatedAt: Date,
      expiresAt: Date,
      status: {
        type: String,
        enum: ["active", "expired"],
        default: "active",
      },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $exists: true, $ne: null, $ne: "" } },
  }
);
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { phone: { $exists: true, $ne: null, $ne: "" } },
  }
);

userSchema.index({ first_name: 1 });
userSchema.index({ role: 1 });
userSchema.index({ verified: 1 });
userSchema.index({ status: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ "addresses.location": "2dsphere" });
userSchema.index({ location: "2dsphere" });
userSchema.index({ profileScore: 1 });
userSchema.index({ subscriptionScore: 1 });
userSchema.index({ "activeSubscription.status": 1 });
userSchema.index({ "activeSubscription.expiresAt": 1 });

// Virtual field for total score (profileScore + subscriptionScore)
userSchema.virtual("totalScore").get(function () {
  return (this.profileScore || 0) + (this.subscriptionScore || 0);
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.UserModel || mongoose.model("UserModel", userSchema);

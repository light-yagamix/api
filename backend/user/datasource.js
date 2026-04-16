const UserModel = require("./model");
const { createHmac, randomBytes } = require("node:crypto");
const JWT = require("jsonwebtoken");
const { SendEmail } = require("../notification/utils");
const mongoose = require("mongoose");

const {
  calculateScore,
  getProfileCompletionSummary,
} = require("../utils/scoringUtils");
const {
  getSubscriptionPlan,
  isValidPlan,
} = require("../utils/subscriptionPlans");

function generateHash(salt, password) {
  const hashedPassword = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return hashedPassword;
}

function generateToken(user) {
  if (!user) throw new Error("User not found");

  if (!user.verified) throw new Error("User not verified");

  if (user.account_status !== "active") throw new Error("User not active");

  return JWT.sign(
    {
      _id: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET
  );
}

async function getAllUsers(args) {
  try {
    const {
      page = 1,
      limit,
      sortField = "created_at",
      sortOrder = "asc",
      filters = {},
    } = args;

    const filterConditions = {};
    const exactMatchFields = ["status", "role"];

    // Handle date range filter for created_at
    if (filters.dateRange) {
      const currentDate = new Date();
      let fromDate;

      switch (filters.dateRange) {
        case "last_day":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 1);
          break;
        case "last_week":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 7);
          break;
        case "last_month":
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 1);
          break;
        case "last_3_months":
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 3);
          break;
        case "last_6_months":
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 6);
          break;
        case "last_year":
          fromDate = new Date();
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
        default:
          fromDate = null;
      }

      if (fromDate) {
        filterConditions.created_at = { $gte: fromDate, $lte: currentDate };
      }
    }

    for (let key in filters) {
      if (
        filters[key] !== undefined &&
        filters[key] !== null &&
        key !== "dateRange"
      ) {
        if (key === "skills" && Array.isArray(filters[key])) {
          filterConditions[key] = {
            $in: filters[key].map((id) => new mongoose.Types.ObjectId(id)),
          };
        } else if (key === "verified" && Array.isArray(filters[key])) {
          filterConditions[key] = { $in: filters[key] };
        } else if (Array.isArray(filters[key])) {
          filterConditions[key] = { $in: filters[key] };
        } else if (typeof filters[key] === "string") {
          if (exactMatchFields.includes(key)) {
            filterConditions[key] = filters[key];
          } else {
            filterConditions[key] = { $regex: new RegExp(filters[key], "i") };
          }
        } else {
          filterConditions[key] = filters[key];
        }
      }
    }

    const sortOptions =
      sortField === "score" || sortField === "created_at"
        ? { score: -1, [sortField]: sortOrder === "asc" ? 1 : -1 }
        : { score: -1, [sortField]: sortOrder === "asc" ? 1 : -1 };
    const skip = (page - 1) * (limit || 0);

    const query = UserModel.find(filterConditions)
      .populate("skills")
      .sort(sortOptions);

    if (skip > 0) {
      query.skip(skip);
    }

    if (limit) {
      query.limit(limit);
    }

    const users = await query;
    const totalRecords = await UserModel.countDocuments(filterConditions);
    const totalPages = limit ? Math.ceil(totalRecords / limit) : 1;

    return {
      success: true,
      message: "Users fetched successfully",
      data: users,
      pageInfo: {
        totalRecords,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw new Error(error.message);
  }
}

async function getUserByEmail(email) {
  const user = await UserModel.findOne({ email });
  return user || null;
}

async function getUserByPhone(phone) {
  const user = await UserModel.findOne({ phone });
  return user || null;
}
async function getUserById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const user = await UserModel.findById(id).populate("skills");
    if (!user) throw new Error("User not found");
    return {
      success: true,
      message: "User fetched successfully",
      data: user,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}
async function createUser(args) {
  try {
    // Phone is now restored
    if (args.phone) {
      const userExistByPhone = await getUserByPhone(args.phone);
      if (userExistByPhone) {
        throw new Error("Phone number already exists");
      }
    }

    if (args.email) {
      const userExistByEmail = await getUserByEmail(args.email);
      if (userExistByEmail) {
        throw new Error("Email already exists");
      }
    }

    if (args.password) {
      const salt = randomBytes(32).toString("hex");
      const hashedPassword = generateHash(salt, args.password);
      args = {
        ...args,
        salt,
        password: hashedPassword,
      };
    }

    // Initialize score to 0 for new users
    const userCreateData = {
      ...args,
      score: 0,
    };

    const user = await UserModel.create(userCreateData);

    if (!user) throw new Error("User not created");

    return {
      success: true,
      message: "User created successfully.",
    };
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
}
async function verifyUser(args) {
  try {
    let user;
    let type;

    if (args.email) {
      user = await getUserByEmail(args.email);
      type = "email";
    } else if (args.phone) {
      user = await getUserByPhone(args.phone);
      type = "phone";
    } else {
      throw new Error("Email or phone is required");
    }

    if (!user) throw new Error("User not found");

    if (user.verified?.includes(type)) {
      throw new Error(`${type} already verified`);
    }

    let otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 3600000;

    if (type === "phone") {
      otp = otp.replace(/\d/g, "0");
    }
    await UserModel.findByIdAndUpdate(user._id, {
      otp,
      otp_expiry: otpExpiry,
    });

    if (type === "email") {
      const sent = await SendEmail(args.email, "Verify Email", otp, "otp");
      if (!sent) throw new Error("Failed to send verification email");
    }

    return {
      success: true,
      message: `${type} verification sent successfully`,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function verifyOtp(args) {
  try {
    const { phone, email, otp } = args;

    if (!otp) throw new Error("OTP is required");

    let user, type;

    if (email) {
      user = await getUserByEmail(email);
      type = "email";
    } else if (phone) {
      user = await getUserByPhone(phone);
      type = "phone";
    } else {
      throw new Error("Phone or email is required");
    }

    if (!user) throw new Error("User not found");

    if (user.verified?.includes(type)) {
      throw new Error(`${type} already verified`);
    }

    if (user.otp !== otp) throw new Error("Invalid OTP");
    if (user.otp_expiry < Date.now()) throw new Error("OTP expired");

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      {
        $push: {
          verified: type,
        },
        otp: null,
        otp_expiry: null,
        otp_created_at: null,
        verification_attempts: 0,
      },
      { new: true }
    );

    const token = generateToken(updatedUser);

    return {
      success: true,
      message: `${type} verified successfully`,
      data: {
        verified: true,
        token,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function resendOTP(args) {
  try {
    let user;
    if (args.email) {
      user = await getUserByEmail(args.email);
    } else if (args.phone) {
      user = await getUserByPhone(args.phone);
    } else {
      throw new Error("Email or phone is required");
    }

    if (user.verified) throw new Error("User already verified");

    const MIN_RESEND_DELAY = 60000; // 1 minute
    if (
      user.otp_created_at &&
      Date.now() - user.otp_created_at < MIN_RESEND_DELAY
    ) {
      throw new Error("Please wait before requesting a new OTP");
    }

    const otp = Math.floor(100000 + Math.random() * 900000)
      .toString()
      .replace(/\d/g, "0");

    console.log(otp);

    const otpCreatedAt = Date.now();

    await UserModel.findByIdAndUpdate(user._id, {
      otp,
      otp_expiry: otpCreatedAt + 3600000,
      otp_created_at: otpCreatedAt,
      verification_attempts: 0,
    });

    return {
      success: true,
      message: "New OTP sent successfully",
      data: otp,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateUser(args) {
  try {
    const userResponse = await getUserById(args._id);
    const userExist = userResponse.data;
    console.log("User exists:", userExist);
    if (!userExist) throw new Error("User not found");

    let verified = Array.isArray(userExist.verified)
      ? [...userExist.verified]
      : [];

    console.log("Initial verified array:", verified);

    if (args.email) {
      const userByEmail = await getUserByEmail(args.email);
      if (userByEmail && userByEmail._id.toString() !== args._id.toString()) {
        throw new Error("Email already exists");
      }

      // If email changed, remove email verification
      if (args.email !== userExist.email) {
        verified = verified.filter((v) => v !== "email");
      }
    }

    if (args.phone) {
      const userByPhone = await getUserByPhone(args.phone);
      if (userByPhone && userByPhone._id.toString() !== args._id.toString()) {
        throw new Error("Phone number already exists");
      }

      // If phone changed, remove phone verification
      if (args.phone !== userExist.phone) {
        verified = verified.filter((v) => v !== "phone");
      }
    }

    // Prepare update data
    const updateFields = { ...args };
    delete updateFields._id; // Remove _id from update fields
    updateFields.verified = verified; // Explicitly set verified array

    // Calculate new score based on updated fields
    const mergedUserData = {
      ...(userExist.toObject?.() || userExist),
      ...updateFields,
    };
    const newScore = calculateScore(mergedUserData);
    updateFields.score = newScore;

    console.log("Verified array being saved:", verified);
    console.log("Update fields:", updateFields);
    console.log("New score calculated:", newScore);

    const user = await UserModel.findByIdAndUpdate(args._id, updateFields, {
      new: true,
      runValidators: true,
    });

    return {
      success: true,
      message: "User updated successfully",
      data: user,
    };
  } catch (error) {
    console.error("Update user error:", error);
    throw new Error(error.message);
  }
}

async function getUserToken({ email, phone, password }) {
  try {
    let user;

    if (email) {
      user = await getUserByEmail(email);
    } else if (phone) {
      user = await getUserByPhone(phone);
    } else {
      throw new Error("Email or phone is required");
    }

    if (!user) {
      throw new Error("User not found");
    }

    if (password) {
      const hashedPassword = generateHash(user.salt, password);
      if (hashedPassword !== user.password) {
        throw new Error("Incorrect password");
      }
    }

    if (!user.verified || user.verified.length === 0) {
      // const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otp = "000000";
      const otpExpiry = Date.now() + 3600000;

      await UserModel.findByIdAndUpdate(user._id, {
        otp,
        otp_expiry: otpExpiry,
      });

      await SendEmail(user.email, "OTP Verification", otp, "otp");

      return {
        success: true,
        message: "Please verify your account",
        data: {
          verified: [],
          token: null,
        },
      };
    }

    const token = generateToken(user);

    return {
      success: true,
      message: "Login successful",
      data: {
        verified: [...user.verified],
        token,
      },
    };
  } catch (error) {
    console.error(error);
    throw new Error(
      error.message || "An error occurred while processing the request."
    );
  }
}

async function resendVerificationEmail(args) {
  try {
    const user = await getUserByEmail(args.email);
    if (!user) throw new Error("User not found");
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp = Math.floor(100000 + Math.random() * 900000)
      .toString()
      .replace(/\d/g, "0");
    console.log(otp);
    await SendEmail(args.email, "Verify Email", otp, "otp");

    await UserModel.findByIdAndUpdate(user._id, {
      otp,
      otp_expiry: Date.now() + 3600000,
    });
    return {
      success: true,
      message: "Email sent successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function forgotPassword(args) {
  try {
    const user = await getUserByEmail(args.email);
    if (!user) throw new Error("User not found");
    if (user.otp_expiry > Date.now() + 300000) {
      return {
        success: true,
        message: "OTP sent already",
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(otp);
    console.log(args.email);

    const sent = await SendEmail(args.email, "Reset Password", otp, "otp");
    if (!sent) throw new Error("Failed to send verification email");
    console.log("Email sent status:", sent);

    await UserModel.findByIdAndUpdate(user._id, {
      otp,
      otp_expiry: Date.now() + 3600000, // 1 hour
    });

    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function resetPassword(args) {
  try {
    const user = await getUserByEmail(args.email);
    if (!user) throw new Error("User not found");

    if (args.otp !== user.otp) throw new Error("Invalid OTP");

    if (user.otp_expiry < Date.now()) throw new Error("OTP expired");

    const salt = randomBytes(32).toString("hex");
    const hashedPassword = generateHash(salt, args.password);

    await UserModel.findByIdAndUpdate(user._id, {
      salt,
      password: hashedPassword,
      otp: null,
      otp_expiry: null,
    });

    const token = generateToken(user);

    return {
      success: true,
      message: "Password reset successfully",
      data: token,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function changePassword(args) {
  try {
    const user = await getUserById(args._id);
    if (!user) throw new Error("User not found");

    const userSalt = user.salt;
    const usersHashPassword = generateHash(userSalt, args.old_password);

    if (usersHashPassword !== user.password)
      throw new Error("Incorrect Password");

    const salt = randomBytes(32).toString("hex");
    const hashedPassword = generateHash(salt, args.new_password);

    await UserModel.findByIdAndUpdate(user._id, {
      salt,
      password: hashedPassword,
    });
    return {
      success: true,
      message: "Password Changed Successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteUserById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const user = await UserModel.findById(id);
    if (!user) throw new Error("User not found");
    await UserModel.findByIdAndDelete(id);
    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function addRating(args) {
  try {
    const { userId, bookingId, rating, comment } = args;
    if (!userId) throw new Error("User ID is required");
    if (typeof rating !== "number" || rating < 1 || rating > 5)
      throw new Error("Rating must be between 1 and 5");

    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");

    user.ratings.push({
      user: userId,
      booking: bookingId,
      rating,
      comment,
      created_at: new Date(),
    });

    const totalRatings = user.ratings.reduce((sum, r) => sum + r.rating, 0);
    user.avg_rating = totalRatings / user.ratings.length;

    await user.save();
    return {
      success: true,
      message: "Rating added successfully",
      data: user,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function addSkillsRating(args, userId) {
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $push: { skills_rating: args } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to add skill rating: ${error.message}`);
  }
}

async function addAddress(args, userId) {
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $push: { addresses: args } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to add skill rating: ${error.message}`);
  }
}

async function updateAddress({ userId, addressId, updatedData }) {
  try {
    const updateFields = {};
    for (const key in updatedData) {
      updateFields[`addresses.$.${key}`] = updatedData[key];
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, "addresses._id": addressId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) throw new Error("Address not found");
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update address: ${error.message}`);
  }
}

async function getUsersBySkillIdSorted(args) {
  try {
    const { skillId } = args;

    const users = await UserModel.aggregate([
      {
        $match: {
          skills: new mongoose.Types.ObjectId(skillId),
        },
      },
      {
        $addFields: {
          skills_rating: {
            $filter: {
              input: "$skills_rating",
              as: "sr",
              cond: {
                $eq: ["$$sr.skill_id", new mongoose.Types.ObjectId(skillId)],
              },
            },
          },
        },
      },
      { $match: { "skills_rating.0": { $exists: true } } },
      // Sort by score (descending) as primary ranking factor, then by rating (descending)
      {
        $sort: {
          score: -1,
          "skills_rating.0.rating": -1,
        },
      },
    ]);

    const sortedUsers = users.map((user) => ({
      ...user,
      skills_rating: user.skills_rating.sort((a, b) => b.rating - a.rating),
    }));

    return {
      message: "Users retrieved successfully",
      success: true,
      data: sortedUsers,
    };
  } catch (error) {
    console.error("Error in getUsersBySkillIdSorted:", error);

    // Return error response in the expected format
    return {
      message: error.message || "An error occurred while fetching users",
      success: false,
      data: null,
    };
  }
}
async function deleteAddressById(args) {
  try {
    const { userId, addressId } = args;
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );
    if (!updatedUser) throw new Error("Address not found or user not found");
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to delete address: ${error.message}`);
  }
}
async function saveDeviceToken(userId, token) {
  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");
    if (!user.deviceTokens) user.deviceTokens = [];
    if (!user.deviceTokens.includes(token)) {
      user.deviceTokens.push(token);
      await user.save();
    }
    return {
      success: true,
      message: "Device token saved successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function sendNotification(userId, message) {
  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");
    const notification = {
      id: new mongoose.Types.ObjectId().toString(),
      message,
      userId,
      createdAt: new Date().toISOString(),
    };

    if (user.deviceTokens.length > 0) {
      const payload = {
        notification: {
          title: "New Notification",
          body: message,
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        tokens: user.deviceTokens,
      };
      try {
        const response = await admin.messaging().sendEachForMulticast(payload);
        console.log("FCM Response:", JSON.stringify(response, null, 2));
      } catch (error) {
        console.error("Error sending push notification:", error);
      }
    }
    return {
      success: true,
      message: "Notification sent successfully",
      data: notification,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getTradesmenNearby({
  lat,
  lng,
  radius,
  serviceId,
  page = 1,
  limit = 10,
  sortField = "score",
  sortOrder = "desc",
  minRating,
  maxRating,
  verified,
  online,
}) {
  try {
    console.log("🔍 getTradesmenNearby called with parameters:", {
      lat,
      lng,
      radius,
      serviceId,
      page,
      limit,
      sortField,
      sortOrder,
      minRating,
      maxRating,
      verified,
      online,
    });

    // Input validation
    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      throw new Error("Invalid latitude: must be between -90 and 90");
    }
    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      throw new Error("Invalid longitude: must be between -180 and 180");
    }
    if (typeof radius !== "number" || radius <= 0) {
      throw new Error("Invalid radius: must be a positive number");
    }
    if (!serviceId || typeof serviceId !== "string") {
      throw new Error("Invalid serviceId: must be a non-empty string");
    }

    // Debug: Check if serviceId is valid ObjectId
    let serviceObjectId;
    try {
      serviceObjectId = new mongoose.Types.ObjectId(serviceId);
      console.log("✅ ServiceId converted to ObjectId:", serviceObjectId);
    } catch (err) {
      console.error("❌ Invalid serviceId format:", serviceId);
      throw new Error("Invalid serviceId format: must be a valid ObjectId");
    }

    const radiusInMeters = radius * 1000;
    console.log("📏 Radius in meters:", radiusInMeters);
    console.log("🎯 Center coordinates: [lng, lat]", [lng, lat]);
    console.log("🔍 Coordinate verification:");
    console.log(
      "  - Received lat (should be latitude):",
      lat,
      "valid range: -90 to 90"
    );
    console.log(
      "  - Received lng (should be longitude):",
      lng,
      "valid range: -180 to 180"
    );
    console.log("  - MongoDB query will use: [lng, lat] =", [lng, lat]);

    // Check what status values exist for tradesmen
    const statusValues = await UserModel.distinct("status", {
      role: "tradesman",
    });
    console.log("📊 Available status values for tradesmen:", statusValues);

    const accountStatusValues = await UserModel.distinct("account_status", {
      role: "tradesman",
    });
    console.log(
      "📊 Available account_status values for tradesmen:",
      accountStatusValues
    );

    // Check online status distribution
    const onlineCount = await UserModel.countDocuments({
      role: "tradesman",
      online: true,
    });
    const offlineCount = await UserModel.countDocuments({
      role: "tradesman",
      online: false,
    });
    const noOnlineField = await UserModel.countDocuments({
      role: "tradesman",
      online: { $exists: false },
    });
    console.log("🔌 Online status distribution:");
    console.log("  - Online: true:", onlineCount);
    console.log("  - Online: false:", offlineCount);
    console.log("  - No online field:", noOnlineField);

    // Build filter conditions with debugging - More flexible status filtering
    const filterConditions = {
      role: "tradesman",
      // Use more flexible status filtering - include common approval statuses
      $or: [
        { status: "approved" },
        { status: "active" },
        { status: { $exists: false } }, // Handle missing status field
        { status: null },
      ],
      account_status: { $ne: "inactive" }, // Allow active or undefined account_status
      skills: serviceObjectId,
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInMeters / 6378100],
        },
      },
    };

    // Apply optional rating filter
    if (minRating !== undefined || maxRating !== undefined) {
      filterConditions.avg_rating = {};
      if (minRating !== undefined) {
        filterConditions.avg_rating.$gte = minRating;
      }
      if (maxRating !== undefined) {
        filterConditions.avg_rating.$lte = maxRating;
      }
      console.log("⭐ Rating filter applied:", filterConditions.avg_rating);
    }

    // Apply optional verified filter
    if (verified === true) {
      filterConditions.verified = {
        $exists: true,
        $type: "array",
        $ne: [],
      };
      console.log(
        "✓ Verified filter applied: must have verified array with values"
      );
    }

    // Apply optional online filter
    if (online === true) {
      filterConditions.online = true;
      console.log("🔌 Online filter applied: online = true");
    }

    console.log(
      "🔎 Filter conditions:",
      JSON.stringify(filterConditions, null, 2)
    );

    // Check total tradesmen with this skill (without location filter)
    const totalWithSkill = await UserModel.countDocuments({
      role: "tradesman",
      $or: [
        { status: "approved" },
        { status: "active" },
        { status: { $exists: false } },
        { status: null },
      ],
      account_status: { $ne: "inactive" },
      skills: serviceObjectId,
    });
    console.log("👥 Total tradesmen with skill:", totalWithSkill);

    // Check tradesmen with location data
    const withLocation = await UserModel.countDocuments({
      role: "tradesman",
      $or: [
        { status: "approved" },
        { status: "active" },
        { status: { $exists: false } },
        { status: null },
      ],
      account_status: { $ne: "inactive" },
      skills: serviceObjectId,
      location: { $exists: true, $ne: null },
      "location.coordinates": { $exists: true, $ne: [] },
    });
    console.log("📍 Tradesmen with location data:", withLocation);

    // Debug: Show actual tradesmen with location
    const sampleTradesmen = await UserModel.find({
      role: "tradesman",
      $or: [
        { status: "approved" },
        { status: "active" },
        { status: { $exists: false } },
        { status: null },
      ],
      account_status: { $ne: "inactive" },
      skills: serviceObjectId,
      location: { $exists: true, $ne: null },
      "location.coordinates": { $exists: true, $ne: [] },
    })
      .select("first_name online status account_status location skills")
      .limit(3)
      .lean();

    console.log("🔍 Sample tradesmen with location:");
    sampleTradesmen.forEach((t, i) => {
      const coords = t.location?.coordinates || [];
      console.log(`  ${i + 1}. ${t.first_name}:`, {
        online: t.online,
        status: t.status,
        account_status: t.account_status,
        coordinates:
          coords.length === 2 ? `[${coords[0]}, ${coords[1]}]` : "invalid",
        distance:
          coords.length === 2
            ? calculateDistance(lat, lng, coords[1], coords[0]).toFixed(2) +
              "km"
            : "N/A",
        skillCount: t.skills?.length || 0,
      });
    });

    // Helper function to calculate distance
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the Earth in kilometers
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Build sort options with debugging
    const sortOptions = {};

    // Primary sort by score (always descending to show highest score first)
    sortOptions.score = -1;

    // Add secondary sort for tie-breaking when scores are equal
    if (sortField !== "score") {
      sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;
      console.log(
        `📊 Sort: Primary=score(desc), Secondary=${sortField}(${sortOrder})`
      );
    } else {
      // If sortField is score, just use the provided sortOrder
      sortOptions.score = sortOrder === "asc" ? 1 : -1;
      console.log(`📊 Sort: score(${sortOrder}) only`);
    }

    console.log("📊 Sort options:", sortOptions);

    const skip = (page - 1) * limit;
    console.log("⏭️ Pagination - Skip:", skip, "Limit:", limit);

    // Execute queries with debugging
    const [users, totalRecords] = await Promise.all([
      UserModel.find(filterConditions)
        .select(
          "_id first_name last_name profile_picture email age phone cnic avg_rating job_counts experience verified status online lastSeen location addresses skills score account_status"
        )
        .populate("skills", "name")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filterConditions),
    ]);

    console.log("📋 Query results:");
    console.log("- Found users:", users.length);
    console.log("- Total records:", totalRecords);

    // Debug first user if exists
    if (users.length > 0) {
      const firstUser = users[0];
      console.log("👤 First user details:", {
        id: firstUser._id,
        name: firstUser.first_name,
        online: firstUser.online,
        status: firstUser.status,
        account_status: firstUser.account_status,
        location: firstUser.location,
        skills: firstUser.skills,
        score: firstUser.score,
      });
    }

    const totalPages = Math.ceil(totalRecords / limit);

    const result = {
      success: true,
      message: `Found ${totalRecords} tradesmen nearby`,
      data: users.map((user) => ({
        ...user,
        price: 1000, // Default price - you might want to remove this
      })),
      pageInfo: {
        totalRecords,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    console.log("✅ Returning result:", {
      success: result.success,
      message: result.message,
      dataCount: result.data.length,
      pageInfo: result.pageInfo,
    });

    return result;
  } catch (error) {
    console.error("❌ getTradesmenNearby error:", error);
    throw new Error(error.message);
  }
}

async function purchaseSubscription(userId, planId) {
  try {
    // Validate plan exists
    if (!isValidPlan(planId)) {
      throw new Error("Invalid subscription plan");
    }

    const plan = getSubscriptionPlan(planId);
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // Get user
    const userResponse = await getUserById(userId);
    const user = userResponse.data;
    if (!user) {
      throw new Error("User not found");
    }

    // Add points to user score
    const currentScore = user.score || 0;
    const newScore = currentScore + plan.points;

    // Update user with new score
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { score: newScore },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error("Failed to update user score");
    }

    return {
      success: true,
      message: `Successfully purchased ${plan.name} plan! +${plan.points} points added to your score.`,
      data: {
        userId,
        planId,
        pointsAdded: plan.points,
        newScore,
        purchasedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Purchase subscription error:", error);
    throw new Error(error.message);
  }
}

module.exports.UserService = {
  getUserToken,
  createUser,
  updateUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  resendOTP,
  verifyUser,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getAllUsers,
  deleteUserById,
  verifyOtp,
  addSkillsRating,
  updateAddress,
  deleteAddressById,
  addAddress,
  getUsersBySkillIdSorted,
  getTradesmenNearby,
  saveDeviceToken,
  sendNotification,
  purchaseSubscription,
};

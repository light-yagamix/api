const RatingModel = require("./model");
const UserModel = require("../user/model");
const BookingModel = require("../booking/model");

async function createRating(userId, bookingId, rating, comment, isAnonymous) {
  try {
    // Validate inputs
    if (!userId || !bookingId) {
      throw new Error("User ID and Booking ID are required");
    }

    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Get booking to find the tradesman
    const booking = await BookingModel.findById(bookingId).populate(
      "tradesman"
    );

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Verify the user is the one who made the booking
    if (booking.user.toString() !== userId) {
      throw new Error("You can only rate bookings you created");
    }

    // Check if booking is completed
    // if (
    //   booking.status !== "completed" ||
    //   booking.status !== "completedByUser" ||
    //   booking.status !== "completedByTradesman"
    // ) {
    //   throw new Error("You can only rate completed bookings");
    // }

    // Get the tradesman (should be first one if multiple)
    const tradesmanId = Array.isArray(booking.tradesman)
      ? booking.tradesman[0]?._id
      : booking.tradesman;

    if (!tradesmanId) {
      throw new Error("No tradesman found for this booking");
    }

    // Check if rating already exists for this booking
    const existingRating = await RatingModel.findOne({
      booking: bookingId,
      user: userId,
    });

    if (existingRating) {
      throw new Error("You have already rated this booking");
    }

    // Create new rating
    const newRating = new RatingModel({
      user: userId,
      tradesman: tradesmanId,
      booking: bookingId,
      rating,
      comment: comment || null,
      isAnonymous: isAnonymous || false,
      status: "approved",
    });

    await newRating.save();

    // Update tradesman's average rating
    await updateTradesmanRatingStats(tradesmanId);

    // Populate the rating with user and tradesman details
    const populatedRating = await RatingModel.findById(newRating._id)
      .populate("user", "first_name last_name profile_picture")
      .populate("tradesman", "first_name last_name profile_picture")
      .populate("booking");

    return {
      success: true,
      message: "Thank you! Your rating has been submitted successfully.",
      data: populatedRating,
    };
  } catch (error) {
    console.error("Create rating error:", error);
    throw new Error(error.message);
  }
}

async function updateRating(userId, ratingId, rating, comment) {
  try {
    // Get the rating
    const existingRating = await RatingModel.findById(ratingId);

    if (!existingRating) {
      throw new Error("Rating not found");
    }

    // Verify the user is the one who created the rating
    if (existingRating.user.toString() !== userId) {
      throw new Error("You can only update your own ratings");
    }

    // Update the rating
    if (rating) {
      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }
      existingRating.rating = rating;
    }

    if (comment !== undefined) {
      existingRating.comment = comment;
    }

    await existingRating.save();

    // Update tradesman's average rating
    await updateTradesmanRatingStats(existingRating.tradesman);

    const updatedRating = await RatingModel.findById(ratingId)
      .populate("user", "first_name last_name profile_picture")
      .populate("tradesman", "first_name last_name profile_picture")
      .populate("booking");

    return {
      success: true,
      message: "Rating updated successfully",
      data: updatedRating,
    };
  } catch (error) {
    console.error("Update rating error:", error);
    throw new Error(error.message);
  }
}

async function deleteRating(userId, ratingId) {
  try {
    // Get the rating
    const rating = await RatingModel.findById(ratingId);

    if (!rating) {
      throw new Error("Rating not found");
    }

    // Verify the user is the one who created the rating (or admin)
    if (rating.user.toString() !== userId) {
      throw new Error("You can only delete your own ratings");
    }

    const tradesmanId = rating.tradesman;

    // Delete the rating
    await RatingModel.findByIdAndDelete(ratingId);

    // Update tradesman's average rating
    await updateTradesmanRatingStats(tradesmanId);

    return {
      success: true,
      message: "Rating deleted successfully",
    };
  } catch (error) {
    console.error("Delete rating error:", error);
    throw new Error(error.message);
  }
}

async function getTradesmanRatings(tradesmanId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;

    const ratings = await RatingModel.find({
      tradesman: tradesmanId,
      status: "approved",
    })
      .populate("user", "first_name last_name profile_picture")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RatingModel.countDocuments({
      tradesman: tradesmanId,
      status: "approved",
    });

    return {
      success: true,
      message: "Ratings retrieved successfully",
      data: ratings,
      pageInfo: {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Get tradesman ratings error:", error);
    throw new Error(error.message);
  }
}

async function getRatingById(ratingId) {
  try {
    const rating = await RatingModel.findById(ratingId)
      .populate("user", "first_name last_name profile_picture")
      .populate("tradesman", "first_name last_name profile_picture")
      .populate("booking");

    if (!rating) {
      throw new Error("Rating not found");
    }

    return {
      success: true,
      message: "Rating retrieved successfully",
      data: rating,
    };
  } catch (error) {
    console.error("Get rating by ID error:", error);
    throw new Error(error.message);
  }
}

async function getBookingRating(bookingId) {
  try {
    const rating = await RatingModel.findOne({ booking: bookingId })
      .populate("user", "first_name last_name profile_picture")
      .populate("tradesman", "first_name last_name profile_picture")
      .populate("booking");

    if (!rating) {
      return {
        success: false,
        message: "No rating found for this booking",
        data: null,
      };
    }

    return {
      success: true,
      message: "Rating retrieved successfully",
      data: rating,
    };
  } catch (error) {
    console.error("Get booking rating error:", error);
    throw new Error(error.message);
  }
}

async function getUserRatingsGiven(userId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;

    const ratings = await RatingModel.find({ user: userId })
      .populate("tradesman", "first_name last_name profile_picture")
      .populate("booking")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RatingModel.countDocuments({ user: userId });

    return {
      success: true,
      message: "User ratings retrieved successfully",
      data: ratings,
      pageInfo: {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Get user ratings error:", error);
    throw new Error(error.message);
  }
}

async function getTradesmanRatingStats(tradesmanId) {
  try {
    const ratings = await RatingModel.find({
      tradesman: tradesmanId,
      status: "approved",
    });

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: {
          fiveStar: 0,
          fourStar: 0,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        },
        recentRatings: [],
      };
    }

    // Calculate average
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    // Calculate distribution
    const distribution = {
      fiveStar: ratings.filter((r) => r.rating === 5).length,
      fourStar: ratings.filter((r) => r.rating === 4).length,
      threeStar: ratings.filter((r) => r.rating === 3).length,
      twoStar: ratings.filter((r) => r.rating === 2).length,
      oneStar: ratings.filter((r) => r.rating === 1).length,
    };

    // Get recent ratings
    const recentRatings = await RatingModel.find({
      tradesman: tradesmanId,
      status: "approved",
    })
      .populate("user", "first_name last_name profile_picture")
      .sort({ created_at: -1 })
      .limit(5);

    return {
      totalRatings: ratings.length,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingDistribution: distribution,
      recentRatings,
    };
  } catch (error) {
    console.error("Get tradesman rating stats error:", error);
    throw new Error(error.message);
  }
}

async function updateTradesmanRatingStats(tradesmanId) {
  try {
    const stats = await getTradesmanRatingStats(tradesmanId);

    // Update user's avg_rating
    await UserModel.findByIdAndUpdate(
      tradesmanId,
      { avg_rating: stats.averageRating },
      { new: true }
    );

    return stats;
  } catch (error) {
    console.error("Update tradesman rating stats error:", error);
    throw new Error(error.message);
  }
}

async function markRatingHelpful(ratingId) {
  try {
    const rating = await RatingModel.findByIdAndUpdate(
      ratingId,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!rating) {
      throw new Error("Rating not found");
    }

    return {
      success: true,
      message: "Rating marked as helpful",
    };
  } catch (error) {
    console.error("Mark rating helpful error:", error);
    throw new Error(error.message);
  }
}

async function markRatingNotHelpful(ratingId) {
  try {
    const rating = await RatingModel.findByIdAndUpdate(
      ratingId,
      { $inc: { notHelpful: 1 } },
      { new: true }
    );

    if (!rating) {
      throw new Error("Rating not found");
    }

    return {
      success: true,
      message: "Rating marked as not helpful",
    };
  } catch (error) {
    console.error("Mark rating not helpful error:", error);
    throw new Error(error.message);
  }
}

module.exports.datasource = {
  createRating,
  updateRating,
  deleteRating,
  getTradesmanRatings,
  getRatingById,
  getBookingRating,
  getUserRatingsGiven,
  getTradesmanRatingStats,
  updateTradesmanRatingStats,
  markRatingHelpful,
  markRatingNotHelpful,
};

module.exports.RatingService = {
  createRating,
  updateRating,
  deleteRating,
  getTradesmanRatings,
  getRatingById,
  getBookingRating,
  getUserRatingsGiven,
  getTradesmanRatingStats,
  updateTradesmanRatingStats,
  markRatingHelpful,
  markRatingNotHelpful,
};

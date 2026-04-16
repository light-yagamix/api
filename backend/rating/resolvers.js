const { RatingService } = require("./datasource");
const authorize = require("../authorize");

const queries = {
  getTradesmanRatings: async (parent, args) => {
    try {
      return await RatingService.getTradesmanRatings(
        args.tradesmanId,
        args.page,
        args.limit
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
        pageInfo: {
          totalRecords: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  },

  getRatingById: async (parent, args) => {
    try {
      return await RatingService.getRatingById(args.ratingId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  getTradesmanRatingStats: async (parent, args) => {
    try {
      return await RatingService.getTradesmanRatingStats(args.tradesmanId);
    } catch (error) {
      console.error("Get rating stats error:", error);
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
  },

  getUserRatingsGiven: authorize("GET_USER_BY_ID")(
    async (parent, args, context) => {
      try {
        if (!context.user) throw new Error("You are not logged in");

        return await RatingService.getUserRatingsGiven(
          context.user._id,
          args.page,
          args.limit
        );
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: [],
          pageInfo: {
            totalRecords: 0,
            totalPages: 0,
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }
    }
  ),

  getBookingRating: async (parent, args) => {
    try {
      return await RatingService.getBookingRating(args.bookingId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },
};

const mutations = {
  createRating: authorize("CREATE_BOOKING")(async (parent, args, context) => {
    try {
      if (!context.user) throw new Error("You are not logged in");
      if (!args.bookingId) throw new Error("Booking ID is required");
      if (!args.rating) throw new Error("Rating is required");
      if (args.rating < 1 || args.rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      return await RatingService.createRating(
        context.user._id,
        args.bookingId,
        args.rating,
        args.comment,
        args.isAnonymous
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }),

  updateRating: authorize("CREATE_BOOKING")(async (parent, args, context) => {
    try {
      if (!context.user) throw new Error("You are not logged in");
      if (!args.ratingId) throw new Error("Rating ID is required");

      return await RatingService.updateRating(
        context.user._id,
        args.ratingId,
        args.rating,
        args.comment
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }),

  deleteRating: authorize("CREATE_BOOKING")(async (parent, args, context) => {
    try {
      if (!context.user) throw new Error("You are not logged in");
      if (!args.ratingId) throw new Error("Rating ID is required");

      return await RatingService.deleteRating(context.user._id, args.ratingId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }),

  markRatingHelpful: async (parent, args) => {
    try {
      if (!args.ratingId) throw new Error("Rating ID is required");

      return await RatingService.markRatingHelpful(args.ratingId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  markRatingNotHelpful: async (parent, args) => {
    try {
      if (!args.ratingId) throw new Error("Rating ID is required");

      return await RatingService.markRatingNotHelpful(args.ratingId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

module.exports.resolvers = {
  queries,
  mutations,
};

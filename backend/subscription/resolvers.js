const subscriptionService = require("./datasource");

const queries = {
  getUserSubscriptions: async (parent, { userId }) => {
    return await subscriptionService.getUserSubscriptions(userId);
  },

  getActiveSubscription: async (parent, { userId }) => {
    return await subscriptionService.getActiveSubscription(userId);
  },
};

const mutations = {
  purchaseSubscription: async (parent, { userId, planId }, context) => {
    try {
      // Verify authentication
      if (!context.user) {
        throw new Error("You must be logged in to purchase subscriptions");
      }

      // Verify user can only purchase for themselves or admin can purchase for anyone
      if (
        context.user._id.toString() !== userId &&
        context.user.role !== "admin"
      ) {
        throw new Error("You can only purchase subscriptions for yourself");
      }

      return await subscriptionService.purchaseSubscription(userId, planId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  cancelSubscription: async (parent, { subscriptionId }, context) => {
    try {
      // Verify authentication
      if (!context.user) {
        throw new Error("You must be logged in to cancel subscriptions");
      }

      // Additional authorization could be added here to verify the subscription belongs to the user
      return await subscriptionService.cancelSubscription(subscriptionId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },
};

const subscriptionResolvers = {
  Query: queries,
  Mutation: mutations,
};

module.exports = subscriptionResolvers;

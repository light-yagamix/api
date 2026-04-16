const User = require("../user/model");
const {
  getSubscriptionPlan,
  isValidPlan,
} = require("../utils/subscriptionPlans");

class SubscriptionService {
  /**
   * Purchase a subscription plan
   * Updates user's activeSubscription and subscriptionScore
   * DOES NOT save to SubscriptionPurchase collection
   */
  async purchaseSubscription(userId, planId) {
    try {
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Validate plan exists
      if (!isValidPlan(planId)) {
        throw new Error("Invalid subscription plan");
      }

      const plan = getSubscriptionPlan(planId);

      // Calculate expiration date (30 days from now)
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Calculate new scores
      const profileScore = user.profileScore || 0;
      const newTotalScore = profileScore + plan.points;

      // Update user with new subscription (embedded in user document)
      const updateData = {
        activeSubscription: {
          planId: plan.id,
          planName: plan.name,
          tier: plan.tier,
          points: plan.points,
          activatedAt: now,
          expiresAt: expiresAt,
          status: "active",
        },
        subscriptionScore: plan.points,
        score: newTotalScore, // Update legacy score field for backward compatibility
      };

      await User.findByIdAndUpdate(userId, updateData);

      // Use the calculated total score for response
      const newScore = newTotalScore;

      return {
        success: true,
        message: `${plan.name} subscription purchased successfully! +${plan.points} points added.`,
        data: {
          userId,
          planId: plan.id,
          tier: plan.tier,
          pointsAdded: plan.points,
          newScore, // This matches the GraphQL schema field name
          purchasedAt: now.toISOString(),
        },
      };
    } catch (error) {
      console.error("Error purchasing subscription:", error);
      return {
        success: false,
        message: error.message || "Failed to purchase subscription",
        data: null,
      };
    }
  }

  /**
   * Get user's active subscription
   */
  async getActiveSubscription(userId) {
    try {
      const user = await User.findById(userId)
        .select("activeSubscription subscriptionScore")
        .lean();

      if (!user || !user.activeSubscription) {
        return null;
      }

      // Check if subscription is still active
      const now = new Date();
      if (user.activeSubscription.expiresAt < now) {
        // Expired, return null
        return null;
      }

      return user.activeSubscription;
    } catch (error) {
      console.error("Error getting active subscription:", error);
      return null;
    }
  }

  /**
   * Get all active subscriptions (for admin dashboard)
   * Queries users with active subscriptions, not a separate collection
   */
  async getAllActiveSubscriptions(filters = {}) {
    try {
      const now = new Date();

      const query = {
        "activeSubscription.status": "active",
        "activeSubscription.expiresAt": { $gt: now },
      };

      // Add optional filters
      if (filters.planId) {
        query["activeSubscription.planId"] = filters.planId;
      }

      const users = await User.find(query)
        .select(
          "first_name last_name email phone profileScore subscriptionScore activeSubscription created_at"
        )
        .sort({ "activeSubscription.activatedAt": -1 })
        .lean();

      // Transform to include totalScore
      const subscriptions = users.map((user) => ({
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        profileScore: user.profileScore || 0,
        subscriptionScore: user.subscriptionScore || 0,
        totalScore: (user.profileScore || 0) + (user.subscriptionScore || 0),
        activeSubscription: user.activeSubscription,
        userCreatedAt: user.created_at,
      }));

      return {
        success: true,
        message: "Active subscriptions retrieved successfully",
        data: subscriptions,
      };
    } catch (error) {
      console.error("Error getting all active subscriptions:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve subscriptions",
        data: [],
      };
    }
  }

  /**
   * Cancel a subscription (set to expired and remove points)
   */
  async cancelSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (
        !user.activeSubscription ||
        user.activeSubscription.status !== "active"
      ) {
        throw new Error("No active subscription to cancel");
      }

      // Calculate new score (just profileScore, no subscription points)
      const profileScore = user.profileScore || 0;

      // Update user: mark subscription as expired and remove points
      await User.findByIdAndUpdate(userId, {
        "activeSubscription.status": "expired",
        subscriptionScore: 0,
        score: profileScore, // Update legacy score field
      });

      return {
        success: true,
        message: "Subscription cancelled successfully",
        data: null,
      };
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return {
        success: false,
        message: error.message || "Failed to cancel subscription",
        data: null,
      };
    }
  }

  /**
   * Expire old subscriptions (cron job / utility function)
   * Finds all users with expired subscriptions and updates them
   */
  async expireOldSubscriptions() {
    try {
      const now = new Date();

      // Find all users with expired subscriptions
      const usersToExpire = await User.find({
        "activeSubscription.status": "active",
        "activeSubscription.expiresAt": { $lt: now },
      });

      let expiredCount = 0;

      // Update each user individually to properly set score = profileScore
      for (const user of usersToExpire) {
        const profileScore = user.profileScore || 0;

        await User.findByIdAndUpdate(user._id, {
          "activeSubscription.status": "expired",
          subscriptionScore: 0,
          score: profileScore, // Reset to just profile score
        });

        expiredCount++;
      }

      console.log(`Expired ${expiredCount} old subscriptions`);
      return {
        success: true,
        message: `Expired ${expiredCount} subscriptions`,
        count: expiredCount,
      };
    } catch (error) {
      console.error("Error expiring old subscriptions:", error);
      throw error;
    }
  }

  /**
   * Upgrade or change subscription plan
   */
  async changeSubscription(userId, newPlanId) {
    try {
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Validate new plan
      if (!isValidPlan(newPlanId)) {
        throw new Error("Invalid subscription plan");
      }

      const newPlan = getSubscriptionPlan(newPlanId);

      // Cancel current subscription if exists (remove old points)
      // Then activate new subscription
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Calculate new total score
      const profileScore = user.profileScore || 0;
      const totalScore = profileScore + newPlan.points;

      const updateData = {
        activeSubscription: {
          planId: newPlan.id,
          planName: newPlan.name,
          points: newPlan.points,
          activatedAt: now,
          expiresAt: expiresAt,
          status: "active",
        },
        subscriptionScore: newPlan.points,
        score: totalScore, // Update legacy score field
      };

      await User.findByIdAndUpdate(userId, updateData);

      return {
        success: true,
        message: `Subscription changed to ${newPlan.name} successfully!`,
        data: {
          userId,
          planId: newPlan.id,
          pointsAdded: newPlan.points,
          profileScore,
          subscriptionScore: newPlan.points,
          totalScore,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error) {
      console.error("Error changing subscription:", error);
      return {
        success: false,
        message: error.message || "Failed to change subscription",
        data: null,
      };
    }
  }
}

module.exports = new SubscriptionService();

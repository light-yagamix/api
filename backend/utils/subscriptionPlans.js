/**
 * Backend Subscription Plans Configuration
 * Defines the available subscription plans for tradesmen to boost their score
 * Three tiers: Bronze, Silver, and Gold
 */

const SUBSCRIPTION_PLANS = {
  "plan-bronze": {
    id: "plan-bronze",
    name: "Bronze",
    tier: "bronze",
    points: 100,
    priceMonthly: 2000,
    currency: "PKR",
    description: "Get 100 bonus points to boost your visibility",
  },
  "plan-silver": {
    id: "plan-silver",
    name: "Silver",
    tier: "silver",
    points: 250,
    priceMonthly: 4500,
    currency: "PKR",
    description: "Get 250 bonus points + reach top listings",
    popular: true,
  },
  "plan-gold": {
    id: "plan-gold",
    name: "Gold",
    tier: "gold",
    points: 500,
    priceMonthly: 8000,
    currency: "PKR",
    description: "Get 500 bonus points + featured placement",
  },
};

/**
 * Get subscription plan by ID
 */
function getSubscriptionPlan(planId) {
  return SUBSCRIPTION_PLANS[planId];
}

/**
 * Validate plan exists
 */
function isValidPlan(planId) {
  return planId in SUBSCRIPTION_PLANS;
}

/**
 * Get all subscription plans
 */
function getAllSubscriptionPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  isValidPlan,
  getAllSubscriptionPlans,
};

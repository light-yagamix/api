const subscriptionTypeDefs = `#graphql
  type SubscriptionPlan {
    _id: ID!
    userId: String!
    planId: String
    planName: String!
    tier: String!
    pointsAdded: Int!
    priceMonthly: Float!
    currency: String!
    purchasedAt: String!
    expiresAt: String!
    status: SubscriptionStatus!
    createdAt: String!
    updatedAt: String!
  }

  enum SubscriptionStatus {
    active
    expired
    cancelled
  }

  enum SubscriptionTier {
    bronze
    silver
    gold
  }

  type SubscriptionHistory {
    success: Boolean!
    message: String!
    data: [SubscriptionPlan!]
  }

  type ActiveSubscription {
    planId: String
    planName: String
    tier: String   
    points: Int
    activatedAt: String
    expiresAt: String
    status: String
  }
`;

module.exports = subscriptionTypeDefs;

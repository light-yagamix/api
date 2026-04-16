const queries = `#graphql
  getUserSubscriptions(userId: String!): SubscriptionHistory!
  getActiveSubscription(userId: String!): SubscriptionPlan
`;

module.exports = { queries };

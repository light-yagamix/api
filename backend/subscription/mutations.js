const mutations = `#graphql
  purchaseSubscription(userId: String!, planId: String!): PurchaseSubscriptionResponse!
  cancelSubscription(subscriptionId: String!): PurchaseSubscriptionResponse!
`;

module.exports = { mutations };

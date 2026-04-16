const mutations = `#graphql

  CreateCheckoutSession(user_id: ID!, total_charges: Float!, currency: String!, bookingId: ID!): 
  PaymentResponse
  createRefund(paymentId: ID!, amount: Float!): RefundResponse
`;
module.exports.mutations = mutations;

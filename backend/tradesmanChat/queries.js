const queries = `#graphql
  getTradesmanConversations(user: String!): TradesmanConversationsResponse
  getTradesmanMessages(filters: TradesmanMessageFilterInput): TradesmanMessagesResponse
  getOrCreateBookingChat(bookingId: String!, userId: String): BookingChatResponse
`;

module.exports.queries = queries;

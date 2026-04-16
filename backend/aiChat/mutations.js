const mutations = `#graphql
  createConversation(userId: String, sessionId: String): AIConversationResponse!
  sendBookingMessage(conversationId: String!, message: String!): BookingAIResponse!
  sendBookingMessageWithImage(conversationId: String!, message: String, imageUrl: String!): BookingAIResponse!
  updateConversationStatus(id: String!, status: String!): AIConversationResponse!
  closeConversation(id: String!): AIConversationResponse!
  confirmAutomaticBooking(conversationId: String!, location: String, lat: Float, lng: Float): BookingAIResponse!
`;

module.exports.mutations = mutations;

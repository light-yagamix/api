const mutations = `#graphql
  sendTradesmanMessage(
    content: String!
    images: [MessageImageInput]
    recipient: String!
    booking: String!
    replyTo: String
  ): TradesmanMessagesResponse

  sendTradesmanGroupMessage(
    content: String!
    images: [MessageImageInput]
    recipients: [String!]!
    booking: String!
    replyTo: String
  ): TradesmanMessagesResponse

  createTradesmanGroupChat(
    participants: [String!]!
    booking: String!
    groupName: String
  ): TradesmanGroupChatResponse
`;

module.exports.mutations = mutations;

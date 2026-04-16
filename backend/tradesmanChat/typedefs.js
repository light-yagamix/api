const typedefs = `
  type TradesmanOffer {
    amount: Float
    status: String
    counterOffer: Float
    terms: String
  }

  type TradesmanMessageImage {
    url: String!
    key: String!
    width: Int
    height: Int
  }

  type TradesmanMessage {
    _id: ID
    sender: User
    recipient: User
    recipients: [User]
    participants: [User]
    booking: Booking
    content: String
    images: [TradesmanMessageImage]
    offer: TradesmanOffer
    type: String
    status: String
    conversationId: String
    replyTo: TradesmanMessage
    createdAt: String
    direction: String
    isCurrentUser: Boolean
    isGroupChat: Boolean
  }

  type TradesmanConversation {
    conversationId: String
    booking: Booking
    participant: User
    participants: [User]
    lastMessage: TradesmanMessage
    unreadCount: Int
    isGroupChat: Boolean
  }

  type TradesmanConversationsResponse {
    success: Boolean
    message: String
    data: [TradesmanConversation]
  }

  type TradesmanGroupChatResponse {
    success: Boolean
    message: String
    conversationId: String
    isGroupChat: Boolean
    participants: [User]
    booking: Booking
    participant: User
  }

  type TradesmanMessagesResponse {
    success: Boolean
    message: String
    data: [TradesmanMessage]
  }

  type BookingChat {
    conversationId: String
    booking: Booking
    participant: User
  }

  type BookingChatResponse {
    success: Boolean
    message: String
    conversationId: String
    isGroupChat: Boolean
    participants: [User]
    booking: Booking
    participant: User
  }

  input TradesmanMessageFilterInput {
    booking: ID
    user: ID
    conversationId: String
  }

  input MessageImageInput {
    url: String!
    key: String!
    width: Int
    height: Int
  }
 
`;

module.exports.typedefs = typedefs;

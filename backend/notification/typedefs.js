const typedefs = `
  type Notification {
    _id: String
    sender: User
    recipient: User
    category: String
    title: String
    message: String
    type: String
    status: String
    priority: String
    action_url: String
    created_at: String
    updated_at: String
  }

  type GetAllNotificationsResponse {
    success: Boolean!
    message: String!
    data: [Notification]
    pageInfo: PageInfo
  }

  type NotificationResponse {
    success: Boolean!
    message: String!
    data: Notification
  }

  input NotificationInput {
    sender: String
    recipient: String
    category: String
    title: String
    message: String
    type: String
    status: String
    priority: String
    action_url: String
  }

  input NotificationFilterInput {
    category: String
    type: String
    status: String
    priority: String
    recipient: String
    sender: String
    userRole: String
  }
`;

module.exports.typedefs = typedefs;

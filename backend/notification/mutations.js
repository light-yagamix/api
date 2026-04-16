const mutations = `#graphql

  createNotification(input: NotificationInput!): NotificationResponse

  updateNotification(_id: String!, input: NotificationInput!): NotificationResponse

  deleteNotificationById(_id: String!): Response

`;

module.exports.mutations = mutations;

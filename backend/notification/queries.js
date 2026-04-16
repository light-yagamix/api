const queries = `#graphql 

   getAllNotifications(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: NotificationFilterInput
  ): GetAllNotificationsResponse

   getNotificationById(_id: String!): NotificationResponse

`;

module.exports.queries = queries;

const queries = `#graphql
  getTradesmanRatings(tradesmanId: String!, page: Int, limit: Int): RatingsListResponse
  getRatingById(ratingId: String!): RatingResponse
  getTradesmanRatingStats(tradesmanId: String!): TradesmanRatingStats
  getUserRatingsGiven(userId: String!, page: Int, limit: Int): RatingsListResponse
  getBookingRating(bookingId: String!): RatingResponse
`;

module.exports.queries = queries;

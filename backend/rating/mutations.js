const mutations = `#graphql
  createRating(bookingId: String!, rating: Int!, comment: String, isAnonymous: Boolean): RatingResponse!
  updateRating(ratingId: String!, rating: Int, comment: String): RatingResponse!
  deleteRating(ratingId: String!): Response!
  markRatingHelpful(ratingId: String!): Response!
  markRatingNotHelpful(ratingId: String!): Response!
`;

module.exports.mutations = mutations;

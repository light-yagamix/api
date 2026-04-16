const typedefs = `#graphql
  type TradesmanRating {
    _id: String
    user: User
    tradesman: User
    booking: Booking
    rating: Int!
    comment: String
    isAnonymous: Boolean
    helpful: Int
    notHelpful: Int
    status: String
    created_at: String
    updated_at: String
  }

  input RatingInput {
    bookingId: String!
    rating: Int!
    comment: String
    isAnonymous: Boolean
  }

  input UpdateRatingInput {
    ratingId: String!
    rating: Int
    comment: String
  }

  type RatingResponse {
    success: Boolean!
    message: String!
    data: TradesmanRating
  }

  type RatingsListResponse {
    success: Boolean!
    message: String!
    data: [TradesmanRating!]!
    pageInfo: PageInfo
  }

  type TradesmanRatingStats {
    totalRatings: Int!
    averageRating: Float!
    ratingDistribution: RatingDistribution
    recentRatings: [TradesmanRating!]!
  }

  type RatingDistribution {
    fiveStar: Int
    fourStar: Int
    threeStar: Int
    twoStar: Int
    oneStar: Int
  }
`;

module.exports.typedefs = typedefs;

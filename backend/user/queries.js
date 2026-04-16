const queries = `#graphql 

   getAllUsers(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: UserFilterInput
  ): GetAllUsersResponse

   getUserById(id: String!): GetUserResponse

   getUsersBySkillIdSorted(
    skillId: String!,
  ): GetAllUsersResponse
   getCurrentLoggedInUser: GetUserResponse

  getTradesmenNearby(
    lat: Float!
    lng: Float!
    radius: Float!
    serviceId: String!
    page: Int = 1
    limit: Int = 10
    sortField: String = "score"
    sortOrder: String = "desc"
    minRating: Float
    maxRating: Float
    verified: Boolean
    online: Boolean
  ): GetAllNearbyTradesmanResponse!

`;

module.exports.queries = queries;

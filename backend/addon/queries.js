const queries = `#graphql 

   getAllAddons(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: AddonFilterInput
  ): GetAllAddonsResponse

   getAddonById(_id: String!): AddonResponse

`;

module.exports.queries = queries;

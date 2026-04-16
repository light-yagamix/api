const queries = `#graphql 

   getAllCategories(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: CategoryFilterInput
  ): GetAllCategoriesResponse

   getCategoryById(_id: String!): CategoryResponse

`;

module.exports.queries = queries;

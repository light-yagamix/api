const queries = `#graphql 

   getAllSubCategories(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: SubCategoryFilterInput
  ): GetAllSubCategoriesResponse

   getSubCategoryById(_id: String!): SubCategoryResponse

`;

module.exports.queries = queries;

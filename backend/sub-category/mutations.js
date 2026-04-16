const mutations = `#graphql

  createSubCategory(input: SubCategoryInput!): SubCategoryResponse

  updateSubCategory(_id: String!, input: SubCategoryInput!): SubCategoryResponse

  deleteSubCategoryById(_id: String!): Response

`;
module.exports.mutations = mutations;


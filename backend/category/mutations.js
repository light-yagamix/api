const mutations = `#graphql

  createCategory(input: CategoryInput!): CategoryResponse

  updateCategory(_id: String!, input: CategoryInput!): CategoryResponse

  deleteCategoryById(_id: String!): Response

`;
module.exports.mutations = mutations;

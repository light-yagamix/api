const mutations = `#graphql

  createBlog(input: BlogInput!): BlogResponse

  updateBlog(_id: String!, input: BlogInput!): BlogResponse

  deleteBlogById(_id: String!): Response

`;
module.exports.mutations = mutations;

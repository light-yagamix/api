const queries = `#graphql 

   getAllBlogs(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: BlogFilterInput
  ): GetAllBlogsResponse

   getBlogById(_id: String!): BlogResponse
   getBlogBySlug(slug: String!): BlogResponse

`;

module.exports.queries = queries;

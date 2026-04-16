const typedefs = `
  type Blog {
    _id: String
    slug: String
    title: String
    date: String
    banner: String
    images: [String]
    status: String
    descriptions: [String]
    createdAt: String
    updatedAt: String
  }

  type GetAllBlogsResponse {
    success: Boolean!
    message: String!
    data: [Blog]
    pageInfo: PageInfo
  }

  type BlogResponse {
    success: Boolean!
    message: String!
    data: Blog
  }

  input BlogInput {
    slug: String
    title: String
    date: String
    banner: String
    images: [String]
    descriptions: [String]
    status: String
  }

  input BlogFilterInput {
    slug: String
    title: String
    date: String
    status: String
  }
`;

module.exports.typedefs = typedefs;

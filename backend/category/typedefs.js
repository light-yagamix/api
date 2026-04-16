const typedefs = `
  type Category {
    _id: String
    name: String
    description: String
    banner: String
    image: String
    isFeatured: Boolean
    status: String
    sub_categories: [SubCategory]
  }

  type GetAllCategoriesResponse {
    success: Boolean!
    message: String!
    data: [Category]
    pageInfo: PageInfo
  }

  type CategoryResponse {
    success: Boolean!
    message: String!
    data: Category
  }

  input CategoryInput {
    name: String
    description: String
    banner: String
    image: String
    isFeatured: Boolean
    status: String
  }

  input CategoryFilterInput {
    name: String
    description: String
    isFeatured: Boolean
    status: String
  }
  
 
`;

module.exports.typedefs = typedefs;

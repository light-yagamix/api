const typedefs = `
  type SubCategory {
    _id: String
    name: String
    category: Category
    description: String
    image: String
    isFeatured: Boolean
    status: String
    services : [Service]
  }

  type GetAllSubCategoriesResponse {
    success: Boolean!
    message: String!
    data: [SubCategory]
    pageInfo: PageInfo
  }

  type SubCategoryResponse {
    success: Boolean!
    message: String!
    data: SubCategory
  }

  input SubCategoryInput {
    name: String
    category: String
    description: String
    image: String
    isFeatured: Boolean
    status: String
  }

  input SubCategoryFilterInput {
    name: String
    category: String
    description: String
    isFeatured: Boolean
    status: String
  }
  
 
`;

module.exports.typedefs = typedefs;

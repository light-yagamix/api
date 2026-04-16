const typedefs = `
  type Service {
    _id: String
    name: String
    service_type: String
    description: String
    category: Category
    sub_category: SubCategory
    tradesman: String
    price_type: String
    prices: [Price]
    visit_type: String
    image: String
    isFeatured: Boolean
    duration: Float
    discount: Float
    status: String
    requires_advance_payment: Boolean
    advance_payment_percentage: Float
    service_count: Int
    keywords: [String]
    addons: [Addon]
    created_at: String
    updated_at: String
  }

  type Price {
    _id: String
    label: String
    price: Float
  }
  type GetAllServicesResponse {
    success: Boolean!
    message: String!
    data: [Service]
    pageInfo: PageInfo
  }

  type ServiceResponse {
    success: Boolean!
    message: String!
    data: Service
  }
 

  type CreateServiceResponse {
    success: Boolean!
    message: String!
  }

  input PriceInput {
    _id: String
    label: String
    price: Float
  }
  input ServiceInput {
    name: String
    service_type: String
    category: String
    description: String
    sub_category: String
    tradesman: String
    price_type: String
    prices: [PriceInput]
    visit_type: String
    image: String
    isFeatured: Boolean
    duration: Float
    discount: Float
    status: String
    requires_advance_payment: Boolean
    advance_payment_percentage: Float
    keywords: [String]
  }
  
  input ServiceFilterInput {
    name: String
    service_type: String
    category: String
    sub_category: String
    tradesman: String
    keywords: String
    isFeatured: Boolean
    search: String
  } 
`;

module.exports.typedefs = typedefs;

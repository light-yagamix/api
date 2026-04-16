const typedefs = `
  type Addon {
    _id: String
    supplier: User
    quantity: Int
    out_of_stock: Boolean
    name: String
    service: Service
    description: String
    image: String
    prices: [Price]
    price_type: String
    status: String
    isReusable: Boolean
    created_at: String
    updated_at: String
  }


  input PriceInput {
    label: String
    price: Float
  }

  type Price {
    label: String
    price: Float
  }
  type GetAllAddonsResponse {
    success: Boolean!
    message: String!
    data: [Addon]
    pageInfo: PageInfo
  }

  type AddonResponse {
    success: Boolean!
    message: String!
    data: Addon
  }

  input AddonInput {
    name: String
    supplier: String
    quantity: Int
    out_of_stock: Boolean
    service: String
    description: String
    image: String
    status: String
    price_type: String
    prices: [PriceInput]
    isReusable: Boolean
  }

  input AddonFilterInput {
    name: String
    supplier: String
    out_of_stock: Boolean
    service: String
    status: String
    isReusable: Boolean
  }

`;

module.exports.typedefs = typedefs;
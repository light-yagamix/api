const mutations = `#graphql

  createService(input: ServiceInput!): CreateServiceResponse

  updateService(_id: String!, input: ServiceInput!): ServiceResponse

  deleteServiceById(_id: String!): Response

`;
module.exports.mutations = mutations;

const mutations = `#graphql

  createAddon(input: AddonInput!): AddonResponse

  updateAddon(_id: String!, input: AddonInput!): AddonResponse

  deleteAddonById(_id: String!): Response

`;
module.exports.mutations = mutations;

const subscriptionTypeDefs = require("./typedefs");
const subscriptionResolvers = require("./resolvers");
const { queries } = require("./queries");
const { mutations } = require("./mutations");

module.exports = {
  typedefs: subscriptionTypeDefs,
  queries,
  mutations,
  resolvers: subscriptionResolvers,
};

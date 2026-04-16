const { resolvers } = require("./resolvers");
const { typedefs } = require("./typedefs");
const { mutations } = require("./mutations");
const { queries } = require("./queries");

module.exports.Assistant = {
  resolvers,
  typedefs,
  mutations,
  queries,
};

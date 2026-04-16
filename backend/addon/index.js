const { resolvers } = require("./resolvers");
const { typedefs } = require("./typedefs");
const { model } = require("./model");
const { datasource } = require("./datasource");
const { mutations } = require("./mutations");
const { queries } = require("./queries");

module.exports.Addon = {
  resolvers,
  typedefs,
  model,
  datasource,
  mutations,
  queries,
};

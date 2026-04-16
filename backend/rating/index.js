const { resolvers } = require("./resolvers");
const { typedefs } = require("./typedefs");
const { model } = require("./model");
const { datasource, RatingService } = require("./datasource");
const { mutations } = require("./mutations");
const { queries } = require("./queries");

module.exports.Rating = {
  resolvers,
  typedefs,
  model,
  datasource,
  RatingService,
  mutations,
  queries,
};

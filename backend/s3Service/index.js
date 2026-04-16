const { resolvers } = require("./resolver");
const { typedefs } = require("./typedefs");
const model = require("./model");
const { s3Service } = require("./datasource");
const { mutations } = require("./mutations");
const { queries } = require("./queries");

module.exports.s3Service = {
  resolvers,
  typedefs,
  model,
  datasource: s3Service,
  mutations,
  queries,
};

const { typedefs } = require("./typedefs");
const { queries } = require("./queries");
const { mutations } = require("./mutations");
const { resolvers } = require("./resolvers");
const { ConversationDataSource } = require("./datasource");
const { ConversationModel, ConversationMessageModel } = require("./model");

module.exports = {
  typedefs,
  queries,
  mutations,
  resolvers,
  ConversationDataSource,
  ConversationModel,
  ConversationMessageModel,
};

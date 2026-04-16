const { TradesmanChatService } = require("./datasource");

const queries = {
  getTradesmanMessages: async (parent, args, context, info) => {
    try {
      return await TradesmanChatService.getTradesmanMessages(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  getTradesmanConversations: async (parent, args, context, info) => {
    console.log("args",args)
    try {
      return await TradesmanChatService.getTradesmanConversations(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message || "Failed to fetch conversations",
        conversations: null,
      };
    }
  },

  getOrCreateBookingChat: async (parent, args, context, info) => {
    console.log("args of getOrCreateBookingChat", args);
    try {
      return await TradesmanChatService.getOrCreateBookingChat(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message || "Failed to get booking chat",
        data: null,
      };
    }
  },
};

const mutations = {
  createTradesmanGroupChat: async (parent, args, context, info) => {
    try {
      return await TradesmanChatService.createTradesmanGroupChat(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message || "Failed to create group chat",
        conversationId: null,
        participants: [],
      };
    }
  },
};

module.exports.resolvers = { queries, mutations };

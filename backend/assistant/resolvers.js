const { AssistantDataSource } = require("./datasource");

const queries = {};

const mutations = {
  sendAIMessage: async (parent, args, context, info) => {
    try {
      const { messages, style } = args;

      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          message: "Messages array is required",
          content: null,
          metadata: null,
        };
      }

      // Get client IP from context if available (for rate limiting only)
      let clientIp = "unknown";
      if (context.req) {
        const forwarded = context.req.headers["x-forwarded-for"];
        const realIP = context.req.headers["x-real-ip"];
        const cfConnecting = context.req.headers["cf-connecting-ip"];
        clientIp =
          cfConnecting ||
          (forwarded ? forwarded.split(",")[0].trim() : null) ||
          realIP ||
          "unknown";
      }

      // Map GraphQL sendAIMessage to generic AssistantDataSource.sendGeneralMessage
      const response = await AssistantDataSource.sendGeneralMessage({
        messages,
        style: style || "versatile",
        clientIp,
      });

      return response;
    } catch (error) {
      console.error("sendAssistantMessage resolver error:", error);
      return {
        success: false,
        message:
          error.message || "An error occurred while processing the message",
        content: null,
        metadata: null,
      };
    }
  },
};

module.exports.resolvers = { queries, mutations };

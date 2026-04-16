const { NotificationDataSource } = require("./datasource");
const authorize = require("../authorize");
const queries = {
  getAllNotifications: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");

      const { user } = context;
      if (!user) throw new Error("Unauthorized");

      args.filters = args.filters || {};

      // Automatically filter by recipient if not provided
      if (!args.filters.recipient) {
        user.role !== "admin" && (args.filters.recipient = user._id.toString());
      }

      return await NotificationDataSource.getAllNotifications(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  getNotificationById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("Notification ID is required");

      const { user } = context;
      if (!user) throw new Error("Unauthorized");

      const notification = await NotificationDataSource.getNotificationById(
        args._id
      );

      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },
};

const mutations = {
  createNotification: authorize("CREATE_NOTIFICATION")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("Notification input is required");
        return await NotificationDataSource.createNotification(args.input);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  updateNotification: authorize("UPDATE_NOTIFICATION")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Notification ID is required");
        if (!args.input) throw new Error("Notification input is required");
        return await NotificationDataSource.updateNotification(args);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  deleteNotificationById: authorize("DELETE_NOTIFICATION_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Notification ID is required");
        return await NotificationDataSource.deleteNotificationById(args._id);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),
};

module.exports.resolvers = { queries, mutations };

const { TimeSlotDataSource } = require("./datasource");
const authorize = require("../authorize");

const queries = {
  getAllTimeSlots: async (parent, args, context, info) => {
    try {
      return await TimeSlotDataSource.getAllTimeSlots(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  getTimeSlotById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("TimeSlot ID is required");
      return await TimeSlotDataSource.getTimeSlotById(args._id);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  getTimeSlotsByDay: async (parent, args, context, info) => {
    try {
      return await TimeSlotDataSource.getTimeSlotsByDay(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },
};

const mutations = {
  createTimeSlot: authorize("CREATE_TIMESLOT")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("TimeSlot input is required");
        return await TimeSlotDataSource.createTimeSlot(args.input);
      } catch (error) {
        console.log(error);
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  updateTimeSlot: authorize("UPDATE_TIMESLOT")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("TimeSlot ID is required");
        if (!args.input) throw new Error("TimeSlot input is required");
        return await TimeSlotDataSource.updateTimeSlot(args);
      } catch (error) {
        console.log(error);
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  deleteTimeSlotById: authorize("DELETE_TIMESLOT_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("TimeSlot ID is required");
        return await TimeSlotDataSource.deleteTimeSlotById(args._id);
      } catch (error) {
        console.log(error);
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

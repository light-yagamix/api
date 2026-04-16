const { AddonDataSource } = require("./datasource");
const authorize = require("../authorize");
const queries = {
  getAllAddons: async (parent, args, context, info) => {
    try {
      return await AddonDataSource.getAllAddons(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  getAddonById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("Addon ID is required");
      return await AddonDataSource.getAddonById(args._id);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },
};

const mutations = {
  createAddon: authorize("CREATE_ADDON")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("Addon input is required");
        return await AddonDataSource.createAddon(args.input);
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

  updateAddon: authorize("UPDATE_ADDON")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Addon ID is required");
        if (!args.input) throw new Error("Addon input is required");
        return await AddonDataSource.updateAddon(args);
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

  deleteAddonById: authorize("DELETE_ADDON_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Addon ID is required");
        return await AddonDataSource.deleteAddonById(args._id);
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


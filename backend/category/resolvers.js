const { CategoryDataSource } = require("./datasource");
const authorize = require("../authorize");
const queries = {
  getAllCategories: async (parent, args, context, info) => {
    try {
      return await CategoryDataSource.getAllCategories(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  getCategoryById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("Category ID is required");
      return await CategoryDataSource.getCategoryById(args._id);
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
  createCategory: authorize("CREATE_CATEGORY")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("Category input is required");
        return await CategoryDataSource.createCategory(args.input);
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

  updateCategory: authorize("UPDATE_CATEGORY")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Category ID is required");
        if (!args.input) throw new Error("Category input is required");
        return await CategoryDataSource.updateCategory(args);
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

  deleteCategoryById: authorize("DELETE_CATEGORY_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Category ID is required");
        return await CategoryDataSource.deleteCategoryById(args._id);
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
const { SubCategoryDataSource } = require("./datasource");
const authorize = require("../authorize");
const queries = {
  getAllSubCategories: async (parent, args, context, info) => {
    try {
      return await SubCategoryDataSource.getAllSubCategories(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  getSubCategoryById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("Sub Category ID is required");
      return await SubCategoryDataSource.getSubCategoryById(args._id);
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
  createSubCategory: authorize("CREATE_SUB_CATEGORY")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("Sub Category input is required");
        
        return await SubCategoryDataSource.createSubCategory(args.input);
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

  updateSubCategory: authorize("UPDATE_SUB_CATEGORY")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Sub Category ID is required");
        if (!args.input) throw new Error("Sub Category input is required");
        return await SubCategoryDataSource.updateSubCategory(args);
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

  deleteSubCategoryById: authorize("DELETE_SUB_CATEGORY_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Sub Category ID is required");
        return await SubCategoryDataSource.deleteSubCategoryById(args._id);
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

const { BlogDataSource } = require("./datasource");
const authorize = require("../authorize");
const queries = {
  getAllBlogs: async (parent, args, context, info) => {
    try {
      return await BlogDataSource.getAllBlogs(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  getBlogById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("Category ID is required");
      return await BlogDataSource.getBlogById(args._id);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },
  getBlogBySlug: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.slug) throw new Error("Category ID is required");
      return await BlogDataSource.getBlogBySlug(args.slug);
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
  createBlog: authorize("CREATE_BLOG")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("Blog input is required");
        return await BlogDataSource.createBlog(args.input);
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

  updateBlog: authorize("UPDATE_BLOG")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Blog ID is required");
        if (!args.input) throw new Error("Blog input is required");
        return await BlogDataSource.updateBlog(args);
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

  deleteBlogById: authorize("DELETE_BLOG_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args._id) throw new Error("Blog ID is required");
        return await BlogDataSource.deleteBlogById(args._id);
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

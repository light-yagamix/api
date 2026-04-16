const { UserService } = require("./datasource");
const UserModel = require("./model");
const authorize = require("../authorize");
const { VerifyDomainDkimCommand } = require("@aws-sdk/client-ses");
const { getProfileCompletionSummary } = require("../utils/scoringUtils");
const queries = {
  getUserById: authorize("GET_USER_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("You are not logged in");

        if (!args) throw new Error("Invalid arguments");
        if (!args.id) throw new Error("User ID is required");
        return await UserService.getUserById(args.id);
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

  getUsersBySkillIdSorted: authorize("GET_ALL_USERS")(
    async (parent, args, context, info) => {
      try {
        return await UserService.getUsersBySkillIdSorted(args);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  getTradesmenNearby: async (parent, args) => {
    try {
      return await UserService.getTradesmenNearby(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
        pageInfo: {
          totalRecords: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  },

  getAllUsers: authorize("GET_ALL_USERS")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("You are not logged in");

        return await UserService.getAllUsers(args);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  getCurrentLoggedInUser: async (parent, args, context, info) => {
    try {
      if (context && context.user)
        return await UserService.getUserById(context.user._id);
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  },
};

const mutations = {
  createUser: async (parent, args, context, info) => {
    console.log(args);
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.phone) {
        delete args.phone;
      }
      if (!args.email) {
        delete args.email;
      }
      // if (!args.phone && !args.email)
      //   throw new Error("Phone or email is required");
      if (!args.role) throw new Error("Role is required");

      // if (args.role === "tradesman") {
      //   if (!args.first_name) throw new Error("First name is required");
      //   if (!args.password) throw new Error("Password is required");
      //   if (args.password.length < 8) throw new Error("Password is too short");
      //   if (args.password.length > 20) throw new Error("Password is too long");
      //   if (args.password !== args.confirm_password)
      //     throw new Error("Passwords do not match");
      //   if (!args.confirm_password)
      //     throw new Error("Confirm password is required");
      //   if (!args.cnic) throw new Error("CNIC is required");
      //   if (!args.skills) throw new Error("Skills are required");
      // }

      return await UserService.createUser(args);
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  getUserToken: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");

      if (!args.email && !args.phone)
        throw new Error("Email or phone is required");

      if (args.password) {
        if (args.password.length < 8) throw new Error("Password too short");

        if (args.password.length > 20) throw new Error("Password too long");
      }

      return await UserService.getUserToken(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  updateUser: authorize("UPDATE_USER")(async (parent, args, context, info) => {
    try {
      if (!context.user) throw new Error("You are not logged in");
      if (!args) throw new Error("Invalid arguments");
      if (!args._id) throw new Error("User ID is required");
      if (context.user._id !== args._id && context.user.role !== "admin")
        throw new Error("You are not authorized to update this user");

      if (args.role && context.user.role !== "admin")
        throw new Error("You are not authorized to update role");

      if (args.account_status && context.user.role !== "admin")
        throw new Error("You are not authorized to update status");

      if (args.first_name && args.first_name.length < 3)
        throw new Error("First name is too short");

      if (args.first_name && args.first_name.length > 30)
        throw new Error("First name is too long");

      return await UserService.updateUser(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }),

  deleteUserById: authorize("DELETE_USER_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("You are not logged in");
        if (!args) throw new Error("Invalid arguments");
        if (!args.id) throw new Error("User ID is required");
        if (context.user._id !== args.id && context.user.role !== "admin")
          throw new Error("You are not authorized to delete this user");
        return await UserService.deleteUserById(args.id);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  verifyUser: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.email && !args.phone)
        throw new Error("Please enter email or phone number");
      return await UserService.verifyUser(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  verifyOtp: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.email && !args.phone)
        throw new Error("Please enter email or phone number");
      return await UserService.verifyOtp(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },
  resendVerificationEmail: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.email) throw new Error("Email is required");
      return await UserService.resendVerificationEmail(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  forgotPassword: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.email) throw new Error("Email is required");
      return await UserService.forgotPassword(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  resetPassword: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      if (!args.email) throw new Error("Email is required");
      if (!args.otp) throw new Error("OTP is required");
      if (!args.password) throw new Error("Password is required");
      if (!args.confirm_password)
        throw new Error("Confirm password is required");
      if (args.password !== args.confirm_password)
        throw new Error("Passwords do not match");

      if (args.password.length < 8) throw new Error("Password too short");

      if (args.password.length > 20) throw new Error("Password too long");

      return await UserService.resetPassword(args);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  changePassword: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");
      const user = context.user;
      if (!user) throw new Error("User not found");

      if (!args.old_password) throw new Error("Old password is required");

      if (!args.new_password) throw new Error("New password is required");

      if (args.new_password.length < 8)
        throw new Error("New password too short");

      if (args.new_password.length > 20)
        throw new Error("New password too long");

      return await UserService.changePassword({
        _id: user._id,
        ...args,
      });
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  addSkillsRating: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");

      await UserService.addSkillsRating(args.input, args.userId);

      return {
        success: true,
        message: "Skill rating added successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  addAddress: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");

      await UserService.addAddress(args.input, args.userId);

      return {
        success: true,
        message: "Address added successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  updateAddress: async (parent, args, context, info) => {
    try {
      if (!args?.input) throw new Error("Invalid arguments");

      const { id: addressId, ...updatedData } = args.input;
      const userId = args.userId;

      await UserService.updateAddress({ userId, addressId, updatedData });

      return {
        success: true,
        message: "Address updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },

  deleteAddressById: async (parent, args, context, info) => {
    try {
      if (!args) throw new Error("Invalid arguments");

      await UserService.deleteAddressById(args);

      return {
        success: true,
        message: "Address deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },
  saveDeviceToken: async (parent, args, context, info) => {
    try {
      if (!context.user) throw new Error("Unauthorized access");
      if (!args) throw new Error("Invalid Arguments");
      if (!args.token) throw new Error("Device Token is Required");
      return await UserService.saveDeviceToken(context.user._id, args.token);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  },
  sendNotification: authorize("SEND_NOTIFICATION")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("Unauthorized access");
        if (!args) throw new Error("Invalid arguments");
        if (!args.userId) throw new Error("User ID is required");
        if (!args.message) throw new Error("Message is required");
        return await UserService.sendNotification(args.userId, args.message);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),
  purchaseSubscription: authorize("UPDATE_USER")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("You are not logged in");
        if (!args.userId) throw new Error("User ID is required");
        if (!args.planId) throw new Error("Plan ID is required");

        // Only allow users to purchase for themselves (or admins)
        if (context.user._id !== args.userId && context.user.role !== "admin") {
          throw new Error("horized to purchase subscriptions for other users");
        }

        return await UserService.purchaseSubscription(args.userId, args.planId);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),
  setTradesmanOnlineStatus: authorize("UPDATE_USER")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("You are not logged in");
        if (context.user.role !== "tradesman") {
          throw new Error("Only tradesmen can change online status");
        }

        if (args.online === undefined || args.online === null) {
          throw new Error("Online status is required");
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
          context.user._id,
          { online: args.online },
          { new: true }
        );

        if (!updatedUser) throw new Error("User not found");

        const status = args.online ? "online" : "offline";
        console.log(`Tradesman ${context.user._id} is now ${status}`);

        return {
          success: true,
          message: `You are now ${status}`,
          data: updatedUser,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  setUserOnlineStatus: authorize("UPDATE_USER")(
    async (parent, args, context, info) => {
      try {
        if (!context.user) throw new Error("You are not logged in");

        if (args.online === undefined || args.online === null) {
          throw new Error("Online status is required");
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
          context.user._id,
          { online: args.online },
          { new: true }
        );

        if (!updatedUser) throw new Error("User not found");

        const status = args.online ? "online" : "offline";
        console.log(
          `User ${context.user._id} (${context.user.role}) is now ${status}`
        );

        return {
          success: true,
          message: `You are now ${status}`,
          data: updatedUser,
        };
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

// Field resolvers for User type
const fieldResolvers = {
  User: {
    profileCompletion: (user) => {
      if (!user) return null;
      return getProfileCompletionSummary(user);
    },
  },
};

module.exports.resolvers = { queries, mutations, ...fieldResolvers };

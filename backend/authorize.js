const { permissions } = require("./roles");

const authorize = (requiredPermission) => {
  return (resolver) => {
    if (!requiredPermission) {
      throw new Error("Missing required permission");
    }
    return (parent, args, context, info) => {
      const { user } = context;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const userPermissions = permissions[user.role] || [];

      if (!userPermissions.includes(requiredPermission)) {
        throw new Error("Not authorized");
      }

      return resolver(parent, args, context, info);
    };
  };
};

module.exports = authorize;

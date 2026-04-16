const NotificationModel = require("./model");

async function getAllNotifications(args) {
  try {
    const {
      page = 1,
      limit,
      sortField = "created_at",
      sortOrder = "asc",
      filters = {},
    } = args;

    const filterConditions = {};
    for (let key in filters) {
      if (filters[key] !== undefined && filters[key] !== null) {
        if (key === "status" || key === "priority") {
          filterConditions[key] = filters[key];
        } else if (key === "recipient" || key === "sender") {
          filterConditions[key] = filters[key];
        } else if (typeof filters[key] === "string") {
          filterConditions[key] = { $regex: filters[key], $options: "i" };
        } else {
          filterConditions[key] = filters[key];
        }
      }
    }

    const sortOptions = {};
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;
    const notifications = await NotificationModel.find(filterConditions)
      .populate("sender")
      .populate("recipient")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRecords = await NotificationModel.countDocuments(
      filterConditions
    );
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
      pageInfo: {
        totalRecords,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getNotificationById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const notification = await NotificationModel.findById(id)
      .populate("sender")
      .populate("recipient");
    if (!notification) throw new Error("Notification not found");
    return {
      success: true,
      message: "Notification fetched successfully",
      data: notification,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createNotification(args) {
  try {
    const notification = await NotificationModel.create(args);
    return {
      success: true,
      message: "Notification created successfully",
      data: notification,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateNotification(args) {
  try {
    const notification = await NotificationModel.findByIdAndUpdate(
      args._id,
      args.input,
      {
        new: true,
      }
    );
    if (!notification) throw new Error("Notification not found");
    return {
      success: true,
      message: "Notification updated successfully",
      data: notification,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteNotificationById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const notification = await NotificationModel.findByIdAndDelete(id);
    if (!notification) throw new Error("Notification not found");
    return {
      success: true,
      message: "Notification deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports.NotificationDataSource = {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotificationById,
};

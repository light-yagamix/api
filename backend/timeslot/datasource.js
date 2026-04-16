const TimeSlotModel = require("./model");
const mongoose = require("mongoose");

async function getAllTimeSlots(args) {
  try {
    const {
      page = 1,
      limit,
      sortField = "created_at",
      sortOrder = "asc",
      filters = {},
    } = args;

    const dateFields = ["startTime", "endTime", "date"];

    const filterConditions = {};
    for (let key in filters) {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (mongoose.Types.ObjectId.isValid(value)) {
          filterConditions[key] = value;
        } else if (typeof value === "string" && !dateFields.includes(key)) {
          filterConditions[key] = { $regex: value, $options: "i" };
        } else if (dateFields.includes(key)) {
          filterConditions[key] = new Date(value);
        } else {
          filterConditions[key] = value;
        }
      }
    }

    const sortOptions = {};
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;
    const timeSlots = await TimeSlotModel.find(filterConditions)
      .populate("tradesman")
      .populate("booking")
      .populate("user")
      .populate("service")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRecords = await TimeSlotModel.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      success: true,
      message: "TimeSlots fetched successfully",
      data: timeSlots,
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

async function getTimeSlotsByDay(args) {
  try {
    const { filters = {} } = args;

    const dateFields = ["startTime", "endTime", "date"];

    const filterConditions = {};
    for (let key in filters) {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (mongoose.Types.ObjectId.isValid(value)) {
          filterConditions[key] = value;
        } else if (typeof value === "string" && !dateFields.includes(key)) {
          filterConditions[key] = { $regex: value, $options: "i" };
        } else if (dateFields.includes(key)) {
          filterConditions[key] = new Date(value);
        } else {
          filterConditions[key] = value;
        }
      }
    }

    const timeSlots = await TimeSlotModel.find(filterConditions)
      .populate("tradesman")
      .populate("booking")
      .populate("user")
      .populate("service");

    return {
      success: true,
      message: "Time slots fetched successfully",
      data: timeSlots,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getTimeSlotById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const timeSlot = await TimeSlotModel.findById(id);
    if (!timeSlot) throw new Error("TimeSlot not found");
    return {
      success: true,
      message: "TimeSlot fetched successfully",
      data: timeSlot,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getTimeSlotByName(name) {
  const timeSlot = await TimeSlotModel.findOne({ name });
  return timeSlot || null;
}

async function createTimeSlot(args) {
  try {
    const timeSlot = await TimeSlotModel.create(args);
    return {
      success: true,
      message: "TimeSlot created successfully",
      data: timeSlot,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateTimeSlot(args) {
  try {
    const timeSlot = await TimeSlotModel.findByIdAndUpdate(
      args._id,
      args.input,
      {
        new: true,
      }
    );
    if (!timeSlot) throw new Error("TimeSlot not found");
    return {
      success: true,
      message: "TimeSlot updated successfully",
      data: timeSlot,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteTimeSlotById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const timeSlot = await TimeSlotModel.findByIdAndDelete(id);
    if (!timeSlot) throw new Error("TimeSlot not found");
    return {
      success: true,
      message: "TimeSlot deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports.TimeSlotDataSource = {
  getAllTimeSlots,
  getTimeSlotByName,
  getTimeSlotsByDay,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlotById,
};

const { default: mongoose } = require("mongoose");
const ServiceModel = require("../service/model");
const AddonModel = require("./model");

async function getAllAddons(args) {
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
        if (
          (key === "supplier" || key === "service") &&
          mongoose.Types.ObjectId.isValid(filters[key])
        ) {
          filterConditions[key] = new mongoose.Types.ObjectId(filters[key]);
        } else if (typeof filters[key] === "string") {
          if (key === "status") {
            // Exact match for status
            filterConditions[key] = filters[key];
          } else {
            // Regex match for other string fields
            filterConditions[key] = { $regex: filters[key], $options: "i" };
          }
        } else {
          filterConditions[key] = filters[key];
        }
      }
    }

    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };
    const skip = (page - 1) * limit;

    const addons = await AddonModel.find(filterConditions)
      .populate("service")
      .populate("supplier")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRecords = await AddonModel.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      success: true,
      message: "Addons fetched successfully",
      data: addons,
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

async function getAddonByName(name) {
  const addon = await AddonModel.findOne({ name });
  return addon || null;
}

async function getAddonById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const addon = await AddonModel.findById(id);
    if (!addon) throw new Error("Addon not found");
    return {
      success: true,
      message: "Addon fetched successfully",
      data: addon,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createAddon(args) {
  console.log(args);
  try {
    const addonExists = await getAddonByName(args.name);
    if (addonExists) throw new Error("Addon already exists");
    const addon = await AddonModel.create(args);
    const updatedService = await ServiceModel.findOneAndUpdate(
      { _id: args.service },
      { $push: { addons: addon._id } }
    );
    if (!updatedService) throw new Error("Service not found");
    return {
      success: true,
      message: "Addon created successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateAddon(args) {
  try {
    const addon = await AddonModel.findByIdAndUpdate(args._id, args.input, {
      new: true,
    });
    if (!addon) throw new Error("Addon not found");
    return {
      success: true,
      message: "Addon updated successfully",
      data: addon,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteAddonById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const addon = await AddonModel.findByIdAndDelete(id);
    if (!addon) throw new Error("Addon not found");
    return {
      success: true,
      message: "Addon deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports.AddonDataSource = {
  getAllAddons,
  getAddonByName,
  getAddonById,
  createAddon,
  updateAddon,
  deleteAddonById,
};

const SubCategoryModel = require("./model");
const CategoryModel = require("../category/model");

const mongoose = require("mongoose");

async function getAllSubCategories(args) {
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
          key === "category" &&
          mongoose.Types.ObjectId.isValid(filters[key])
        ) {
          filterConditions[key] = new mongoose.Types.ObjectId(filters[key]);
        } else if (typeof filters[key] === "string") {
          filterConditions[key] = { $regex: filters[key], $options: "i" };
        } else {
          filterConditions[key] = filters[key];
        }
      }
    }

    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };
    const skip = (page - 1) * limit;

    const subCategories = await SubCategoryModel.find(filterConditions)
      .populate("category")
      .populate("services")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRecords = await SubCategoryModel.countDocuments(
      filterConditions
    );
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      success: true,
      message: "Sub Categories fetched successfully",
      data: subCategories,
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

async function getSubCategoryByName(name) {
  const subCategory = await SubCategoryModel.findOne({ name });
  return subCategory || null;
}

async function getSubCategoryById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const subCategory = await SubCategoryModel.findById(id)
      .populate("category")
      .populate("services");
    if (!subCategory) throw new Error("Sub Category not found");
    return {
      success: true,
      message: "Sub Category fetched successfully",
      data: subCategory,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createSubCategory(args) {
  try {
    const subCategoryExists = await getSubCategoryByName(args.name);
    if (subCategoryExists) throw new Error("Sub Category already exists");

    const subCategory = await SubCategoryModel.create(args);
    const updateCategory = await CategoryModel.findOneAndUpdate(
      { _id: args.category },
      { $push: { sub_categories: subCategory._id } }
    );
    if (!updateCategory) throw new Error("Category not found");
    return {
      success: true,
      message: "Sub Category created successfully",
      data: subCategory,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateSubCategory(args) {
  try {
    const subCategory = await SubCategoryModel.findByIdAndUpdate(
      args._id,
      args.input,
      {
        new: true,
      }
    );
    if (!subCategory) throw new Error("Sub Category not found");
    return {
      success: true,
      message: "Sub Category updated successfully",
      data: subCategory,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteSubCategoryById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const subCategory = await SubCategoryModel.findByIdAndDelete(id);
    if (!subCategory) throw new Error("Sub Category not found");
    return {
      success: true,
      message: "Sub Category deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports.SubCategoryDataSource = {
  getAllSubCategories,
  getSubCategoryByName,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategoryById,
};
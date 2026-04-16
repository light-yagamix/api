const CategoryModel = require("./model");
const SubCategoryModel = require("../sub-category/model");
const ServiceModel = require("../service/model");

async function getAllCategories(args) {
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
        if (key === "status") {
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
    const categories = await CategoryModel.find(filterConditions)
      .populate({
        path: "sub_categories",
        populate: { path: "services" },
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRecords = await CategoryModel.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      success: true,
      message: "Categories fetched successfully",
      data: categories,
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

async function getCategoryByName(name) {
  const category = await CategoryModel.findOne({ name });
  return category || null;
}

async function getCategoryById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const category = await CategoryModel.findById(id);
    if (!category) throw new Error("Category not found");
    return {
      success: true,
      message: "Category fetched successfully",
      data: category,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createCategory(args) {
  try {
    const categoryExists = await getCategoryByName(args.name);
    if (categoryExists) throw new Error("Category already exists");
    const category = await CategoryModel.create(args);
    return {
      success: true,
      message: "Category created successfully",
      data: category,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateCategory(args) {
  try {
    const category = await CategoryModel.findByIdAndUpdate(
      args._id,
      args.input,
      {
        new: true,
      }
    );
    if (!category) throw new Error("Category not found");
    return {
      success: true,
      message: "Category updated successfully",
      data: category,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteCategoryById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const category = await CategoryModel.findByIdAndDelete(id);
    if (!category) throw new Error("Category not found");
    return {
      success: true,
      message: "Category deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports.CategoryDataSource = {
  getAllCategories,
  getCategoryByName,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategoryById,
};
const BlogModel = require("./model");

async function getAllBlogs(args) {
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
    const blogs = await BlogModel.find(filterConditions)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRecords = await BlogModel.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      success: true,
      message: "Blogs fetched successfully",
      data: blogs,
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

async function getBlogByName(name) {
  const blog = await BlogModel.findOne({ name });
  return blog || null;
}

async function getBlogById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const blog = await BlogModel.findById(id);
    if (!blog) throw new Error("blog not found");
    return {
      success: true,
      message: "blog fetched successfully",
      data: blog,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getBlogBySlug(slug) {
  try {
    if (!slug) throw new Error("Slug is required");
    const blog = await BlogModel.findOne({ slug });
    if (!blog) throw new Error("blog not found");
    return {
      success: true,
      message: "blog fetched successfully",
      data: blog,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createBlog(args) {
  try {
    // const blogExists = await getBlogByName(args.name);
    // if (blogExists) throw new Error("blog already exists");
    const blog = await BlogModel.create(args);
    return {
      success: true,
      message: "Blog created successfully",
      data: blog,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateBlog(args) {
  try {
    const blog = await BlogModel.findByIdAndUpdate(args._id, args.input, {
      new: true,
    });
    if (!blog) throw new Error("blog not found");
    return {
      success: true,
      message: "Blog updated successfully",
      data: blog,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deleteBlogById(id) {
  try {
    if (!id) throw new Error("Id is required");
    const blog = await BlogModel.findByIdAndDelete(id);
    if (!blog) throw new Error("Blog not found");
    return {
      success: true,
      message: "Blog deleted successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports.BlogDataSource = {
  getAllBlogs,
  getBlogByName,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlogById,
};

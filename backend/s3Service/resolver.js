const { s3Service } = require("./datasource");

const queries = {};

const mutations = {
  getPresignedUrl: s3Service.getPresignedUrl,
};

module.exports.resolvers = { queries, mutations };

// Mutation: {
//   },

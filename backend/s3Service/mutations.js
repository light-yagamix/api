const mutations = `#graphql
getPresignedUrl(key: String!, expiresIn: Int, contentType: String): String!
`;
module.exports.mutations = mutations;

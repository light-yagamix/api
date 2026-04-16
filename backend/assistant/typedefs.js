const typedefs = `
  enum AIStyle {
    polite
    concise
    versatile
    creative
  }

  input AIMessageInput {
    role: String!
    content: String!
    timestamp: String
    id: String
  }

  type AIResponseMetadata {
    processingTimeMs: Int
    model: String
    queryType: String
  }

  type AIResponse {
    success: Boolean!
    message: String
    content: String
    metadata: AIResponseMetadata
  }
`;

module.exports.typedefs = typedefs;

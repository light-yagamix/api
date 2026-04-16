const typedefs = `
  type ServiceOptionType {
    _id: String
    label: String
    price: Float
  }

  input ServiceOptionInput {
    _id: String
    label: String
    price: Float
  }

  type ExtractedData {
    service_id: String
    service_name: String
    service_type: String
    service_option: ServiceOptionType
    problem_description: String
    preferred_date: String
    start_time: String
    end_time: String
    duration_hours: Float
    number_of_customers: Int
    number_of_tradesmen: Int
    location: String
    booking_mode: String
    phase: String
    booking_ready: Boolean
    allFieldsCollected: Boolean
  }

  type AIConversationMessage {
    _id: String!
    conversation: String!
    role: String!
    content: String!
    image_url: String
    extracted_data: ExtractedData
    created_at: String
    updated_at: String
  }

  type AIConversation {
    _id: String!
    user: User
    session_id: String
    status: String!
    last_extracted_data: ExtractedData
    created_at: String
    updated_at: String
  }

  type AIConversationResponse {
    success: Boolean!
    message: String
    data: AIConversation
  }

  type AIConversationMessagesResponse {
    success: Boolean!
    message: String
    data: [AIConversationMessage]
  }

  type BookingAIResponse {
    success: Boolean!
    message: String
    content: String
    extracted_data: ExtractedData
    available_services: [Service]
    service_options: [ServiceOptionType]
    checkout_url: String
    booking_id: String
    booking_success: Boolean
    booking_message: String
    allFieldsCollected: Boolean
  }

  input ExtractedDataInput {
    service_id: String
    service_name: String
    service_type: String
    service_option: ServiceOptionInput
    problem_description: String
    preferred_date: String
    start_time: String
    end_time: String
    duration_hours: Float
    number_of_customers: Int
    number_of_tradesmen: Int
    location: String
    booking_mode: String
    phase: String
    booking_ready: Boolean
    allFieldsCollected: Boolean
  }
`;

module.exports.typedefs = typedefs;

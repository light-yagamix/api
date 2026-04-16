const typedefs = `
  type TimeSlot {
    _id: String
    user: User
    tradesman: User
    booking: Booking
    booking_id: String
    service: Service
    startTime: String
    endTime: String
    date: String
    created_at: String
    updated_at: String
  }

  type GetAllTimeSlotsResponse {
    success: Boolean!
    message: String!
    data: [TimeSlot]
    pageInfo: PageInfo
  }


  type TimeSlotsByDayResponse {
  success: Boolean!
  message: String
  data: [TimeSlot]!
  }
  
  type TimeSlotResponse {
    success: Boolean!
    message: String!
    data: TimeSlot
  }

  input TimeSlotInput {
    user: String
    tradesman: String
    booking: String
    booking_id: String
    service: String
    startTime: String
    endTime: String
    date: String
  }

  input TimeSlotFilterInput {
    user: String
    tradesman: String
    booking: String
    service: String
    startTime: String
    endTime: String
    date: String
  }
`;

module.exports.typedefs = typedefs;

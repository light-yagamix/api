const queries = `#graphql 

  getAllTimeSlots(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: TimeSlotFilterInput
  ): GetAllTimeSlotsResponse

    getTimeSlotsByDay(
    filters: TimeSlotFilterInput
  ): TimeSlotsByDayResponse

  getTimeSlotById(_id: String!): TimeSlotResponse

`;

module.exports.queries = queries;

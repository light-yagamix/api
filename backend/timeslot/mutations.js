const mutations = `#graphql

  createTimeSlot(input: TimeSlotInput!): TimeSlotResponse

  updateTimeSlot(_id: String!, input: TimeSlotInput!): TimeSlotResponse

  deleteTimeSlotById(_id: String!): Response

`;

module.exports.mutations = mutations;

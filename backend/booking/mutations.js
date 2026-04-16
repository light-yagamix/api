const mutations = `#graphql

    createBooking(input: CreateBookingInput!): CreateBookingResponse

    updateBooking(id: String!, input: UpdateBookingInput!): UpdateBookingResponse

    deleteBookingById(id: String!): DeleteBookingResponse

    cleanupOrphanedTimeSlots: CleanupTimeSlotsResponse

      
`;

module.exports.mutations = mutations;

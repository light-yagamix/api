const queries = `#graphql 

    getBookingById(id: String!): GetBookingResponse

    getAllBookings(
    page: Int,
    limit: Int,
    sortField: String,
    sortOrder: String,
    filters: BookingFilterInput
  ): GetAllBookingsResponse

    getTradesmanEarnings(
    tradesmanId: String,
    filters: BookingFilterInput
  ): TradesmanEarningsResponse

    getUserCosts(
    userId: String,
    filters: BookingFilterInput
  ): UserCostsResponse
    
`;
module.exports.queries = queries;

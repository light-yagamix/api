const typedefs = `
  type BookingServiceOption {
    _id: String
    label: String
    price: Float
  }

  input BookingServiceOptionInput {
    _id: String
    label: String
    price: Float
  }

  type Booking { 
    _id: String
    booking_id: String
    user: User
    number_of_tradesman: Int
    number_of_customers: Int
    tradesman: [User]
    userTradesmanChoice: String
    service: Service
    service_option: BookingServiceOption
    addons: [AddonType]
    status: String
    payment: BookingPayment
    date: String
    day: String
    startTime: String
    endTime: String
    created_at: Float
    updated_at: Float
    dispute: Boolean
    address: String
    city: String
    location: BookingLocation
    user_instructions: String
    user_instructions_images: [String]
    tradesman_completed_at: String
    user_completed_at: String
    message: String
    isCancellable: Boolean
    isUpdatable: Boolean
    enroute_status: String
  }

  type AddonType {
    quantity: Int
    addon: Addon
  }
  
  type BookingLocation {
   type: String
   coordinates: [Float]
  }

  type BookingPayment {
    service_charges: Float
    other_charges: Float
    other_charges_description: String  
    total_charges: Float 
    currency: String
    payment_method: String 
    payment_status: String
  }
 

  input BookingAddonInput {
   _id: String
   selectedPrice: String
   quantity: Int
  }


 
  input CreateBookingInput { 
    user: String!
    tradesman: [String]
    userTradesmanChoice: String
    service: String!
    service_option: BookingServiceOptionInput
    addons: [BookingAddonInput]
    status: String
    payment: PaymentInput
    date: String!
    day: String!
    startTime: String
    endTime: String
    address: String
    city: String
    location: BookingLocationInput
    user_instructions: String
    user_instructions_images: [String]
    message: String
    number_of_tradesman: Int
    number_of_customers: Int
    enroute_status: String
  }

  input BookingLocationInput {
    type: String
    coordinates: [Float]
  }

  input UpdateBookingInput { 
    user: String
    tradesman: [String]
    userTradesmanChoice: String
    service: String
    service_option: BookingServiceOptionInput
    addons: [BookingAddonInput]
    status: String
    payment: PaymentInput
    date: String
    day: String
    startTime: String
    endTime: String
    tradesman_completed_at: String
    user_completed_at: String
    dispute: Boolean
    address: String
    city: String
    location: BookingLocationInput
    user_instructions: String
    user_instructions_images: [String]
    message: String
    number_of_tradesman: Int
    number_of_customers: Int
    enroute_status: String
    rejectedBy: String
    rejectionReason: String
  }
  input PaymentInput {  
    service_charges: Float
    other_charges: Float
    other_charges_description: String  
    total_charges: Float 
    currency: String
    payment_method: String 
    payment_status: String
  }


  type GetBookingResponse {
    success: Boolean
    message: String
    data: Booking
    isEditable: Boolean
    isCancellable: Boolean
  }

  type GetAllBookingsResponse {
    success: Boolean
    message: String
    data: [Booking]
    pageInfo: PageInfo
  }
    
 

  type CreateBookingResponse {
    success: Boolean
    message: String
    data: String
  }

  type UpdateBookingResponse {
    success: Boolean
    message: String
    data: String
  }

  type DeleteBookingResponse {
    success: Boolean
    message: String
  }

  type CleanupTimeSlotsResponse {
    success: Boolean
    message: String
    data: Int
  }

  type TradesmanEarningsResponse {
    success: Boolean
    message: String
    data: TradesmanEarningsData
  }

  type TradesmanEarningsData {
    totalEarnings: Float
    totalBookings: Int
    averageEarningsPerBooking: Float
    earningsByPeriod: [EarningsPeriod]
    currency: String
  }

  type UserCostsResponse {
    success: Boolean
    message: String
    data: UserCostsData
  }

  type UserCostsData {
    totalCosts: Float
    totalBookings: Int
    averageCostPerBooking: Float
    costsByPeriod: [CostsPeriod]
    currency: String
  }

  type EarningsPeriod {
    period: String
    amount: Float
    bookingCount: Int
  }

  type CostsPeriod {
    period: String
    amount: Float
    bookingCount: Int
  }

  input BookingFilterInput {
    user: String
    tradesman: String
    service: String
    status: String
    payment_status: String
    booking_id: String
    dispute: Boolean
    city: String
    startTime: String
    endTime: String
    date: String
    day: String
    dateRange: String
    enroute_status: String
  }
 
`;

module.exports.typedefs = typedefs;

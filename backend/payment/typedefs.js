const typedefs = `
 
 
type Payment {
  _id: ID
  user: User
  total_charges: Float
  currency: String
  booking: Booking
  payment_method: String
  payment_status: String
  stripe_payment_intent_id: String
  stripe_charge_id: String
  stripe_session_id: String
  stripe_customer_id: String
  stripe_refund_id: String
  refund_status: String
  receipt_url: String
  created_at: String
  updated_at: String
}

type GetAllPaymentsResponse {
  success: Boolean!
  message: String
  data: [Payment]   
  count: Int        
}

type GetPaymentResponse {
  success: Boolean!
  message: String
  data: Payment     
}

type RefundResponse {
success: Boolean
message: String
refundId: String
}

type Query {
  getPaymentById(id: ID!): GetPaymentResponse
  getAllPayments: GetAllPaymentsResponse   
}

type Mutation {
  createCheckoutSession(
    user: ID
    total_charges: Float
    currency: String
    booking: ID
  ): PaymentResponse
  createRefund(
    paymentId: ID
    amount: Float
  ): RefundResponse
}

type PaymentResponse {
  success: Boolean
  message: String
  data: Payment
  sessionUrl: String
}
 `;

module.exports.typedefs = typedefs;

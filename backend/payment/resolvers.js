const { PaymentDataSource } = require("./datasource");
const authorize = require("../authorize");

const queries = {
  getPaymentById: authorize("GET_PAYMENT_DETAILS")(
    async (parent, args, context, info) => {
      if (!args?.id) throw new Error("Payment ID is required");

      try {
        const payment = await PaymentDataSource.getPaymentById(args.id);

        if (!payment) throw new Error("Payment not found");
        return payment;
      } catch (error) {
        console.error("Payment fetch error:", error.message);
        throw new Error("Failed to fetch payment details");
      }
    }
  ),
  getAllPayments: authorize("GET_ALL_PAYMENTS")(
    async (parent, args, context, info) => {
      try {
        const payments = await PaymentDataSource.getAllPayments();

        return payments;
      } catch (error) {
        console.error("Get all payments error:", error.message);
        throw new Error("Failed to retrieve payments");
      }
    }
  ),
};

const mutations = {
  createCheckoutSession: authorize("CREATE_PAYMENT_SESSION")(
    async (parent, args, context, info) => {
      try {
        const { user, total_charges, currency, booking } = args;

        if (!user || total_charges == null || !currency) {
          throw new Error(
            "Missing required fields: user, total_charges, and currency"
          );
        }

        if (total_charges <= 0) {
          throw new Error("Total charges must be positive");
        }

        const sessionUrl = await PaymentDataSource.createCheckoutSession({
          user,
          total_charges,
          currency,
          booking,
        });

        return {
          success: true,
          message: "Payment session created",
          sessionUrl,
          data: null,
        };
      } catch (error) {
        console.error("Checkout session error:", error.message);
        throw new Error(error.message);
      }
    }
  ),
  createRefund: authorize("CREATE_REFUND")(
    async (parent, args, context, info) => {
      try {
        const { paymentId, amount } = args;
        if (!paymentId) {
          throw new Error("Payment ID is required");
        }
        if (amount && amount <= 0) {
          throw new Error("Refund amount must be positive");
        }
        const refundResponse = await PaymentDataSource.createRefund({
          paymentId,
          amount,
        });
        return refundResponse;
      } catch (error) {
        console.error("Refund error:", error.message);
        throw new Error(error.message);
      }
    }
  ),
};

module.exports.resolvers = { queries, mutations };

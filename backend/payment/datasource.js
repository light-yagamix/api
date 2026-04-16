const PaymentModel = require("./model");
const BookingModel = require("../booking/model");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async ({
  user,
  total_charges,
  currency,
  booking,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const successPath = process.env.NEXT_PUBLIC_SUCCESS_URL;
  const cancelPath = process.env.NEXT_PUBLIC_CANCEL_URL;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "Payment",
            },
            unit_amount: total_charges * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: {
        booking: booking,
      },
    });

    await PaymentModel.create({
      user,
      total_charges,
      currency,
      payment_method: "online",
      stripe_session_id: session.id,
      payment_status: "pending",
      booking: booking,
    });
    return session.url;
  } catch (error) {
    console.error("Checkout session error:", error.message);
    throw new Error(error.message);
  }
};

const getPaymentById = async (id) => {
  return await PaymentModel.find(id);
};

const getAllPayments = async () => {
  try {
    const payments = await PaymentModel.find()
      .populate({
        path: "user",
        select: "first_name last_name email",
      })
      .populate({
        path: "booking",
        select: "booking_id",
      })
      .sort({ created_at: -1 });

    return {
      success: true,
      message: "Payments fetched successfully",
      data: payments,
      count: payments.length,
    };
  } catch (error) {
    console.error("Get all payments error:", error);
    throw new Error("Failed to retrieve payments");
  }
};

const createRefund = async ({ paymentId, amount }) => {
  try {
    const payment = await PaymentModel.findOne({
      stripe_payment_intent_id: paymentId,
    }).populate({
      path: "booking",
      select: "booking_id",
    });

    if (!payment) {
      throw new Error("Payment not found");
    }
    if (payment.payment_status !== "completed") {
      throw new Error("Payment not completed and cannot be refunded");
    }
    if (!payment.stripe_charge_id) {
      throw new Error("No Stripe charge ID found for this payment");
    }
    if (payment.refund_status === "pending") {
      throw new Error("A refund is already in progress for this payment");
    }

    const refundAmount = amount ? amount : payment.total_charges;

    const refund = await stripe.refunds.create({
      charge: payment.stripe_charge_id,
      amount: refundAmount,
    });

    await PaymentModel.findByIdAndUpdate(
      payment._id,
      {
        refund_status: "pending",
        stripe_refund_id: refund.id,
      },
      { new: true }
    );

    return {
      success: true,
      message: `Refund initiated against ${payment?.booking?.booking_id} for ${refund.amount} ${payment.currency} `,
      refundId: refund.id,
    };
  } catch (error) {
    console.error("Refund error:", error.message);
    throw new Error(error.message);
  }
};

const handleStripeWebhook = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (error) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent
    );

    if (paymentIntent.latest_charge) {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);

      await PaymentModel.findOneAndUpdate(
        { stripe_session_id: session.id },
        {
          payment_status: "completed",
          stripe_payment_intent_id: session.payment_intent,
          stripe_charge_id: charge.id,
          receipt_url: charge.receipt_url,
          booking: session.metadata.booking,
        },
        { upsert: true, new: true }
      );
      const booking = await BookingModel.findByIdAndUpdate(
        session.metadata.booking,
        { "payment.payment_status": "completed" },
        { upsert: true, new: true }
      );
    } else {
      console.error("No latest_charge found in paymentIntent");
      return res.status(400).send("No charge data available");
    }
  } else if (
    event.type === "refund.created" ||
    event.type === "refund.updated"
  ) {
    const refund = event.data.object;
    const payment = await PaymentModel.findOne({
      stripe_charge_id: refund.charge,
    });

    if (!payment) {
      console.error("Payment not found for refund:", refund.charge);
      return res.status(404).send("Payment not found");
    }

    // Map Stripe refund status to schema refund_status
    const statusMap = {
      pending: "pending",
      succeeded: "completed",
      failed: "failed",
      requires_action: "pending", // Treat as pending if additional action is needed
      canceled: "failed", // Treat canceled refunds as failed
    };
    const refundStatus = statusMap[refund.status] || "pending"; // Default to pending for unknown statuses

    await PaymentModel.findByIdAndUpdate(
      payment._id,
      {
        refund_status: refundStatus,
        stripe_refund_id: refund.id, // Ensure refund ID is updated
      },
      { new: true }
    );
  }

  res.status(200).json({ received: true });
};

module.exports.PaymentDataSource = {
  createCheckoutSession,
  getPaymentById,
  getAllPayments,
  createRefund,
  handleStripeWebhook,
};

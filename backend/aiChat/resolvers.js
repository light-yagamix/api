const { ConversationDataSource } = require("./datasource");
const { AssistantDataSource } = require("../assistant/datasource");

const queries = {
  getActiveConversation: async (parent, args) => {
    return ConversationDataSource.getActiveConversation({
      userId: args.userId,
      sessionId: args.sessionId,
    });
  },
};

const mutations = {
  createConversation: async (parent, args) => {
    return ConversationDataSource.createConversation({
      userId: args.userId,
      sessionId: args.sessionId,
    });
  },

  updateConversationStatus: async (parent, args) => {
    return ConversationDataSource.updateConversationStatus(
      args.id,
      args.status,
    );
  },

  closeConversation: async (parent, args) => {
    return ConversationDataSource.closeConversation(args.id);
  },

  sendBookingMessageWithImage: async (parent, args, context) => {
    const { conversationId, message, imageUrl } = args;

    if (!conversationId || !imageUrl) {
      return {
        success: false,
        message: "conversationId and imageUrl are required",
        content: null,
        extracted_data: null,
        available_services: [],
        checkout_url: null,
        booking_id: null,
        allFieldsCollected: false,
      };
    }

    const userId = context?.user?._id || null;

    return AssistantDataSource.analyzeImageForBooking(
      conversationId,
      imageUrl,
      message || "",
      userId,
    );
  },

  sendBookingMessage: async (parent, args, context) => {
    const { conversationId, message } = args;

    if (!conversationId || !message) {
      return {
        success: false,
        message: "conversationId and message are required",
        content: null,
        extracted_data: null,
        available_services: [],
        checkout_url: null,
        booking_id: null,
      };
    }

    // Get user ID from context if authenticated
    const userId = context?.user?._id || null;

    return AssistantDataSource.processBookingMessage(
      conversationId,
      message,
      userId,
    );
  },

  confirmAutomaticBooking: async (parent, args, context) => {
    const { conversationId, location, lat, lng } = args;
    const userId = context?.user?._id;

    if (!userId) {
      return {
        success: false,
        message: "You must be logged in to book automatically",
      };
    }

    // 1. Get the latest extracted data for this conversation
    const lastExtractedData =
      await ConversationDataSource.getLastExtractedData(conversationId);

    if (!lastExtractedData) {
      return {
        success: false,
        message: "No booking context found for this conversation",
      };
    }

    // 2. Update data with location and mode
    lastExtractedData.booking_mode = "automatic";
    if (location) lastExtractedData.location = location;
    // If we have lat/lng, we could store it too, but extractedData usually just has location string
    if (lat && lng && !lastExtractedData.location) {
      lastExtractedData.location = `${lat}, ${lng}`;
    }

    // Recalculate readiness for automatic booking using the latest data
    // Check is service_type-aware: only the relevant count field is required

    // Re-populate service_type from services.json if missing (AI merge may have wiped it)
    if (lastExtractedData.service_id && !lastExtractedData.service_type) {
      const servicesData = require("../assistant/services.json");
      const knownService = servicesData.find(
        (s) =>
          s._id === lastExtractedData.service_id ||
          (s._id && s._id.$oid === lastExtractedData.service_id),
      );
      if (knownService) {
        lastExtractedData.service_type =
          knownService.service_type || "tradesman_based";
      }
    }

    const serviceType = lastExtractedData.service_type || "tradesman_based";
    const hasCountField =
      serviceType === "customer_based"
        ? lastExtractedData.number_of_customers ||
          lastExtractedData.number_of_customers === 0
        : lastExtractedData.number_of_tradesmen ||
          lastExtractedData.number_of_tradesmen === 0;

    // Default the OTHER count field to 1 so executeAutomaticBooking has both
    if (
      serviceType === "customer_based" &&
      !lastExtractedData.number_of_tradesmen
    ) {
      lastExtractedData.number_of_tradesmen = 1;
    }
    if (
      serviceType === "tradesman_based" &&
      !lastExtractedData.number_of_customers
    ) {
      lastExtractedData.number_of_customers = 1;
    }

    const hasEssentialFields =
      lastExtractedData.service_id &&
      lastExtractedData.preferred_date &&
      lastExtractedData.start_time &&
      lastExtractedData.end_time &&
      hasCountField;

    // Require explicit service option selection for booking
    const hasServiceOption = !!lastExtractedData.service_option;

    if (!hasEssentialFields || !hasServiceOption) {
      console.error("confirmAutomaticBooking: Missing fields:", {
        service_id: lastExtractedData.service_id,
        preferred_date: lastExtractedData.preferred_date,
        start_time: lastExtractedData.start_time,
        end_time: lastExtractedData.end_time,
        service_type: serviceType,
        number_of_customers: lastExtractedData.number_of_customers,
        number_of_tradesmen: lastExtractedData.number_of_tradesmen,
        hasCountField,
        service_option: lastExtractedData.service_option,
      });
      return {
        success: false,
        message: "Booking details are incomplete for automatic booking",
      };
    }

    lastExtractedData.booking_ready = true;

    // 3. Execute booking
    const bookingResult = await AssistantDataSource.executeAutomaticBooking(
      lastExtractedData,
      userId,
    );

    if (bookingResult.success) {
      // 4. Update conversation
      await ConversationDataSource.updateConversationStatus(
        conversationId,
        "booking_completed",
      );

      // 5. Add a system message confirming booking
      await ConversationDataSource.addMessage({
        conversationId,
        role: "assistant",
        content: `Booking confirmed! Your booking ID is ${
          bookingResult.data?._id || "confirmed"
        }.`,
        extractedData: lastExtractedData,
      });
    }

    return {
      success: bookingResult.success,
      message: bookingResult.message,
      content: null,
      extracted_data: lastExtractedData,
      available_services: [],
      checkout_url: null,
      booking_id: bookingResult.data?._id || null,
      booking_success: bookingResult.success,
      booking_message: bookingResult.message || null,
    };
  },
};

module.exports.resolvers = { queries, mutations };

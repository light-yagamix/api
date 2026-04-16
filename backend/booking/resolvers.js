const { BookingService } = require("./datasource");

const authorize = require("../authorize");

const queries = {
  getBookingById: authorize("GET_BOOKING_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!args) throw new Error("Invalid arguments");
        if (!args.id) throw new Error("Booking ID is required");
        return await BookingService.getBookingById(args.id);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  getAllBookings: authorize("GET_ALL_BOOKINGS")(
    async (parent, args, context, info) => {
      try {
        if (!args) throw new Error("Invalid arguments");

        const { user } = context;
        if (!user) throw new Error("Unauthorized");

        args.filters = args.filters || {};

        if (user.role === "user") {
          args.filters.user = user._id;
        } else if (user.role === "tradesman") {
          args.filters.tradesman = user._id;
        }

        return await BookingService.getAllBookings(args);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  getTradesmanEarnings: authorize("GET_TRADESMAN_EARNINGS")(
    async (parent, args, context, info) => {
      try {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");

        // If no tradesmanId provided, use current user's ID (must be tradesman)
        const tradesmanId = args.tradesmanId || user._id;

        // Ensure tradesman can only view their own earnings unless admin
        if (user.role === "tradesman" && tradesmanId !== user._id) {
          throw new Error("You can only view your own earnings");
        }

        return await BookingService.getTradesmanEarnings(
          tradesmanId,
          args.filters
        );
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  getUserCosts: authorize("GET_USER_COSTS")(
    async (parent, args, context, info) => {
      try {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");

        // If no userId provided, use current user's ID (must be user)
        const userId = args.userId || user._id;

        // Ensure user can only view their own costs unless admin
        if (user.role === "user" && userId !== user._id) {
          throw new Error("You can only view your own costs");
        }

        return await BookingService.getUserCosts(userId, args.filters);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),
};

const mutations = {
  createBooking: authorize("CREATE_BOOKING")(
    async (parent, args, context, info) => {
      try {
        if (!args) throw new Error("Invalid arguments");
        if (!args.input) throw new Error("Booking input is required");
        return await BookingService.createBooking(args.input);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  updateBooking: authorize("UPDATE_BOOKING")(
    async (parent, args, context, info) => {
      try {
        if (!args) throw new Error("Invalid arguments");
        if (!args.id) throw new Error("Booking ID is required");

        if (context.user.role === "user") {
          if (args.input.status === "completed") {
            args.input.status = "completedByUser";
            args.input.user_completed_at = new Date();
          }
          if (args.input.status === "incomplete") {
            args.input.dispute = true;
            args.input.status = "incomplete";
          }
        }

        if (context.user.role === "tradesman") {
          // When tradesman clicks "Start Booking" button, they send inProgress status
          if (args.input.status === "inProgress") {
            // Verify the booking is in accepted state
            const booking = await require("./model").findById(args.id);
            if (booking && booking.status !== "accepted") {
              throw new Error(
                `Cannot start booking. Current status is ${booking.status}, must be 'accepted'`
              );
            }

            // Validate time constraints - booking can only be started at or after startTime
            if (booking.startTime) {
              const now = new Date();
              const startTime = new Date(booking.startTime);
              if (now < startTime) {
                const diffMinutes = Math.ceil((startTime - now) / (1000 * 60));
                throw new Error(
                  `Cannot start booking before scheduled time. Booking starts in ${diffMinutes} minutes.`
                );
              }
            }

            // Status transition is already set to inProgress
            args.input.status = "inProgress";
            args.input.started_at = new Date();

            // Mark tradesman as offline when booking starts
            // We'll handle this in the datasource updateBooking method
            args.input._forceTradesmanOffline = true;
          } else if (args.input.status === "completed") {
            // When tradesman completes the booking after starting it
            args.input.status = "completedByTradesman";
            args.input.tradesman_completed_at = new Date();
          }
        }

        return await BookingService.updateBooking({ ...args.input }, args.id);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  deleteBookingById: authorize("DELETE_BOOKING_BY_ID")(
    async (parent, args, context, info) => {
      try {
        if (!args) throw new Error("Invalid arguments");
        if (!args.id) throw new Error("Booking ID is required");
        return await BookingService.deleteBookingById(args.id);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
    }
  ),

  cleanupOrphanedTimeSlots: authorize("DELETE_BOOKING_BY_ID")(
    // Using same permission level as delete
    async (parent, args, context, info) => {
      try {
        const deletedCount = await BookingService.cleanupOrphanedTimeSlots();
        return {
          success: true,
          message: `Successfully cleaned up ${deletedCount} orphaned time slots`,
          data: deletedCount,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          data: 0,
        };
      }
    }
  ),
};

module.exports.resolvers = { queries, mutations };

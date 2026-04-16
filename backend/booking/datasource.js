const BookingModel = require("./model");
const UserModel = require("../user/model");
const mongoose = require("mongoose");
const ServiceModel = require("../service/model");
const TimeSlotModel = require("../timeslot/model");
const { sendNotification } = require("../utils/notification");
const NotificationModel = require("../notification/model");
const { SendEmail } = require("../notification/utils");
const { UserService } = require("../user/datasource");

// Helper functions for consistent date/time formatting
const formatDate = (dateValue) => {
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

const formatTime = (timeValue) => {
  try {
    const time = new Date(timeValue);
    if (isNaN(time.getTime())) return "Invalid Time";

    return time.toLocaleTimeString("en-PK", {
      timeZone: "Asia/Karachi",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "Invalid Time";
  }
};

// Utility function to clean up orphaned time slots
const cleanupOrphanedTimeSlots = async () => {
  try {
    console.log("🧹 Starting cleanup of orphaned time slots...");

    // Find time slots that reference non-existent bookings or canceled/completed bookings
    const orphanedSlots = await TimeSlotModel.aggregate([
      {
        $lookup: {
          from: "bookings",
          localField: "booking",
          foreignField: "_id",
          as: "bookingData",
        },
      },
      {
        $match: {
          $or: [
            { bookingData: { $size: 0 } }, // No matching booking (orphaned)
            {
              "bookingData.status": {
                $in: [
                  "cancelled",
                  "canceled",
                  "completed",
                  "completedByUser",
                  "completedByTradesman",
                  "rejected",
                ],
              },
            }, // Completed/canceled bookings
          ],
        },
      },
    ]);

    let deleteResult = { deletedCount: 0 };

    if (orphanedSlots.length > 0) {
      const slotIds = orphanedSlots.map((slot) => slot._id);
      deleteResult = await TimeSlotModel.deleteMany({
        _id: { $in: slotIds },
      });

      console.log(
        `🗑️ Cleaned up ${deleteResult.deletedCount} orphaned time slots`
      );

      // Log details for debugging
      orphanedSlots.forEach((slot, index) => {
        console.log(`Deleted slot ${index + 1}:`, {
          slotId: slot._id,
          bookingId: slot.booking_id,
          tradesman: slot.tradesman,
          bookingStatus: slot.bookingData[0]?.status || "not found",
        });
      });
    } else {
      console.log("✅ No orphaned time slots found");
    }

    return deleteResult.deletedCount;
  } catch (error) {
    console.error("❌ Error cleaning up orphaned time slots:", error);
    throw error;
  }
};

const sendBookingStatusNotification = async (
  booking,
  status,
  userId,
  extraData = {}
) => {
  try {
    const statusText = status.toLowerCase();
    const title = `Booking ${
      statusText.charAt(0).toUpperCase() + statusText.slice(1)
    }`;
    let body;
    switch (status) {
      case "accepted":
        body = `Great news! Your booking #${
          booking.booking_id
        } has been accepted by the professional. Scheduled for ${formatDate(
          booking.date
        )} from ${formatTime(booking.startTime)} to ${formatTime(
          booking.endTime
        )}. The professional will arrive at the scheduled time. Thank you!`;
        break;
      case "rejected":
        body = extraData.rejectionReason
          ? `We regret to inform you that your booking #${
              booking.booking_id
            } scheduled for ${formatDate(booking.date)} from ${formatTime(
              booking.startTime
            )} to ${formatTime(
              booking.endTime
            )} has been declined by the professional. Reason: ${
              extraData.rejectionReason
            }. Please feel free to select another available professional for your service needs.`
          : `We regret to inform you that your booking #${
              booking.booking_id
            } scheduled for ${formatDate(booking.date)} from ${formatTime(
              booking.startTime
            )} to ${formatTime(
              booking.endTime
            )} has been declined by the professional. Please feel free to select another available professional for your service needs.`;
        break;
      case "cancelled":
        body = `Your booking #${
          booking.booking_id
        } has been cancelled. Originally scheduled for ${formatDate(
          booking.date
        )} from ${formatTime(booking.startTime)} to ${formatTime(
          booking.endTime
        )}. If you need to rebook this service, please create a new booking. Thank you for your understanding.`;
        break;
      case "in-progress":
        body = `Your booking #${
          booking.booking_id
        } is now in progress! Scheduled for ${formatDate(
          booking.date
        )} from ${formatTime(booking.startTime)} to ${formatTime(
          booking.endTime
        )}. The professional is currently working on your service.`;
        break;
      default:
        body = `Your booking #${
          booking.booking_id
        } has been updated to ${statusText}. Scheduled for ${formatDate(
          booking.date
        )} from ${formatTime(booking.startTime)} to ${formatTime(
          booking.endTime
        )}.`;
    }
    const notificationPayload = {
      title,
      body,
      data: {
        bookingId: booking._id.toString(),
        booking_id: booking.booking_id.toString(),
        type: `booking_${statusText}`,
        title,
        message: body,
        ...extraData,
      },
    };
    console.log("Sending user notification payload:", notificationPayload);
    const result = await sendNotification(userId, notificationPayload);
    console.log(`Notification result for user ${userId}:`, result.message);

    try {
      const notificationData = {
        sender: null,
        recipient: userId,
        category: "booking",
        title,
        message: body,
        type: "notification",
        status: "unread",
        priority: "normal",
        action_url: null, // Can be set to a URL if needed, e.g., `/booking/${booking._id}`
      };
      await NotificationModel.create(notificationData);
      console.log(`Notification saved to DB for user ${userId}`);
    } catch (dbError) {
      console.error(
        `Failed to save notification to DB for user ${userId}:`,
        dbError.message
      );
    }
  } catch (error) {
    console.error(
      `Failed to send notification to user ${userId}:`,
      error.message
    );
  }
};

const isTradesmanAvailable = async (tradesmanId, startTime, endTime, date) => {
  try {
    // First, clean up any orphaned time slots to ensure accurate availability check
    await cleanupOrphanedTimeSlots();

    // Convert inputs to Pakistan timezone-aware Date objects
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    const bookingDate = new Date(date);

    // Create start and end of day in local timezone (Pakistan)
    const startOfDay = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate(),
      23,
      59,
      59,
      999
    );

    console.log(`🔍 Availability Check for Tradesman ${tradesmanId}:`);
    console.log("Requested slot:", {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      date: bookingDate.toISOString().split("T")[0],
    });

    const existingSlots = await TimeSlotModel.find({
      tradesman: tradesmanId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).populate("booking", "booking_id status");

    console.log(
      `📅 Found ${existingSlots.length} existing slots for tradesman ${tradesmanId}:`
    );

    if (existingSlots.length === 0) {
      console.log("✅ No existing slots - tradesman available");
      return true;
    }

    // Log all existing slots for debugging
    existingSlots.forEach((slot, index) => {
      console.log(`Slot ${index + 1}:`, {
        bookingId: slot.booking_id,
        bookingStatus: slot.booking?.status || "unknown",
        start: slot.startTime,
        end: slot.endTime,
        slotId: slot._id,
      });
    });

    const conflictingSlots = [];
    const hasConflict = existingSlots.some((slot) => {
      const slotStart =
        slot.startTime instanceof Date
          ? slot.startTime
          : new Date(slot.startTime);
      const slotEnd =
        slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime);

      const conflict = startDateTime < slotEnd && slotStart < endDateTime;

      if (conflict) {
        conflictingSlots.push({
          bookingId: slot.booking_id,
          bookingStatus: slot.booking?.status || "unknown",
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          slotId: slot._id,
        });
      }

      return conflict;
    });

    if (hasConflict) {
      console.log("❌ CONFLICTS DETECTED!");
      console.log("Conflicting slots:", conflictingSlots);
      console.log(
        "⚠️ These slots may be from rejected/canceled bookings that weren't cleaned up properly"
      );
    } else {
      console.log("✅ No conflicts - tradesman available");
    }

    return !hasConflict;
  } catch (error) {
    console.error("❌ Error in isTradesmanAvailable:", error);
    throw new Error(error.message);
  }
};

const createBooking = async (args) => {
  try {
    if (!args) throw new Error("Invalid arguments");

    const {
      service,
      startTime,
      endTime,
      date,
      user,
      number_of_tradesman,
      userTradesmanChoice,
      tradesman,
      addons,
      ...restArgs
    } = args;

    // Transform addons from GraphQL input format to model format
    const transformedAddons = addons
      ? addons.map((addon) => ({
          addon: addon._id,
          quantity: addon.quantity || 1,
        }))
      : [];

    // Ensure inputs are in proper ISO format
    const startDateTime = new Date(startTime); // Don't convert to ISO immediately
    const endDateTime = new Date(endTime); // Don't convert to ISO immediately
    const bookingDate = new Date(date);

    // Check userTradesmanChoice
    if (userTradesmanChoice === "manual") {
      if (!tradesman || tradesman.length === 0) {
        throw new Error("Tradesman selection is required for manual choice");
      }

      // Validate that the provided tradesmen exist and have the required skill
      const selectedTradesmen = await UserModel.find({
        _id: { $in: tradesman.map((id) => new mongoose.Types.ObjectId(id)) },
        skills: { $in: [new mongoose.Types.ObjectId(service)] },
      });

      if (selectedTradesmen.length !== tradesman.length) {
        throw new Error(
          "One or more selected tradesmen are not available for this service"
        );
      }

      // Check availability for the selected tradesmen
      const availabilityChecks = await Promise.all(
        selectedTradesmen.map(async (tradesmanObj) => {
          try {
            const isAvailable = await isTradesmanAvailable(
              tradesmanObj._id,
              startDateTime,
              endDateTime,
              bookingDate
            );
            return { tradesman: tradesmanObj, available: isAvailable };
          } catch (error) {
            console.error(error);
            return { tradesman: tradesmanObj, available: false };
          }
        })
      );

      const availableSelected = availabilityChecks.filter(
        (check) => check.available
      );

      if (availableSelected.length === 0) {
        throw new Error(
          "Selected tradesmen are not available for the selected time slot"
        );
      }

      if (availableSelected.length < tradesman.length) {
        throw new Error(
          `Only ${availableSelected.length} of the selected tradesmen are available`
        );
      }

      const assignedIds = availableSelected.map((check) => check.tradesman._id);

      const newBooking = await BookingModel.create({
        ...restArgs,
        service,
        user,
        addons: transformedAddons,
        startTime: startDateTime,
        endTime: endDateTime,
        date: bookingDate,
        tradesman: assignedIds,
        status: "assigned",
      });

      if (!newBooking) throw new Error("Failed to create booking");

      // Create time slots for each assigned tradesman
      await Promise.all(
        availableSelected.map((check) =>
          TimeSlotModel.create({
            user: user,
            tradesman: check.tradesman._id,
            booking: newBooking._id,
            booking_id: newBooking.booking_id,
            startTime: startDateTime,
            endTime: endDateTime,
            date: bookingDate,
            service,
          })
        )
      );

      const updatedUser = await UserModel.findByIdAndUpdate(
        user,
        { $push: { bookings: newBooking._id } },
        { new: true }
      );

      if (!updatedUser) throw new Error("User not found");

      // Send notifications to assigned tradesmen
      await Promise.all(
        assignedIds.map(async (tradesmanId) => {
          try {
            const notificationPayload = {
              title: "New Booking Assigned",
              body: `You have been assigned to booking #${
                newBooking.booking_id
              } scheduled for ${formatDate(date)} from ${formatTime(
                startDateTime
              )} to ${formatTime(endDateTime)}.`,
              data: {
                bookingId: newBooking._id.toString(),
                booking_id: newBooking.booking_id.toString(),
                type: "booking_assigned",
                title: "New Booking Assigned",
              },
            };
            const result = await sendNotification(
              tradesmanId,
              notificationPayload
            );
            console.log(
              `Notification result for tradesman ${tradesmanId}:`,
              result.message
            );

            // Save notification to database
            try {
              const notificationData = {
                sender: user,
                recipient: tradesmanId,
                category: "booking",
                title: "New Booking Assigned",
                message: `You have been assigned to booking #${
                  newBooking.booking_id
                } scheduled for ${formatDate(date)} from ${formatTime(
                  startDateTime
                )} to ${formatTime(endDateTime)}.`,
                type: "notification",
                status: "unread",
                priority: "normal",
                action_url: null,
              };
              await NotificationModel.create(notificationData);
              console.log(
                `Notification saved to DB for tradesman ${tradesmanId}`
              );
            } catch (dbError) {
              console.error(
                `Failed to save notification to DB for tradesman ${tradesmanId}:`,
                dbError.message
              );
            }
          } catch (error) {
            console.error(
              `Failed to send notification to tradesman ${tradesmanId}:`,
              error.message
            );
          }
        })
      );

      // Send notification to the user
      try {
        const userNotificationPayload = {
          title: "Booking Created Successfully",
          body: `Your booking #${
            newBooking.booking_id
          } has been successfully created and assigned to ${
            assignedIds.length
          } professional${
            assignedIds.length > 1 ? "s" : ""
          }. Scheduled for ${formatDate(date)} from ${formatTime(
            startDateTime
          )} to ${formatTime(
            endDateTime
          )}. Please note that the assigned professional(s) may review and accept or decline this booking. If declined, you will be notified and can select another available professional. Thank you for your patience!`,
          data: {
            bookingId: newBooking._id.toString(),
            booking_id: newBooking.booking_id.toString(),
            type: "booking_created",
            title: "Booking Created Successfully",
          },
        };
        const userResult = await sendNotification(
          user,
          userNotificationPayload
        );
        console.log(
          `Notification result for user ${user}:`,
          userResult.message
        );

        // Save notification to database for user
        const userNotificationData = {
          sender: null,
          recipient: user,
          category: "booking",
          title: "Booking Created Successfully",
          message: `Your booking #${
            newBooking.booking_id
          } has been successfully created and assigned to ${
            assignedIds.length
          } professional${
            assignedIds.length > 1 ? "s" : ""
          }. Scheduled for ${formatDate(date)} from ${formatTime(
            startDateTime
          )} to ${formatTime(
            endDateTime
          )}. Please note that the assigned professional(s) may review and accept or decline this booking. If declined, you will be notified and can select another available professional. Thank you for your patience!`,
          type: "notification",
          status: "unread",
          priority: "normal",
          action_url: null,
        };
        await NotificationModel.create(userNotificationData);
        console.log(`Notification saved to DB for user ${user}`);
      } catch (userError) {
        console.error(
          `Failed to send/save notification to user ${user}:`,
          userError.message
        );
      }

      return {
        success: true,
        message: `Booking successfully created! ${
          assignedIds.length
        } professional${
          assignedIds.length > 1 ? "s have" : " has"
        } been assigned to your booking.`,
        data: newBooking._id,
      };
    } else {
      // Automatic assignment (existing logic)

      let tradesmenWithSkill = [];

      // Check if location is provided for proximity search
      if (
        args.location &&
        args.location.coordinates &&
        Array.isArray(args.location.coordinates) &&
        args.location.coordinates.length === 2
      ) {
        const [lng, lat] = args.location.coordinates;
        console.log(`Searching for tradesmen near lat:${lat}, lng:${lng}`);

        try {
          const nearbyResult = await UserService.getTradesmenNearby({
            lat,
            lng,
            radius: 50, // 50km radius
            serviceId: service,
            limit: 50, // Get a good pool of candidates
            sortField: "score",
            sortOrder: "desc",
          });

          if (nearbyResult.success && nearbyResult.data) {
            tradesmenWithSkill = nearbyResult.data;
            console.log(
              `Found ${tradesmenWithSkill.length} tradesmen nearby with required skill`
            );
          }
        } catch (nearbyError) {
          console.error(
            "Error fetching nearby tradesmen, falling back to all:",
            nearbyError
          );
        }
      }

      // Fallback if no location provided or no nearby tradesmen found (or error)
      if (tradesmenWithSkill.length === 0) {
        tradesmenWithSkill = await UserModel.find({
          skills: { $in: [new mongoose.Types.ObjectId(service)] },
        }).sort({ score: -1 });
      }

      const availableTradesmen = await Promise.all(
        tradesmenWithSkill.map(async (tradesman) => {
          try {
            const isAvailable = await isTradesmanAvailable(
              tradesman._id,
              startDateTime,
              endDateTime,
              bookingDate
            );
            return isAvailable ? tradesman : null;
          } catch (error) {
            console.error(error);
            return null;
          }
        })
      );

      const filtered = availableTradesmen.filter(Boolean);

      if (filtered.length === 0)
        throw new Error("No tradesmen available for the selected time slot.");

      const numberOfTradesman = Number(number_of_tradesman);
      if (isNaN(numberOfTradesman))
        throw new Error("Invalid number of tradesmen");

      // Check if we have enough available tradesmen
      if (filtered.length < numberOfTradesman) {
        throw new Error(
          `Only ${filtered.length} tradesman${
            filtered.length > 1 ? "en" : ""
          } available for the selected time slot. You requested ${numberOfTradesman}. Please try booking with ${
            filtered.length
          } tradesman${filtered.length > 1 ? "en" : ""} instead.`
        );
      }

      const assignCount = Math.min(numberOfTradesman, filtered.length);
      const toAssign = filtered.slice(0, assignCount);
      const assignedIds = toAssign.map((t) => t._id);

      const newBooking = await BookingModel.create({
        ...restArgs,
        service,
        user,
        addons: transformedAddons,
        startTime: startDateTime, // Store as ISO datetime
        endTime: endDateTime, // Store as ISO datetime
        date: bookingDate, // Store as ISO date
        tradesman: assignedIds, // Schema must support array
        status: "assigned",
      });

      if (!newBooking) throw new Error("Failed to create booking");

      // Create time slots for each assigned tradesman
      await Promise.all(
        toAssign.map((tradesman) =>
          TimeSlotModel.create({
            user: user,
            tradesman: tradesman._id,
            booking: newBooking._id,
            booking_id: newBooking.booking_id,
            startTime: startDateTime, // Store as ISO datetime
            endTime: endDateTime, // Store as ISO datetime
            date: bookingDate, // Store as ISO date
            service,
          })
        )
      );

      const updatedUser = await UserModel.findByIdAndUpdate(
        user,
        { $push: { bookings: newBooking._id } },
        { new: true }
      );

      if (!updatedUser) throw new Error("User not found");

      // Increase user score by 5 points for successful booking creation
      try {
        await UserModel.findByIdAndUpdate(
          user,
          { $inc: { score: 5 } },
          { new: true }
        );
        console.log(
          `User score increased by 5 points for booking ${newBooking.booking_id}`
        );
      } catch (scoreError) {
        console.error("Failed to update user score:", scoreError);
        // Don't throw error - booking should still succeed even if score update fails
      }

      await Promise.all(
        assignedIds.map(async (tradesmanId) => {
          try {
            const notificationPayload = {
              title: "New Booking Assigned",
              body: `You have been assigned to booking #${
                newBooking.booking_id
              } scheduled for ${formatDate(date)} from ${formatTime(
                startDateTime
              )} to ${formatTime(endDateTime)}.`,
              data: {
                bookingId: newBooking._id.toString(),
                booking_id: newBooking.booking_id.toString(),
                type: "booking_assigned",
                title: "New Booking Assigned",
                // message: body,
              },
            };
            const result = await sendNotification(
              tradesmanId,
              notificationPayload
            );
            console.log(
              `Notification result for tradesman ${tradesmanId}:`,
              result.message
            );

            // Save notification to database
            try {
              const notificationData = {
                sender: user, // The user who created the booking
                recipient: tradesmanId,
                category: "booking",
                title: "New Booking Assigned",
                message: `You have been assigned to booking #${
                  newBooking.booking_id
                } scheduled for ${formatDate(date)} from ${formatTime(
                  startDateTime
                )} to ${formatTime(endDateTime)}.`,
                type: "notification",
                status: "unread",
                priority: "normal",
                action_url: null,
              };
              await NotificationModel.create(notificationData);
              console.log(
                `Notification saved to DB for tradesman ${tradesmanId}`
              );
            } catch (dbError) {
              console.error(
                `Failed to save notification to DB for tradesman ${tradesmanId}:`,
                dbError.message
              );
            }
          } catch (error) {
            console.error(
              `Failed to send notification to tradesman ${tradesmanId}:`,
              error.message
            );
          }
        })
      );

      // Send notification to the user who created the booking
      try {
        const userNotificationPayload = {
          title: "Booking Created Successfully",
          body: `Your booking #${
            newBooking.booking_id
          } has been successfully created and assigned to ${
            assignedIds.length
          } professional${
            assignedIds.length > 1 ? "s" : ""
          }. Scheduled for ${formatDate(date)} from ${formatTime(
            startDateTime
          )} to ${formatTime(
            endDateTime
          )}. Please note that the assigned professional(s) may review and accept or decline this booking. If declined, you will be notified and can select another available professional. Thank you for your patience!`,
          data: {
            bookingId: newBooking._id.toString(),
            booking_id: newBooking.booking_id.toString(),
            type: "booking_created",
            title: "Booking Created Successfully",
          },
        };
        const userResult = await sendNotification(
          user,
          userNotificationPayload
        );
        console.log(
          `Notification result for user ${user}:`,
          userResult.message
        );

        // Save notification to database for user
        const userNotificationData = {
          sender: null, // System notification
          recipient: user,
          category: "booking",
          title: "Booking Created Successfully",
          message: `Your booking #${
            newBooking.booking_id
          } has been successfully created and assigned to ${
            assignedIds.length
          } professional${
            assignedIds.length > 1 ? "s" : ""
          }. Scheduled for ${formatDate(date)} from ${formatTime(
            startDateTime
          )} to ${formatTime(
            endDateTime
          )}. Please note that the assigned professional(s) may review and accept or decline this booking. If declined, you will be notified and can select another available professional. Thank you for your patience!`,
          type: "notification",
          status: "unread",
          priority: "normal",
          action_url: null,
        };
        await NotificationModel.create(userNotificationData);
        console.log(`Notification saved to DB for user ${user}`);
      } catch (userError) {
        console.error(
          `Failed to send/save notification to user ${user}:`,
          userError.message
        );
      }

      return {
        success: true,
        message: `Booking successfully created! ${assignCount} professional${
          assignCount > 1 ? "s have" : " has"
        } been assigned to your booking.`,
        data: newBooking._id,
      };
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateBooking = async (args, id) => {
  try {
    const booking = await BookingModel.findById(id);
    if (!booking) throw new Error("Booking not found");

    let statusToUpdate = args.status;
    let updatedFields = { ...args };

    // Handle tradesman assignment
    if (args.tradesman && Array.isArray(args.tradesman)) {
      // In your updateBooking function
      const start = new Date(booking.startTime); // Convert to Date if it's a string
      const end = new Date(booking.endTime); // Convert to Date if it's a string
      const bookingDate = new Date(booking.date); // Convert to Date if it's a string

      if (!bookingDate || !start || !end) {
        throw new Error("Booking is missing valid startTime, endTime, or date");
      }

      // First, clean up ALL existing time slots for this booking to avoid conflicts
      const deletedOldSlots = await TimeSlotModel.deleteMany({
        booking: id,
      });
      console.log(
        `Cleaned up ${deletedOldSlots.deletedCount} existing time slots for booking reassignment ${booking.booking_id}`
      );

      // Check availability of each tradesman (now that old slots are cleaned up)
      for (const tradesman of args.tradesman) {
        const isAvailable = await isTradesmanAvailable(
          tradesman,
          start,
          end,
          bookingDate
        );
        if (!isAvailable) {
          throw new Error(
            `Tradesman with ID ${tradesman} is not available at this time. Please run time slot cleanup or select a different tradesman.`
          );
        }

        // Create corresponding TimeSlot for the new assignment
        await TimeSlotModel.create({
          user: booking.user,
          tradesman,
          booking: id,
          booking_id: booking.booking_id,
          startTime: start, // ISO datetime string
          endTime: end, // ISO datetime string
          date: bookingDate, // ISO date string
          service: booking.service,
        });
      }

      updatedFields.tradesman = args.tradesman;
      updatedFields.number_of_tradesman = args.tradesman.length;
    }

    if (args.date || args.startTime || args.endTime) {
      // Convert inputs to consistent ISO format
      const updatedDate = args.date
        ? new Date(args.date).toISOString().split("T")[0]
        : booking.date;
      const updatedStartTime = args.startTime
        ? new Date(args.startTime).toISOString()
        : booking.startTime;
      const updatedEndTime = args.endTime
        ? new Date(args.endTime).toISOString()
        : booking.endTime;

      const serviceId = booking.service?._id || booking.service;

      const tradesmenWithSkill = await UserModel.find({
        skills: { $in: [new mongoose.Types.ObjectId(serviceId)] },
      });

      const availableTradesmen = await Promise.all(
        tradesmenWithSkill.map(async (tradesman) => {
          const isAvailable = await isTradesmanAvailable(
            tradesman._id,
            updatedStartTime,
            updatedEndTime,
            updatedDate
          );
          return isAvailable ? tradesman : null;
        })
      );

      const filtered = availableTradesmen.filter(Boolean);

      if (filtered.length === 0) {
        throw new Error("No tradesmen available for the new time slot.");
      }

      const numberOfTradesman = Number(
        args.number_of_tradesman || booking.number_of_tradesman || 1
      );
      const assignCount = Math.min(numberOfTradesman, filtered.length);
      const toAssign = filtered.slice(0, assignCount);
      const assignedIds = toAssign.map((t) => t._id);

      console.log("Assigned tradesmen after rescheduling:", assignedIds); // 🔍 Debug

      await TimeSlotModel.deleteMany({ booking: booking._id });

      await Promise.all(
        toAssign.map((tradesman) =>
          TimeSlotModel.create({
            user: booking.user,
            tradesman: tradesman._id,
            booking: booking._id,
            booking_id: booking.booking_id,
            startTime: updatedStartTime, // ISO datetime string
            endTime: updatedEndTime, // ISO datetime string
            date: updatedDate, // ISO date string
            service: serviceId,
          })
        )
      );

      updatedFields.tradesman = assignedIds; // or `tradesmen`
      updatedFields.number_of_tradesman = assignedIds.length;
      updatedFields.date = updatedDate; // ISO date string
      updatedFields.startTime = updatedStartTime; // ISO datetime string
      updatedFields.endTime = updatedEndTime; // ISO datetime string
      updatedFields.status = "assigned";
    }

    // Handle single tradesman assignment
    if (args.tradesman) {
      const { tradesman } = args;
      const start = args.startTime
        ? new Date(args.startTime).toISOString()
        : booking.startTime;
      const end = args.endTime
        ? new Date(args.endTime).toISOString()
        : booking.endTime;
      const bookingDate = args.date
        ? new Date(args.date).toISOString().split("T")[0]
        : booking.date;

      if (!bookingDate || !start || !end) {
        throw new Error("Booking is missing valid startTime, endTime, or date");
      }

      const isAvailable = await isTradesmanAvailable(
        tradesman,
        start,
        end,
        bookingDate
      );
      if (!isAvailable) {
        throw new Error(
          `Tradesman with ID ${tradesman} is not available during the selected time slot.`
        );
      }

      await TimeSlotModel.create({
        user: booking.user,
        tradesman: tradesman,
        booking: id,
        booking_id: booking.booking_id,
        service: booking.service,
        startTime: start, // ISO datetime string
        endTime: end, // ISO datetime string
        date: bookingDate, // ISO date string
      });

      updatedFields.tradesmen = [tradesman];
      updatedFields.number_of_tradesman = 1;
    }

    // Handle dispute and status logic
    if (booking.dispute === true) {
      if (
        args.status === "completedByUser" ||
        args.status === "completedByTradesman" ||
        args.status === "completed"
      ) {
        throw new Error(
          "Booking cannot be marked as completed while dispute is active"
        );
      }
    }

    if (args.status === "incomplete") {
      updatedFields.dispute = true;
    }

    if (args.status === "resolved") {
      updatedFields.dispute = false;
      updatedFields.status = "completed";
    }

    // Handle booking rejection by tradesman
    if (args.status === "rejected" && args.rejectedBy) {
      const rejectingTradesmanId = args.rejectedBy;

      // Remove the rejecting tradesman from the booking
      if (booking.tradesman && Array.isArray(booking.tradesman)) {
        const updatedTradesmen = booking.tradesman.filter(
          (t) => t.toString() !== rejectingTradesmanId.toString()
        );

        // Delete ALL time slots for this tradesman and booking (not just one)
        const deletedSlots = await TimeSlotModel.deleteMany({
          booking: id,
          tradesman: rejectingTradesmanId,
        });

        console.log(
          `Deleted ${deletedSlots.deletedCount} time slots for rejecting tradesman ${rejectingTradesmanId} from booking ${booking.booking_id}`
        );

        updatedFields.tradesman = updatedTradesmen;
        updatedFields.number_of_tradesman = updatedTradesmen.length;

        // If no tradesmen remain, set status to pending
        if (updatedTradesmen.length === 0) {
          updatedFields.status = "pending";
        } else {
          // Keep as assigned if other tradesmen remain
          updatedFields.status = "assigned";
        }

        console.log(
          `Tradesman ${rejectingTradesmanId} removed from booking ${booking.booking_id}. Remaining: ${updatedTradesmen.length}`
        );
      }

      // Send urgent notification to user
      try {
        const notificationPayload = {
          title: "Booking Rejected",
          body: args.rejectionReason
            ? `A tradesman has rejected your booking #${booking.booking_id}. Reason: ${args.rejectionReason}. Please reassign a new tradesman.`
            : `A tradesman has rejected your booking #${booking.booking_id}. Please reassign a new tradesman.`,
          data: {
            bookingId: booking._id.toString(),
            booking_id: booking.booking_id.toString(),
            type: "booking_rejected",
            title: "Booking Rejected",
            rejectionReason: args.rejectionReason || "",
          },
        };

        await sendNotification(booking.user, notificationPayload);

        // Save urgent notification to database
        const notificationData = {
          sender: rejectingTradesmanId,
          recipient: booking.user,
          category: "booking",
          title: "Booking Rejected",
          message: args.rejectionReason
            ? `A tradesman has rejected your booking #${booking.booking_id}. Reason: ${args.rejectionReason}. Please reassign a new tradesman.`
            : `A tradesman has rejected your booking #${booking.booking_id}. Please reassign a new tradesman.`,
          type: "notification",
          status: "unread",
          priority: "urgent",
          action_url: null,
        };

        await NotificationModel.create(notificationData);
        console.log(
          `Urgent rejection notification sent to user ${booking.user}`
        );
      } catch (notifError) {
        console.error(
          `Failed to send rejection notification to user ${booking.user}:`,
          notifError.message
        );
      }
    }

    // Clean up time slots for canceled and completed bookings
    if (args.status === "cancelled" || args.status === "canceled") {
      const deletedSlots = await TimeSlotModel.deleteMany({
        booking: id,
      });
      console.log(
        `Cleaned up ${deletedSlots.deletedCount} time slots for canceled booking ${booking.booking_id}`
      );
    }

    // Clean up time slots when booking is completed by either party
    if (
      args.status === "completed" ||
      args.status === "completedByUser" ||
      args.status === "completedByTradesman"
    ) {
      const deletedSlots = await TimeSlotModel.deleteMany({
        booking: id,
      });
      console.log(
        `Cleaned up ${deletedSlots.deletedCount} time slots for completed booking ${booking.booking_id}`
      );
    }

    if (
      ["accepted", "rejected", "cancelled", "in-progress"].includes(args.status)
    ) {
      await sendBookingStatusNotification(booking, args.status, booking.user, {
        rejectionReason: args.rejectionReason,
      });
    }

    if (booking.status === "completed" || booking.dispute === true) {
      delete updatedFields.status;
    } else {
      // Handle booking start (tradesman clicking "Start Booking")
      if (args.status === "inProgress") {
        // Verify booking is in accepted state
        if (booking.status !== "accepted") {
          throw new Error(
            `Cannot start booking. Current status is ${booking.status}, must be 'accepted'`
          );
        }

        updatedFields.status = "inProgress";
        updatedFields.started_at = new Date();

        // Force all assigned tradesmen to offline when booking starts
        if (booking.tradesman && booking.tradesman.length > 0) {
          await Promise.all(
            booking.tradesman.map((tradesmanId) =>
              UserModel.findByIdAndUpdate(
                tradesmanId,
                { online: false },
                { new: true }
              )
            )
          );
          console.log(
            `Set ${booking.tradesman.length} tradesmen to offline for booking ${booking.booking_id}`
          );
        }

        // Send notification to user that booking has started
        await sendBookingStatusNotification(
          booking,
          "in-progress",
          booking.user,
          {}
        );
      } else if (args.status === "completedByTradesman") {
        updatedFields.tradesman_completed_at = new Date().toISOString();
        if (booking.status === "completedByUser") {
          updatedFields.status = "completed";
        }
      } else if (args.status === "completedByUser") {
        updatedFields.user_completed_at = new Date().toISOString();
        if (booking.status === "completedByTradesman") {
          updatedFields.status = "completed";
        }
      }

      if (
        (booking.status === "completedByUser" && booking.user_completed_at) ||
        (booking.status === "completedByTradesman" &&
          booking.tradesman_completed_at)
      ) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        if (new Date(booking.user_completed_at) <= threeDaysAgo) {
          console.log(
            "3 days passed since user or tradesman completion, keeping half-green status"
          );
        }
      }

      if (!updatedFields.status) {
        updatedFields.status = statusToUpdate || booking.status;
      }
    }

    // Handle dispute email notification
    if (updatedFields.dispute === true) {
      await SendEmail(
        "admin@example.com",
        "New Dispute Created",
        `A dispute has been raised for booking ID: ${booking.booking_id}. Please review it in the admin panel.`
      );
      console.log("Email sent to the admin about dispute");
    }

    // Update service count if booking is completed
    if (statusToUpdate === "completed") {
      await ServiceModel.findOneAndUpdate(
        { _id: booking.service },
        { $inc: { service_count: 1 } }
      );

      // Update tradesman score by 5 points when booking is completed
      // Update score for all tradesmen assigned to this booking
      if (booking.tradesman && booking.tradesman.length > 0) {
        const scoreIncrement = 5;
        await Promise.all(
          booking.tradesman.map((tradesmanId) =>
            UserModel.findByIdAndUpdate(
              tradesmanId,
              { $inc: { score: scoreIncrement } },
              { new: true }
            )
          )
        );
        console.log(
          `Added ${scoreIncrement} points to ${booking.tradesman.length} tradesmen for completed booking ${booking.booking_id}`
        );
      }
    }

    // Update the booking
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      id,
      updatedFields,
      { new: true }
    );

    return {
      success: true,
      message: "Booking updated successfully. Your changes have been saved.",
      data: updatedBooking._id,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const deleteBookingById = async (id) => {
  try {
    const booking = await BookingModel.findById(id);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "pending")
      throw new Error("Booking already accepted");
    await BookingModel.findByIdAndDelete(id);
    return {
      success: true,
      message:
        "Booking deleted successfully. The booking has been removed from your schedule.",
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getCurrentUserBookings = async (user_id) => {
  try {
    const bookings = await BookingModel.find({
      tradesman: user_id,
    })
      .populate("tradesman")
      .populate("user")
      .populate("service");

    return {
      success: true,
      message: "Your bookings have been retrieved successfully.",
      data: bookings,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getAllBookings = async (args) => {
  try {
    const {
      page = 1,
      limit,
      sortField = "date",
      sortOrder = "asc",
      filters = {},
    } = args;

    const filterConditions = {};

    if (filters.dateRange) {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case "last_day":
          startDate = new Date();
          startDate.setDate(now.getDate() - 1);
          break;
        case "last_week":
          startDate = new Date();
          startDate.setDate(now.getDate() - 7);
          break;
        case "last_month":
          startDate = new Date();
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "last_3_months":
          startDate = new Date();
          startDate.setMonth(now.getMonth() - 3);
          break;
        case "last_6_months":
          startDate = new Date();
          startDate.setMonth(now.getMonth() - 6);
          break;
        case "last_year":
          startDate = new Date();
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filterConditions.date = { $gte: startDate, $lte: now };
      }
    }

    if (filters.date) {
      const selectedDate = new Date(filters.date);

      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );

      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      );

      filterConditions.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (
      filters.tradesman &&
      mongoose.Types.ObjectId.isValid(filters.tradesman)
    ) {
      filterConditions.tradesman = new mongoose.Types.ObjectId(
        filters.tradesman
      );
    }

    if (filters.service && mongoose.Types.ObjectId.isValid(filters.service)) {
      filterConditions.service = new mongoose.Types.ObjectId(filters.service);
    }

    if (filters.user && mongoose.Types.ObjectId.isValid(filters.user)) {
      filterConditions.user = new mongoose.Types.ObjectId(filters.user);
    }

    if (filters.addons && Array.isArray(filters.addons)) {
      filterConditions.addons = {
        $in: filters.addons
          .filter(mongoose.Types.ObjectId.isValid)
          .map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (filters.status?.trim()) {
      filterConditions.status = filters.status.trim();
    }
    if (filters.payment_status?.trim()) {
      filterConditions.payment_status = filters.payment_status.trim();
    }

    if (filters.dispute !== undefined) {
      filterConditions.dispute = filters.dispute;
    }

    if (filters.booking_id) {
      filterConditions.booking_id = {
        $regex: new RegExp(filters.booking_id, "i"),
      };
    }

    if (filters.city?.trim()) {
      filterConditions.city = filters.city.trim();
    }

    if (filters.startTime || filters.endTime) {
      filterConditions.startTime = {};
      if (filters.startTime) {
        filterConditions.startTime.$gte = filters.startTime;
      }
      if (filters.endTime) {
        filterConditions.startTime.$lte = filters.endTime;
      }
    }

    if (filters.day?.trim()) {
      filterConditions.day = filters.day.trim();
    }

    if (filters.enroute_status?.trim()) {
      filterConditions.enroute_status = filters.enroute_status.trim();
    }

    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };
    const skip = (page - 1) * limit;

    const totalRecords = await BookingModel.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalRecords / limit);

    const bookings = await BookingModel.find(filterConditions)
      .populate("user")
      .populate("tradesman")
      .populate({ path: "service", populate: { path: "category" } })
      .populate("addons")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      message: "Bookings retrieved successfully.",
      data: bookings,
      pageInfo: {
        totalRecords,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Error fetching bookings:", error.message);
    throw new Error(error.message);
  }
};

const getBookingById = async (id) => {
  try {
    const booking = await BookingModel.findById(id)
      .populate("addons.addon")
      .populate("user")
      .populate("tradesman")
      .populate("service");

    if (!booking) throw new Error("Booking not found");

    return {
      success: true,
      message: "Booking details retrieved successfully.",
      data: booking,
      // isCancellable,
      // isUpdatable,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getFullBookingById = async (id, user) => {
  try {
    const booking = await BookingModel.findById(id).populate("");

    if (!booking) throw new Error("Booking not found");

    if (booking.payment_status !== "paid") {
      throw new Error("Booking not paid");
    }

    if (user.role === "user") {
      if (booking.created_by._id != user._id) {
        throw new Error("Unauthorized access");
      }
    }

    return {
      success: true,
      message: "Booking details retrieved successfully.",
      data: booking,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Helper function to get date range filter
const getDateRangeFilter = (dateRange) => {
  const now = new Date();
  let startDate, endDate;

  switch (dateRange) {
    case "last_day":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case "last_week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case "last_month":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );
      endDate = now;
      break;
    case "last_3_months":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate()
      );
      endDate = now;
      break;
    case "last_6_months":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 6,
        now.getDate()
      );
      endDate = now;
      break;
    case "last_year":
      startDate = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
      endDate = now;
      break;
    default:
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
  }

  return { startDate, endDate };
};

// Helper function to group data by periods
const groupByPeriod = (bookings, dateRange) => {
  const periods = {};

  bookings.forEach((booking) => {
    let periodKey;
    const bookingDate = new Date(booking.date || booking.created_at);

    if (dateRange === "last_day") {
      periodKey = bookingDate.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (dateRange === "last_week" || dateRange === "last_month") {
      // Group by week for last_week, by day for last_month
      periodKey = bookingDate.toISOString().split("T")[0];
    } else {
      // Group by month for longer periods
      periodKey = `${bookingDate.getFullYear()}-${String(
        bookingDate.getMonth() + 1
      ).padStart(2, "0")}`;
    }

    if (!periods[periodKey]) {
      periods[periodKey] = {
        period: periodKey,
        amount: 0,
        bookingCount: 0,
      };
    }

    periods[periodKey].amount += booking.payment?.total_charges || 0;
    periods[periodKey].bookingCount += 1;
  });

  return Object.values(periods).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
};

// Get tradesman earnings aggregation
const getTradesmanEarnings = async (tradesmanId, filters = {}) => {
  try {
    // Build the query filter
    const query = {
      tradesman: { $in: [mongoose.Types.ObjectId(tradesmanId)] },
      status: {
        $in: [
          "completed",
          "completedByUser",
          "completedByTradesman",
          "completed-by-user",
          "completed-by-tradesman",
        ],
      },
      "payment.payment_status": "completed",
    };

    // Apply date range filter if provided
    if (filters.dateRange) {
      const { startDate, endDate } = getDateRangeFilter(filters.dateRange);
      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Apply other filters
    if (filters.service) {
      query.service = mongoose.Types.ObjectId(filters.service);
    }
    if (filters.city) {
      query.city = { $regex: filters.city, $options: "i" };
    }

    // Aggregate bookings to calculate earnings
    const bookings = await BookingModel.find(query)
      .populate("service", "title")
      .populate("user", "first_name last_name")
      .sort({ date: -1 });

    // Calculate totals
    const totalEarnings = bookings.reduce((sum, booking) => {
      return sum + (booking.payment?.total_charges || 0);
    }, 0);

    const totalBookings = bookings.length;
    const averageEarningsPerBooking =
      totalBookings > 0 ? totalEarnings / totalBookings : 0;

    // Group earnings by period
    const earningsByPeriod = groupByPeriod(
      bookings,
      filters.dateRange || "last_month"
    );

    // Get currency from first booking or default
    const currency = bookings[0]?.payment?.currency || "PKR";

    return {
      success: true,
      message: "Tradesman earnings retrieved successfully.",
      data: {
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        totalBookings,
        averageEarningsPerBooking: parseFloat(
          averageEarningsPerBooking.toFixed(2)
        ),
        earningsByPeriod,
        currency,
      },
    };
  } catch (error) {
    throw new Error(`Failed to get tradesman earnings: ${error.message}`);
  }
};

// Get user costs aggregation
const getUserCosts = async (userId, filters = {}) => {
  try {
    // Build the query filter
    const query = {
      user: mongoose.Types.ObjectId(userId),
      status: {
        $in: [
          "completed",
          "completedByUser",
          "completedByTradesman",
          "completed-by-user",
          "completed-by-tradesman",
        ],
      },
      "payment.payment_status": "completed",
    };

    // Apply date range filter if provided
    if (filters.dateRange) {
      const { startDate, endDate } = getDateRangeFilter(filters.dateRange);
      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Apply other filters
    if (filters.service) {
      query.service = mongoose.Types.ObjectId(filters.service);
    }
    if (filters.city) {
      query.city = { $regex: filters.city, $options: "i" };
    }

    // Aggregate bookings to calculate costs
    const bookings = await BookingModel.find(query)
      .populate("service", "title")
      .populate("tradesman", "first_name last_name")
      .sort({ date: -1 });

    // Calculate totals
    const totalCosts = bookings.reduce((sum, booking) => {
      return sum + (booking.payment?.total_charges || 0);
    }, 0);

    const totalBookings = bookings.length;
    const averageCostPerBooking =
      totalBookings > 0 ? totalCosts / totalBookings : 0;

    // Group costs by period
    const costsByPeriod = groupByPeriod(
      bookings,
      filters.dateRange || "last_month"
    );

    // Get currency from first booking or default
    const currency = bookings[0]?.payment?.currency || "PKR";

    return {
      success: true,
      message: "User costs retrieved successfully.",
      data: {
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        totalBookings,
        averageCostPerBooking: parseFloat(averageCostPerBooking.toFixed(2)),
        costsByPeriod,
        currency,
      },
    };
  } catch (error) {
    throw new Error(`Failed to get user costs: ${error.message}`);
  }
};

module.exports.BookingService = {
  createBooking,
  updateBooking,
  deleteBookingById,
  getCurrentUserBookings,
  getAllBookings,
  getBookingById,
  getFullBookingById,
  getTradesmanEarnings,
  getUserCosts,
  cleanupOrphanedTimeSlots, // Export cleanup function for manual use
};

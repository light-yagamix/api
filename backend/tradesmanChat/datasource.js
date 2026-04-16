const MessageModel = require("./model");
const User = require("../user/model");
const Booking = require("../booking/model");
const { default: mongoose } = require("mongoose");

const buildDirectConversationId = (bookingId, userA, userB) => {
  const sortedUsers = [userA.toString(), userB.toString()].sort();
  return `${bookingId}-${sortedUsers[0]}-${sortedUsers[1]}`;
};

const buildGroupConversationId = (bookingId, participantIds = []) => {
  const uniqueSortedParticipants = [...new Set(participantIds.map((id) => id.toString()))].sort();
  return `${bookingId}-GROUP-${uniqueSortedParticipants.join("-")}`;
};

const getTradesmanConversations = async (args) => {
  try {
    const user = new mongoose.Types.ObjectId(args.user);

    // First, find all messages of this user (1-to-1 and group)
    const messages = await MessageModel.find({
      $or: [
        { sender: user },
        { recipient: user },
        { recipients: { $in: [user] } }
      ],
    });

    // Update conversationId if missing
    await Promise.all(
      messages.map(async (msg) => {
        if (!msg.conversationId) {
          const userA = msg?.sender.toString();
          const booking = msg?.booking?.toString();

          // Check if this is a group message
          if (msg.recipients && msg.recipients.length > 0) {
            // Group chat conversation ID
            const allUserIds = [userA, ...msg.recipients.map(r => r.toString())];
            const sortedUsers = allUserIds.sort();
            msg.conversationId = `${booking}-GROUP-${sortedUsers.join("-")}`;
          } else {
            // 1-to-1 conversation ID
            const userB = msg?.recipient.toString();
            const sortedUsers = [userA, userB].sort();
            msg.conversationId = `${booking}-${sortedUsers[0]}-${sortedUsers[1]}`;
          }

          msg.isGroupChat = msg.recipients && msg.recipients.length > 0;
          await msg.save();
        }
      })
    );

    // Now aggregate based on conversationId
    const conversationsThreads = await MessageModel.aggregate([
      {
        $match: {
          $or: [
            { sender: user },
            { recipient: user },
            { recipients: user },  // Check if user is in recipients array
          ],
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$conversationId",
          booking: { $first: "$booking" },
          isGroupChat: { $first: "$isGroupChat" },
          otherUser: {
            $first: {
              $cond: [{ $eq: ["$sender", user] }, "$recipient", "$sender"],
            },
          },
          participants: { $first: "$participants" },
          recipients: { $first: "$recipients" },
          lastMessage: { $last: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$recipient", user] },
                        { $in: [user, { $ifNull: ["$recipients", []] }] }
                      ]
                    },
                    { $ne: ["$status", "seen"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    const conversations = await Promise.all(
      conversationsThreads.map(async (thread) => {
        const isGroup = thread.isGroupChat === true;
        const bookingData = await Booking.findById(thread.booking).select("name price status");
        const currentUserData = await User.findById(user).select(
          "first_name last_name email profile_logo online lastSeen role"
        );

        let participants = [currentUserData];
        let otherUserData = null;

        if (isGroup && thread.participants && thread.participants.length > 0) {
          // For group chats, get all participants except the current user
          const participantsToFetch = thread.participants.filter(
            id => id.toString() !== user.toString()
          );
          
          const participantUsers = await User.find({
            _id: { $in: participantsToFetch }
          }).select("first_name last_name email profile_logo online lastSeen role");
          
          participants = [currentUserData, ...participantUsers];
          otherUserData = null; // Not used for groups
        } else {
          // For 1-to-1 chats, get the other user
          otherUserData = await User.findById(thread.otherUser).select(
            "first_name last_name email profile_logo online lastSeen role"
          );
          participants = [currentUserData, otherUserData].filter(Boolean);
        }

        const otherUserSerialized = otherUserData ? JSON.parse(JSON.stringify(otherUserData)) : null;
        const currentUserSerialized = JSON.parse(JSON.stringify(currentUserData));
        const participantsSerialized = participants.map(p => JSON.parse(JSON.stringify(p)));

        return {
          conversationId: thread._id,
          booking: JSON.parse(JSON.stringify(bookingData)),
          participant: otherUserSerialized,
          participants: participantsSerialized,
          lastMessage: JSON.parse(JSON.stringify(thread.lastMessage)),
          unreadCount: thread.unreadCount,
          isGroupChat: isGroup,
        };
      })
    );

    return {
      success: true,
      message: "Conversations retrieved successfully",
      statusCode: 200,
      data: conversations,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch conversations",
      data: null,
    };
  }
};

const getTradesmanMessages = async (args) => {
  const { filters = {} } = args;
  const { booking, user, conversationId } = filters;

  try {
    const query = {};
    if (booking) query.booking = booking;
    
    // Handle both 1-to-1 and group messages
    if (user) {
      query.$or = [
        { sender: user },
        { recipient: user },
        { recipients: { $in: [user] } },
      ];
    }
    
    if (conversationId) query.conversationId = conversationId;

    const messages = await MessageModel.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "first_name last_name email profile_picture _id")
      .populate("recipient", "first_name last_name email profile_picture _id")
      .populate("recipients", "first_name last_name email profile_picture _id")
      .populate("replyTo");

    // Mark as seen if both booking and userId provided
    if (booking && user) {
      await MessageModel.updateMany(
        {
          booking,
          $or: [
            { recipient: user },
            { recipients: { $in: [user] } }
          ],
          status: { $ne: "seen" },
        },
        { status: "seen" }
      );
    }

    const enhancedMessage = messages.map((message) => {
      const isSender = user && message.sender._id.toString() === user;
      const recipientData = message.recipient 
        ? JSON.parse(JSON.stringify(message.recipient)) 
        : null;
      const recipientsData = message.recipients 
        ? message.recipients.map(r => JSON.parse(JSON.stringify(r)))
        : [];
      const senderData = message.sender 
        ? JSON.parse(JSON.stringify(message.sender)) 
        : null;
      const participantsData = message.participants
        ? message.participants.map(p => JSON.parse(JSON.stringify(p)))
        : [];

      return {
        ...message.toObject(),
        direction: isSender ? "outgoing" : "incoming",
        isCurrentUser: isSender,
        recipients: recipientsData.length > 0 ? recipientsData : (recipientData ? [recipientData] : []),
        participants: participantsData.length > 0 ? participantsData : [senderData, recipientData].filter(Boolean),
        isGroupChat: message.isGroupChat || false,
      };
    });

    return {
      success: true,
      message: messages.length
        ? "Messages retrieved successfully"
        : "No messages found",
      data: enhancedMessage,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch messages",
      messages: null,
    };
  }
};

/**
 * Get or create a booking chat conversation
 * Returns the booking with participant details and conversation setup
 */
const getOrCreateBookingChat = async (args) => {
  try {
    const { bookingId, userId } = args;

    if (!bookingId) {
      return {
        success: false,
        message: "Booking ID is required",
      };
    }

    // Find the booking and populate both references
    const booking = await Booking.findById(bookingId)
      .populate("user", "first_name last_name email profile_logo _id")
      .populate("tradesman", "first_name last_name email profile_logo _id");

    if (!booking) {
      console.error(`Booking not found with ID: ${bookingId}`);
      return {
        success: false,
        message: "Booking not found",
      };
    }

    // Detailed logging for debugging
    console.log("Booking found:", {
      _id: booking._id,
      user: booking.user,
      tradesman: booking.tradesman,
      tradesmanType: Array.isArray(booking.tradesman) ? "array" : "single",
    });

    // Check if user is populated
    if (!booking.user) {
      console.error(`Booking user not populated for bookingId: ${bookingId}`);
      return {
        success: false,
        message: "Booking user not found or not populated",
      };
    }

    // tradesman is an array - get the first one or handle multiple
    let tradesman = booking.tradesman;
    if (Array.isArray(tradesman) && tradesman.length > 0) {
      tradesman = tradesman[0]; // Get first tradesman
    } else if (Array.isArray(tradesman)) {
      console.error(`No tradesmen in booking: ${bookingId}`);
      return {
        success: false,
        message: "No tradesmen assigned to this booking",
      };
    }

    if (!tradesman) {
      console.error(`Booking tradesman not found for bookingId: ${bookingId}`);
      return {
        success: false,
        message: "Booking tradesman not found or not populated",
      };
    }

    // Safely extract IDs
    let userId1, userId2;
    try {
      userId1 = booking.user._id ? booking.user._id.toString() : String(booking.user);
      userId2 = tradesman._id ? tradesman._id.toString() : String(tradesman);
    } catch (idError) {
      console.error("Error extracting user IDs:", idError);
      return {
        success: false,
        message: "Error processing user IDs",
      };
    }

    // Validate IDs are not empty
    if (!userId1 || !userId2) {
      console.error("Invalid user IDs:", { userId1, userId2 });
      return {
        success: false,
        message: "Invalid user IDs in booking",
      };
    }

    // If booking has multiple tradesmen, use a deterministic group conversation
    const tradesmanIds = Array.isArray(booking.tradesman)
      ? booking.tradesman.map((t) => (t?._id ? t._id.toString() : t.toString()))
      : [userId2];

    const isGroupChat = tradesmanIds.length > 1;
    const allParticipantIds = [userId1, ...tradesmanIds];
    const conversationId = isGroupChat
      ? buildGroupConversationId(bookingId, allParticipantIds)
      : buildDirectConversationId(bookingId, userId1, userId2);

    const bookingData = JSON.parse(JSON.stringify(booking));
    const userData = JSON.parse(JSON.stringify(booking.user));
    const tradesmanData = JSON.parse(JSON.stringify(tradesman));

    // Return all participants (booking user + all assigned tradesmen)
    const participants = isGroupChat
      ? [
          userData,
          ...(Array.isArray(booking.tradesman) ? booking.tradesman : [tradesman])
            .filter(Boolean)
            .map((p) => JSON.parse(JSON.stringify(p))),
        ]
      : [userData, tradesmanData];

    // Ensure group conversation has a persisted starter message so it appears in lists/history.
    if (isGroupChat) {
      const existingGroupConversation = await MessageModel.findOne({
        conversationId,
        isGroupChat: true,
      });

      if (!existingGroupConversation) {
        await MessageModel.create({
          sender: userId1,
          recipients: allParticipantIds.filter((id) => id !== userId1),
          participants: allParticipantIds,
          booking: bookingId,
          content: "Group chat created for this booking.",
          type: "system",
          conversationId,
          isGroupChat: true,
          status: "delivered",
        });
      }
    }

    return {
      success: true,
      message: "Booking chat retrieved successfully",
      conversationId,
      isGroupChat,
      participants,
      booking: bookingData,
      participant: userId === userId1 
        ? tradesmanData
        : userData,
    };
  } catch (error) {
    console.error("getOrCreateBookingChat error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get booking chat",
    };
  }
};

/**
 * Create a new group chat conversation
 * Returns the created conversation with all participants
 */
const createTradesmanGroupChat = async (args) => {
  try {
    const { participants, booking, groupName } = args;

    if (!participants || participants.length === 0) {
      return {
        success: false,
        message: "At least one participant is required",
      };
    }

    if (!booking) {
      return {
        success: false,
        message: "Booking ID is required",
      };
    }

    // Fetch booking
    const bookingData = await Booking.findById(booking)
      .populate("user", "_id first_name last_name email profile_picture")
      .populate("tradesman", "_id first_name last_name email profile_picture");
    if (!bookingData) {
      return {
        success: false,
        message: "Booking not found",
      };
    }

    // Always include booking participants to keep group membership consistent
    const bookingUserId = bookingData.user?._id?.toString();
    const bookingTradesmanIds = (Array.isArray(bookingData.tradesman) ? bookingData.tradesman : [])
      .map((t) => t?._id?.toString())
      .filter(Boolean);

    const participantIds = [...new Set([
      ...participants.map((p) => p.toString()),
      ...(bookingUserId ? [bookingUserId] : []),
      ...bookingTradesmanIds,
    ])];

    // Fetch all participants' data
    const participantsData = await User.find({
      _id: { $in: participantIds },
    }).select("_id first_name last_name email profile_picture");

    if (participantsData.length === 0) {
      return {
        success: false,
        message: "No valid participants found",
      };
    }

    // Generate deterministic group conversation ID
    const conversationId = buildGroupConversationId(booking, participantIds);

    // Reuse existing group conversation if one already exists
    const existingGroup = await MessageModel.findOne({
      conversationId,
      isGroupChat: true,
    }).sort({ createdAt: 1 });

    if (existingGroup) {
      return {
        success: true,
        message: "Group chat already exists",
        conversationId,
        isGroupChat: true,
        participants: participantsData.map((p) => JSON.parse(JSON.stringify(p))),
        booking: JSON.parse(JSON.stringify(bookingData)),
      };
    }

    // Create initial group message (system message or empty marker)
    const groupConversation = new MessageModel({
      sender: participantIds[0], // deterministic creator marker
      recipients: participantIds,
      participants: participantIds,
      booking,
      content: `${groupName || "Group chat"} created`,
      type: "system",
      conversationId,
      isGroupChat: true,
      status: "delivered",
    });

    await groupConversation.save();

    // Return conversation data
    return {
      success: true,
      message: "Group chat created successfully",
      conversationId,
      isGroupChat: true,
      participants: participantsData.map(p => JSON.parse(JSON.stringify(p))),
      booking: JSON.parse(JSON.stringify(bookingData)),
    };
  } catch (error) {
    console.error("createTradesmanGroupChat error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create group chat",
    };
  }
};

module.exports.TradesmanChatService = {
  getTradesmanConversations,
  getTradesmanMessages,
  getOrCreateBookingChat,
  createTradesmanGroupChat,
};

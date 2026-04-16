const { ConversationModel, ConversationMessageModel } = require("./model");

/**
 * Create a new conversation
 */
async function createConversation({ userId = null, sessionId = null }) {
  try {
    // Check if there's an active conversation for this user/session
    const existingConversation = await ConversationModel.findOne({
      $or: [
        { user: userId, status: "active" },
        { session_id: sessionId, status: "active" },
      ].filter((cond) => cond.user || cond.session_id),
    });

    if (existingConversation) {
      return {
        success: true,
        message: "Active conversation found",
        data: existingConversation,
      };
    }

    const conversation = await ConversationModel.create({
      user: userId || null,
      session_id: sessionId || null,
      status: "active",
      last_extracted_data: {
        phase: "problem_solving",
        booking_ready: false,
      },
    });

    return {
      success: true,
      message: "Conversation created successfully",
      data: conversation,
    };
  } catch (error) {
    console.error("createConversation error:", error);
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
}

/**
 * Get conversation by ID
 */
async function getConversation(id) {
  try {
    const conversation = await ConversationModel.findById(id).populate("user");

    if (!conversation) {
      return {
        success: false,
        message: "Conversation not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Conversation fetched successfully",
      data: conversation,
    };
  } catch (error) {
    console.error("getConversation error:", error);
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
}

/**
 * Get active conversation for user or session
 */
async function getActiveConversation({ userId = null, sessionId = null }) {
  try {
    const query = { status: "active" };

    if (userId) {
      query.user = userId;
    } else if (sessionId) {
      query.session_id = sessionId;
    } else {
      return {
        success: false,
        message: "Either userId or sessionId is required",
        data: null,
      };
    }

    const conversation = await ConversationModel.findOne(query)
      .populate("user")
      .sort({ created_at: -1 });

    if (!conversation) {
      return {
        success: false,
        message: "No active conversation found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Active conversation found",
      data: conversation,
    };
  } catch (error) {
    console.error("getActiveConversation error:", error);
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
}

/**
 * Get all messages for a conversation
 */
async function getConversationMessages(conversationId) {
  try {
    const messages = await ConversationMessageModel.find({
      conversation: conversationId,
    }).sort({ created_at: 1 });

    return {
      success: true,
      message: "Messages fetched successfully",
      data: messages,
    };
  } catch (error) {
    console.error("getConversationMessages error:", error);
    return {
      success: false,
      message: error.message,
      data: [],
    };
  }
}

/**
 * Add a message to a conversation
 */
async function addMessage({
  conversationId,
  role,
  content,
  extractedData = {},
  imageUrl = null,
}) {
  try {
    const message = await ConversationMessageModel.create({
      conversation: conversationId,
      role,
      content,
      extracted_data: extractedData,
      image_url: imageUrl,
    });

    // Update conversation's last_extracted_data if it's an assistant message
    if (role === "assistant" && Object.keys(extractedData).length > 0) {
      await ConversationModel.findByIdAndUpdate(conversationId, {
        last_extracted_data: extractedData,
        updated_at: new Date(),
      });
    }

    return {
      success: true,
      message: "Message added successfully",
      data: message,
    };
  } catch (error) {
    console.error("addMessage error:", error);
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
}

/**
 * Update conversation status
 */
async function updateConversationStatus(id, status) {
  try {
    const conversation = await ConversationModel.findByIdAndUpdate(
      id,
      { status, updated_at: new Date() },
      { new: true }
    );

    if (!conversation) {
      return {
        success: false,
        message: "Conversation not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Conversation status updated",
      data: conversation,
    };
  } catch (error) {
    console.error("updateConversationStatus error:", error);
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
}

/**
 * Close a conversation
 */
async function closeConversation(id) {
  return updateConversationStatus(id, "closed");
}

/**
 * Get the last extracted data from a conversation
 */
async function getLastExtractedData(conversationId) {
  try {
    const lastMessage = await ConversationMessageModel.findOne({
      conversation: conversationId,
      role: "assistant",
    })
      .sort({ created_at: -1 })
      .select("extracted_data");

    return lastMessage?.extracted_data || {
      phase: "problem_solving",
      booking_ready: false,
    };
  } catch (error) {
    console.error("getLastExtractedData error:", error);
    return {
      phase: "problem_solving",
      booking_ready: false,
    };
  }
}

/**
 * Merge previous extracted data with new data.
 * Preserves existing values but allows explicit null to clear fields.
 */
function mergeExtractedData(previous, current) {
  if (!current || typeof current !== "object") return { ...previous };
  const merged = { ...previous };

  for (const key of Object.keys(current)) {
    // Allow explicit null (AI wants to clear a field)
    if (current[key] === null && key in current) {
      merged[key] = null;
    } else if (current[key] !== undefined) {
      merged[key] = current[key];
    }
  }

  return merged;
}

module.exports.ConversationDataSource = {
  createConversation,
  getConversation,
  getActiveConversation,
  getConversationMessages,
  addMessage,
  updateConversationStatus,
  closeConversation,
  getLastExtractedData,
  mergeExtractedData,
};

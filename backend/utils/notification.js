const UserModel = require("../user/model");
async function sendNotification(userId, notificationPayload) {
  try {
    const user = await UserModel.findById(userId).select("deviceTokens");
    if (!user || !user.deviceTokens.length) {
      console.warn(`No device tokens found for user ${userId}`);
      return { success: false, message: "No device tokens found" };
    }
    
    console.log("---------------------------------------------------");
    console.log(`[MOCK NOTIFICATION] To User: ${userId}`);
    console.log(`Title: ${notificationPayload.title || "New Notification"}`);
    console.log(`Body: ${notificationPayload.body || "You have a new update!"}`);
    console.log("Payload:", notificationPayload);
    console.log("Device Tokens:", user.deviceTokens);
    console.log("---------------------------------------------------");

    return {
      success: true,
      message: `Notification logged for ${user.deviceTokens.length} device(s)`,
    };
  } catch (error) {
    console.error(
      `Error sending notification to user ${userId}:`,
      error.message
    );
    return { success: false, message: error.message };
  }
}
module.exports = { sendNotification };

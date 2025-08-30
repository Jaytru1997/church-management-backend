const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true,
});

// Helper function to send notifications to specific channels
const sendNotification = (channel, event, data) => {
  try {
    pusher.trigger(channel, event, data);
    console.log(`✅ Notification sent to ${channel}: ${event}`);
  } catch (error) {
    console.error('❌ Error sending Pusher notification:', error);
  }
};

// Helper function to send notifications to church members
const sendChurchNotification = (churchId, event, data) => {
  const channel = `church-${churchId}`;
  sendNotification(channel, event, data);
};

// Helper function to send notifications to specific users
const sendUserNotification = (userId, event, data) => {
  const channel = `user-${userId}`;
  sendNotification(channel, event, data);
};

// Helper function to send notifications to volunteer teams
const sendTeamNotification = (teamId, event, data) => {
  const channel = `team-${teamId}`;
  sendNotification(channel, event, data);
};

module.exports = {
  pusher,
  sendNotification,
  sendChurchNotification,
  sendUserNotification,
  sendTeamNotification,
};

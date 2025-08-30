const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (process.env.NODE_ENV === 'production') {
      // Production email configuration
      this.transporter = nodemailer.createTransporter({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_ADDR,
          pass: process.env.MAIL_SECRET,
        },
      });
    } else {
      // Development email configuration (Mailtrap)
      this.transporter = nodemailer.createTransporter({
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
        auth: {
          user: process.env.MAILTRAP_USERNAME,
          pass: process.env.MAILTRAP_PASSWORD,
        },
      });
    }
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userEmail, userName, churchName) {
    try {
      const mailOptions = {
        from: `"${process.env.MAIL_DISPLAYNAME}" <${process.env.MAIL_ADDR || process.env.MAILTRAP_USERNAME}>`,
        to: userEmail,
        subject: `Welcome to ${churchName} - Church Management System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Welcome to ${churchName}!</h2>
            <p>Hello ${userName},</p>
            <p>Welcome to the Church Management System! We're excited to have you on board.</p>
            <p>You can now:</p>
            <ul>
              <li>Manage your church activities</li>
              <li>Track donations and expenses</li>
              <li>Coordinate with volunteer teams</li>
              <li>Stay updated with real-time notifications</li>
            </ul>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Church Management Team</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${userEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send donation confirmation email
  async sendDonationConfirmation(donorEmail, donorName, amount, churchName, donationType) {
    try {
      const mailOptions = {
        from: `"${process.env.MAIL_DISPLAYNAME}" <${process.env.MAIL_ADDR || process.env.MAILTRAP_USERNAME}>`,
        to: donorEmail,
        subject: `Donation Confirmation - ${churchName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Thank You for Your Donation!</h2>
            <p>Dear ${donorName},</p>
            <p>We have received your generous donation of <strong>₦${amount.toLocaleString()}</strong> for <strong>${donationType}</strong>.</p>
            <p>Your contribution helps us continue our mission and serve our community better.</p>
            <p>Church: <strong>${churchName}</strong></p>
            <p>Donation Type: <strong>${donationType}</strong></p>
            <p>Amount: <strong>₦${amount.toLocaleString()}</strong></p>
            <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
            <p>Thank you for your support!</p>
            <p>Blessings,<br>The ${churchName} Team</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Donation confirmation email sent to ${donorEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending donation confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send event reminder email
  async sendEventReminder(memberEmail, memberName, eventName, eventDate, churchName) {
    try {
      const mailOptions = {
        from: `"${process.env.MAIL_DISPLAYNAME}" <${process.env.MAIL_ADDR || process.env.MAILTRAP_USERNAME}>`,
        to: memberEmail,
        subject: `Event Reminder: ${eventName} - ${churchName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3498db;">Event Reminder</h2>
            <p>Hello ${memberName},</p>
            <p>This is a friendly reminder about the upcoming event:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">${eventName}</h3>
              <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
              <p><strong>Church:</strong> ${churchName}</p>
            </div>
            <p>We look forward to seeing you there!</p>
            <p>Best regards,<br>The ${churchName} Team</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Event reminder email sent to ${memberEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending event reminder email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userEmail, resetToken, userName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"${process.env.MAIL_DISPLAYNAME}" <${process.env.MAIL_ADDR || process.env.MAILTRAP_USERNAME}>`,
        to: userEmail,
        subject: 'Password Reset Request - Church Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>Best regards,<br>The Church Management Team</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${userEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send campaign update email
  async sendCampaignUpdate(donorEmail, donorName, campaignName, currentAmount, targetAmount, churchName) {
    try {
      const progress = Math.round((currentAmount / targetAmount) * 100);
      
      const mailOptions = {
        from: `"${process.env.MAIL_DISPLAYNAME}" <${process.env.MAIL_ADDR || process.env.MAILTRAP_USERNAME}>`,
        to: donorEmail,
        subject: `Campaign Update: ${campaignName} - ${churchName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8e44ad;">Campaign Progress Update</h2>
            <p>Hello ${donorName},</p>
            <p>Here's an update on the campaign you supported:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">${campaignName}</h3>
              <p><strong>Current Progress:</strong> ${progress}%</p>
              <p><strong>Amount Raised:</strong> ₦${currentAmount.toLocaleString()}</p>
              <p><strong>Target Goal:</strong> ₦${targetAmount.toLocaleString()}</p>
              <div style="background-color: #ecf0f1; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                <div style="background-color: #27ae60; height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
            <p>Thank you for your support! Together we can make a difference.</p>
            <p>Blessings,<br>The ${churchName} Team</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Campaign update email sent to ${donorEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending campaign update email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();

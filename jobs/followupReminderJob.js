const cron = require('node-cron');
const Lead = require('../models/Lead');
const { createNotification } = require('../services/notificationService');

/**
 * Follow-up Reminder Job
 * Runs every hour on the hour.
 * Finds leads whose followUpDate is in the past and notifies the assigned agent.
 */
const startFollowUpReminderJob = (io) => {
  cron.schedule('0 * * * *', async () => {
    console.log('🕐  Running follow-up reminder job...');

    try {
      const now = new Date();

      const leads = await Lead.find({
        followUpDate: { $lte: now },
        assignedAgent: { $ne: null },
        status: { $nin: ['Converted', 'Rejected'] }, // Skip closed leads
      }).populate('assignedAgent', '_id name');

      if (leads.length === 0) {
        console.log('✅  No follow-ups due.');
        return;
      }

      const notificationPromises = leads.map((lead) =>
        createNotification({
          userId:  lead.assignedAgent._id,
          message: `Follow-up reminder: Lead "${lead.name}" was due on ${lead.followUpDate.toDateString()}`,
          type:    'Follow-up Reminder',
          relatedEntity: { entityType: 'Lead', entityId: lead._id },
          io,
          organizationId: lead.organizationId,
        })
      );

      await Promise.allSettled(notificationPromises);

      console.log(`✅  Sent ${leads.length} follow-up reminder(s).`);
    } catch (error) {
      console.error('❌  Follow-up reminder job error:', error.message);
    }
  });

  console.log('📅  Follow-up reminder cron job scheduled (every hour).');
};

module.exports = startFollowUpReminderJob;
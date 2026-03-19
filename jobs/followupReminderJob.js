const cron = require('node-cron');
const FollowUp = require('../models/Follow-up');
const { createNotification } = require('../services/notificationService');

/**
 * Follow-up Reminder Job
 * Runs every minute to handle precise reminders.
 */
const startFollowUpReminderJob = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    // console.log('🕐  Running follow-up reminder job (per minute)...');

    try {
      const now = new Date();
      
      // Define reminder intervals (in minutes)
      const intervals = [
        { label: '12h', minutes: 720 },
        { label: '1h',  minutes: 60  },
        { label: '30m', minutes: 30  },
        { label: '5m',  minutes: 5   },
        { label: 'due', minutes: 0   } // When it's actually due/past due
      ];

      for (const interval of intervals) {
        let query = {
          status: 'Scheduled',
          remindersSent: { $ne: interval.label }
        };

        if (interval.minutes === 0) {
          // Find past due follow-ups not yet marked 'due'
          query.scheduledDate = { $lte: now };
        } else {
          // Find follow-ups due in the next [interval.minutes] (+ 1 min buffer)
          const targetTimeStart = new Date(now.getTime() + (interval.minutes * 60000));
          const targetTimeEnd = new Date(now.getTime() + ((interval.minutes + 1) * 60000));
          
          query.scheduledDate = { $gte: targetTimeStart, $lt: targetTimeEnd };
        }

        const followUps = await FollowUp.find(query).populate({
          path: 'leadId',
          populate: { path: 'assignedAgent', select: '_id name email' }
        });

        for (const f of followUps) {
          if (!f.leadId || !f.leadId.assignedAgent) continue;

          const agent = f.leadId.assignedAgent;
          let msgPrefix = '';
          
          if (interval.minutes === 0) msgPrefix = 'URGENT: Follow-up is DUE NOW';
          else msgPrefix = `REMINDER: Follow-up in ${interval.label}`;

          await createNotification({
            userId:  agent._id,
            message: `${msgPrefix} for "${f.leadId.name}": ${f.note || 'No note added'}`,
            type:    'Follow-up Reminder',
            relatedEntity: { entityType: 'Lead', entityId: f.leadId._id },
            io,
            organizationId: f.organizationId,
            sendEmailNotification: true, // Send email as per user request
          });

          // Mark as sent
          f.remindersSent.push(interval.label);
          await f.save();
        }
      }
    } catch (error) {
      console.error('❌  Follow-up reminder job error:', error.message);
    }
  });

  console.log('📅  Enhanced follow-up reminder job scheduled (every minute).');
};

module.exports = startFollowUpReminderJob;
const axios  = require('axios');
const Message = require('../models/Message');

const WHATSAPP_API_URL  = process.env.WHATSAPP_API_URL;   // e.g. https://graph.facebook.com/v18.0/{phone-number-id}/messages
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Send a WhatsApp text message and persist it in the database.
 *
 * @param {object} opts
 * @param {string} opts.to             - Recipient phone number (with country code, e.g. "919876543210")
 * @param {string} opts.message        - Message text
 * @param {string} opts.leadId         - CRM Lead ObjectId
 * @param {string} opts.senderId       - CRM User ObjectId (agent)
 * @param {string} [opts.type]         - Message type: 'text' | 'template'
 * @param {string} [opts.organizationId]
 */
const sendWhatsAppMessage = async ({
  to,
  message,
  leadId,
  senderId,
  type = 'text',
  organizationId = null,
}) => {
  try {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    let whatsappMessageId = null;
    let status            = 'sent';

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      const { data } = await axios.post(WHATSAPP_API_URL, payload, {
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      whatsappMessageId = data?.messages?.[0]?.id || null;
    } else {
      console.warn('⚠️  WhatsApp API not configured — message queued locally only');
    }

    // Persist to DB regardless of WhatsApp API availability
    const saved = await Message.create({
      leadId,
      senderId,
      message,
      type,
      status,
      whatsappMessageId,
      organizationId,
    });

    return saved;
  } catch (error) {
    // Save as failed
    await Message.create({
      leadId,
      senderId,
      message,
      type,
      status: 'failed',
      organizationId,
    }).catch(() => {});

    throw new Error(`WhatsApp send failed: ${error.message}`);
  }
};

/**
 * Fetch all messages for a lead, newest first.
 */
const getMessagesByLead = async (leadId) => {
  return Message.find({ leadId })
    .populate('senderId', 'name email')
    .sort({ timestamp: -1 });
};

module.exports = { sendWhatsAppMessage, getMessagesByLead };

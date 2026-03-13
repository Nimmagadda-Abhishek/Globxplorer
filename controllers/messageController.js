const Lead    = require('../models/Lead');
const { sendWhatsAppMessage, getMessagesByLead } = require('../services/whatsappService');
const { sendSuccess, createError } = require('../utils/helpers');

/**
 * @desc  Send a WhatsApp message to a lead
 * @route POST /api/messages/send
 * @access Admin, Agent
 */
const sendMessage = async (req, res, next) => {
  try {
    const { leadId, message, type } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return next(createError('Lead not found', 404));

    if (!lead.phone) return next(createError('Lead does not have a phone number', 400));

    const saved = await sendWhatsAppMessage({
      to:      lead.phone,
      message,
      leadId,
      senderId: req.user._id,
      type,
      organizationId: req.user.organizationId,
    });

    return sendSuccess(res, 201, 'Message sent', { message: saved });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all messages for a lead
 * @route GET /api/messages/:leadId
 * @access Admin, Agent
 */
const getMessages = async (req, res, next) => {
  try {
    const messages = await getMessagesByLead(req.params.leadId);
    return sendSuccess(res, 200, 'Messages fetched', { messages, count: messages.length });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, getMessages };

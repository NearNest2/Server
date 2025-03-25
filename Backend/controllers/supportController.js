// supportController.js
const Support = require('../models/supportModel');

const supportController = {
  async submitSupport(req, res) {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Please provide name, email, subject, and message'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      const support = await Support.create({
        restaurantId: req.user.restaurantId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        data: support
      });
    } catch (error) {
      console.error('Support ticket creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit support ticket'
      });
    }
  },

  async getAllTickets(req, res) {
    try {
      const tickets = await Support.find({ 
        restaurantId: req.user.restaurantId 
      })
      .sort({ createdAt: -1 })
      .select('-__v'); 
      
      res.status(200).json({
        success: true,
        count: tickets.length,
        data: tickets
      });
    } catch (error) {
      console.error('Fetch tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch support tickets'
      });
    }
  },

  async getTicketById(req, res) {
    try {
      const ticket = await Support.findOne({
        _id: req.params.id,
        restaurantId: req.user.restaurantId
      }).select('-__v');

      if (!ticket) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ticket not found' 
        });
      }

      res.status(200).json({ 
        success: true, 
        data: ticket 
      });
    } catch (error) {
      console.error('Fetch ticket error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch ticket details' 
      });
    }
  },

  async updateTicketStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ['pending', 'resolved', 'in-progress', 'closed'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const ticket = await Support.findOneAndUpdate(
        {
          _id: req.params.id,
          restaurantId: req.user.restaurantId
        },
        { 
          status,
          updatedAt: new Date()
        },
        { 
          new: true,
          runValidators: true
        }
      ).select('-__v');

      if (!ticket) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ticket not found' 
        });
      }

      res.status(200).json({ 
        success: true, 
        data: ticket 
      });
    } catch (error) {
      console.error('Update ticket error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update ticket status' 
      });
    }
  },

  async deleteTicket(req, res) {
    try {
      const ticket = await Support.findOneAndDelete({
        _id: req.params.id,
        restaurantId: req.user.restaurantId
      });

      if (!ticket) {
        return res.status(404).json({ 
          success: false,
          message: 'Ticket not found' 
        });
      }

      res.status(200).json({ 
        success: true,
        message: 'Ticket deleted successfully' 
      });
    } catch (error) {
      console.error('Delete ticket error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete ticket' 
      });
    }
  }
};

module.exports = supportController;
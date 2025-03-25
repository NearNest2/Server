const jwt = require('jsonwebtoken');
const Restaurant = require('../models/userModel');

module.exports = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header found'
      });
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Must be: Bearer <token>'
      });
    }

    // Extract and validate token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validate decoded token structure
      if (!decoded || !decoded.restaurantId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload'
        });
      }

      // Verify restaurant exists
      const restaurant = await Restaurant.findOne({ restaurantId: decoded.restaurantId });
      if (!restaurant) {
        return res.status(401).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      req.user = {
        restaurantId: decoded.restaurantId
      };

      next();
    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      } else {
        throw jwtError; // Pass other errors to main error handler
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: error.message
    });
  }
};
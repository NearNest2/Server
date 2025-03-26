const Restaurant = require('../models/userModel');
const Menu = require('../models/productModel'); 
const Expense = require('../models/expenseModel'); 
const Table = require('../models/tableModel'); 
const Bill = require('../models/billModel'); 
const HoldBill = require('../models/holdBillModel'); 
const KOT = require('../models/kotModel');
const Setting = require('../models/settingsModel'); 
const Support = require('../models/supportModel'); 

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateRestaurantId = async (restaurantName, outletName) => {
  const prefix = (restaurantName.slice(0, 4) + outletName.slice(0, 4)).toLowerCase();
  const latestRestaurant = await Restaurant.findOne({
    restaurantId: new RegExp(`^${prefix}\\d{4}$`)
  }).sort({ restaurantId: -1 });

  let number = '0001';
  if (latestRestaurant) {
    const currentNumber = parseInt(latestRestaurant.restaurantId.slice(-4));
    number = String(currentNumber + 1).padStart(4, '0');
  }

  return `${prefix}${number}`;
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, restaurantId, isAccountDeletion = false) => {
  console.log(`Attempting to send OTP ${otp} to ${email}`);
  
  const subject = isAccountDeletion ? 'Account Deletion Verification' : 'Verify Your Restaurant Registration';
  const htmlContent = isAccountDeletion ? `
    <h2>Account Deletion Verification</h2>
    <p>Your verification code for account deletion is: <strong>${otp}</strong></p>
    <p>Restaurant ID: <strong>${restaurantId}</strong></p>
    <p>If you didn't request this, please ignore this email.</p>
  ` : `
    <h2>Restaurant Registration Verification</h2>
    <p>Your verification code is: <strong>${otp}</strong></p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendPasswordResetOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Your password reset code is: <strong>${otp}</strong></p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

const userController = {
  searchNearbyRestaurants: async (req, res) => {
    try {
      const { latitude, longitude, maxDistance = 30000 } = req.body; // maxDistance in meters (30km)

      const nearbyRestaurants = await Restaurant.find({
        isVerified: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance // 30km radius
          }
        }
      }).select('restaurantName outletName address contactNumber location');

      res.status(200).json({
        success: true,
        count: nearbyRestaurants.length,
        data: nearbyRestaurants
      });
    } catch (error) {
      console.error('Error searching nearby restaurants:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching nearby restaurants',
        error: error.message
      });
    }
  },

  // Update signup to include location
  signUp: async (req, res) => {
    try {
      const { 
        email, 
        password, 
        restaurantName, 
        outletName, 
        latitude, 
        longitude,
        address,
        contactNumber 
      } = req.body;

      
      const existingOutlet = await Restaurant.findOne({ 
        email,
        restaurantName,
        outletName 
      });
      
      if (existingOutlet) {
        return res.status(400).json({
          success: false,
          message: 'This outlet is already registered'
        });
      }
  
      const restaurantId = await generateRestaurantId(restaurantName, outletName);
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10*60*1000);
      
      const restaurant = new Restaurant({
        restaurantId,
        email,
        password: await bcrypt.hash(password, 10),
        restaurantName,
        outletName,
        isVerified: false,  
        otp: {
          code: otp,
          expiresAt: otpExpiresAt
        }
      });
  
      try {
        await sendOTPEmail(email, otp);
      } catch (emailError) {
        console.error('Failed to send OTP:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.'
        });
      }
  
      await restaurant.save();
  
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        restaurantId
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const { restaurantId, otp } = req.body;

      const restaurant = await Restaurant.findOne({ restaurantId });
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      if (!restaurant.otp?.code || !restaurant.otp?.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new one.'
        });
      }

      if (Date.now() > restaurant.otp.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      if (restaurant.otp.code !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      restaurant.isVerified = true;
      restaurant.otp = undefined;
      await restaurant.save();

      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: error.message
      });
    }
  },

  checkOutlets: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      const restaurants = await Restaurant.find({ 
        email,
        isVerified: true 
      });
      
      if (restaurants.length > 1) {
        const outlets = restaurants.map(r => ({
          restaurantId: r.restaurantId,
          restaurantName: r.restaurantName,
          outletName: r.outletName
        }));
        
        return res.status(200).json({
          success: true,
          hasMultipleOutlets: true,
          outlets
        });
      } else if (restaurants.length === 1) {
        return res.status(200).json({
          success: true,
          hasMultipleOutlets: false
        });
      } else {
        return res.status(200).json({
          success: true,
          hasMultipleOutlets: false,
          message: 'No registered outlets found for this email'
        });
      }
    } catch (error) {
      console.error('Check outlets error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking outlets',
        error: error.message
      });
    }
  },
getRestaurantPublicInfo: async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findOne({ 
      restaurantId,
      isVerified: true 
    }).select('restaurantName outletName email restaurantId');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found or not verified'
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Error fetching restaurant info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurant information',
      error: error.message
    });
  }
},
  signIn: async (req, res) => {
    try {
      const { email, password } = req.body;
  
      const restaurants = await Restaurant.find({ email });
      
      if (restaurants.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
  
      let isAnyVerified = false;
      for (const restaurant of restaurants) {
        if (restaurant.isVerified) {
          isAnyVerified = true;
          break;
        }
      }
  
      if (!isAnyVerified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email before signing in'
        });
      }
  
      // If only one outlet exists
      if (restaurants.length === 1) {
        const restaurant = restaurants[0];
        const isValidPassword = await bcrypt.compare(password, restaurant.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }
        
        const token = jwt.sign(
          { userId: restaurant._id, restaurantId: restaurant.restaurantId },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );
  
        const userData = {
          restaurantId: restaurant.restaurantId,
          email: restaurant.email,
          restaurantName: restaurant.restaurantName,
          outletName: restaurant.outletName
        };
  
        res.status(200).json({
          success: true,
          message: 'Sign in successful',
          token,
          user: userData
        });
      } else {
        const outlets = restaurants
          .filter(r => r.isVerified)
          .map(r => ({
            restaurantId: r.restaurantId,
            restaurantName: r.restaurantName,
            outletName: r.outletName
          }));
  
        res.status(200).json({
          success: true,
          message: 'Multiple outlets found',
          requiresOutletSelection: true,
          outlets: outlets
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      res.status(500).json({
        success: false,
        message: 'Sign in failed',
        error: error.message
      });
    }
  },

  getAvailableOutlets: async (req, res) => {
    try {
      const { email } = req.body;
      
      const restaurants = await Restaurant.find({ 
        email,
        isVerified: true 
      });
      
      const outlets = restaurants.map(r => ({
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName,
        outletName: r.outletName
      }));
      
      res.status(200).json({
        success: true,
        outlets
      });
    } catch (error) {
      console.error('Error fetching available outlets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching available outlets',
        error: error.message
      });
    }
  },

  selectOutlet: async (req, res) => {
    try {
      const { email, restaurantId, password } = req.body;
      
      const restaurant = await Restaurant.findOne({ 
        email, 
        restaurantId,
        isVerified: true
      });
      
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found or not verified'
        });
      }
      
      const isValidPassword = await bcrypt.compare(password, restaurant.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password for this outlet'
        });
      }
      
      const token = jwt.sign(
        { userId: restaurant._id, restaurantId: restaurant.restaurantId },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const userData = {
        restaurantId: restaurant.restaurantId,
        email: restaurant.email,
        restaurantName: restaurant.restaurantName,
        outletName: restaurant.outletName
      };

      res.status(200).json({
        success: true,
        message: 'Outlet selected successfully',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Outlet selection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to select outlet',
        error: error.message
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const restaurant = await Restaurant.findById(req.user.userId)
        .select('-password -otp');
      
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      res.status(200).json({
        success: true,
        data: restaurant
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching profile',
        error: error.message
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const updates = req.body;
      delete updates.password;
      
      const restaurant = await Restaurant.findByIdAndUpdate(
        req.user.userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -otp');

      res.status(200).json({
        success: true,
        data: restaurant
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: error.message
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const restaurant = await Restaurant.findById(req.user.userId);
      const isMatch = await bcrypt.compare(currentPassword, restaurant.password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      restaurant.password = await bcrypt.hash(newPassword, 10);
      await restaurant.save();

      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error changing password',
        error: error.message
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email, restaurantId } = req.body;
      
      const restaurant = await Restaurant.findOne({ 
        email,
        restaurantId,
        isVerified: true 
      });
      
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'No verified account found with this email and restaurant ID'
        });
      }

      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10*60*1000); 

      restaurant.otp = {
        code: otp,
        expiresAt: otpExpiresAt
      };
      
      await restaurant.save();
      await sendPasswordResetOTP(email, otp);

      res.status(200).json({
        success: true,
        message: 'Password reset OTP has been sent to your email'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing password reset request',
        error: error.message
      });
    }
  },
  deleteAccount: async (req, res) => {
    try {
      const { email, restaurantId, password, otp } = req.body;
  
      if (!email || !restaurantId || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email, Restaurant ID, and Password are required' 
        });
      }
  
      const restaurant = await Restaurant.findOne({ email, restaurantId });
  
      if (!restaurant) {
        return res.status(404).json({ 
          success: false, 
          message: 'Restaurant not found. Please check your email and Restaurant ID.'
        });
      }
  
      const isPasswordValid = await bcrypt.compare(password, restaurant.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }

      if (!otp) {
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
  
        restaurant.otp = {
          code: otpCode,
          expiresAt: otpExpiresAt,
        };
  
        await restaurant.save();
        await sendOTPEmail(email, otpCode, restaurantId, true); 
  
        return res.status(200).json({
          success: true,
          message: 'OTP sent to your email for account deletion',
        });
      }

      if (!restaurant.otp?.code || !restaurant.otp?.expiresAt) {
        return res.status(400).json({ 
          success: false, 
          message: 'No OTP was generated. Please request a new one.' 
        });
      }
  
      if (restaurant.otp.code !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
  
      if (Date.now() > restaurant.otp.expiresAt) {
        return res.status(400).json({ success: false, message: 'OTP has expired' });
      }

      await Menu.deleteMany({ restaurantId });
      await Expense.deleteMany({ restaurantId });
      await Table.deleteMany({ restaurantId });
      await Bill.deleteMany({ restaurantId });
      await HoldBill.deleteMany({ restaurantId });
      await KOT.deleteMany({ restaurantId });
      await Setting.deleteMany({ restaurantId });
      await Support.deleteMany({ restaurantId });
  
      await Restaurant.deleteOne({ restaurantId });
  
      res.status(200).json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting account', 
        error: error.message 
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, restaurantId, otp, newPassword } = req.body;
      
      const restaurant = await Restaurant.findOne({
        email,
        restaurantId,
        isVerified: true,
        'otp.code': otp,
        'otp.expiresAt': { $gt: new Date() }
      });

      if (!restaurant) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      restaurant.password = await bcrypt.hash(newPassword, 10);
      restaurant.otp = undefined;
      await restaurant.save();

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Error resetting password',
        error: error.message
      });
    }
  },

  logout: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error logging out',
        error: error.message
      });
    }
  }
};

const autoLogin = async (req, res) => {
  try {
    const { email, restaurantId } = req.body;

    const restaurant = await Restaurant.findOne({ 
      email, 
      restaurantId,
      isVerified: true 
    });

    if (!restaurant) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = jwt.sign(
      { userId: restaurant._id, restaurantId: restaurant.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const userData = {
      restaurantId: restaurant.restaurantId,
      email: restaurant.email,
      restaurantName: restaurant.restaurantName,
      outletName: restaurant.outletName
    };

    res.status(200).json({
      success: true,
      message: 'Auto-login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Auto-login error:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-login failed',
      error: error.message
    });
  }
};

module.exports = {userController, autoLogin};

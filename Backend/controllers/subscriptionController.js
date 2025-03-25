const Subscription = require('../models/subscriptionModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const subscriptionController = {
  async getSubscriptionStatus(req, res) {
    try {
      const subscription = await Subscription.findOne({
        restaurantId: req.user.restaurantId
      }).sort({ endDate: -1 });

      if (!subscription) {
        return res.json({ status: 'inactive' });
      }

      const now = new Date();
      if (subscription.endDate < now) {
        if (subscription.status !== 'expired') {
          subscription.status = 'expired';
          await subscription.save();
        }
        return res.json({ status: 'expired' });
      }

      return res.json({ 
        status: subscription.status,
        plan: subscription.plan,
        endDate: subscription.endDate
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({ message: 'Error getting subscription status' });
    }
  },

  async createSubscriptionOrder(req, res) {
    try {
      const { plan } = req.body;
      
      const planPrices = {
        '1-month': 100,    
        '6-months': 500,   
        '1-year': 1000     
      };
      
      
      if (!planPrices[plan]) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      const options = {
        amount: planPrices[plan],
        currency: 'INR',
        receipt: `subscription_${req.user.restaurantId}_${Date.now()}`,
        notes: {
          restaurantId: req.user.restaurantId,
          plan: plan
        }
      };
      
      const order = await razorpay.orders.create(options);
      
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (error) {
      console.error('Error creating subscription order:', error);
      res.status(500).json({ message: 'Error creating subscription order' });
    }
  },

  async verifySubscriptionPayment(req, res) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;
      
      const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
      const digest = shasum.digest('hex');
      
      if (digest !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
      
      const now = new Date();
      let endDate = new Date(now);
      switch (plan) {
        case '1-month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case '6-months':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case '1-year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      
      let subscription = await Subscription.findOne({ 
        restaurantId: req.user.restaurantId,
        status: 'active'
      });
      
      if (subscription) {

        subscription.endDate = new Date(Math.max(subscription.endDate, endDate));
        subscription.plan = plan;
        subscription.razorpayOrderId = razorpayOrderId;
        subscription.razorpayPaymentId = razorpayPaymentId;
        subscription.razorpaySignature = razorpaySignature;
      } else {
        subscription = new Subscription({
          restaurantId: req.user.restaurantId,
          status: 'active',
          plan: plan,
          startDate: now,
          endDate: endDate,
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          razorpaySignature: razorpaySignature
        });
      }
      
      await subscription.save();
      
      res.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          endDate: subscription.endDate
        }
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ message: 'Error verifying payment' });
    }
  },

  async handlePaymentWebhook(req, res) {
    try {
      const { event, payload } = req.body;
      
      const webhookSignature = req.headers['x-razorpay-signature'];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');
      
      if (digest !== webhookSignature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }
      
      switch (event) {
        case 'payment.authorized':
          await updateSubscriptionAfterPayment(payload.payment.entity);
          break;
        case 'payment.failed':
          await handleFailedPayment(payload.payment.entity);
          break;
      }
      
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Error handling payment webhook:', error);
      res.status(500).json({ message: 'Error handling payment webhook' });
    }
  },
  
  async processPayment(req, res) {
    try {
      const { plan, paymentMethod } = req.body;
      
      const planPrices = {
        basic: 49900,  
        premium: 99900, 
        enterprise: 199900 
      };
      
      if (!planPrices[plan]) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      // Process payment using Razorpay or other methods
      // This is a simplified example - in a real app, you would integrate with a payment gateway
      
      // Create a payment record
      const paymentId = `payment_${Date.now()}`;
      
      // Calculate subscription duration
      const now = new Date();
      let endDate = new Date(now);
      
      switch (plan) {
        case 'basic':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'premium':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case 'enterprise':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }
      
      // Create or update subscription
      let subscription = await Subscription.findOne({ 
        restaurantId: req.user.restaurantId,
        status: 'active'
      });
      
      if (subscription) {
        subscription.endDate = new Date(Math.max(subscription.endDate, endDate));
        subscription.plan = plan;
        subscription.paymentId = paymentId;
      } else {
        subscription = new Subscription({
          restaurantId: req.user.restaurantId,
          status: 'active',
          plan: plan,
          startDate: now,
          endDate: endDate,
          paymentId: paymentId
        });
      }
      
      await subscription.save();
      
      res.json({
        success: true,
        message: 'Payment processed and subscription activated successfully',
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          endDate: subscription.endDate
        }
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ message: 'Error processing payment' });
    }
  }
};

// Helper functions for webhooks
async function updateSubscriptionAfterPayment(payment) {
  try {
    const order = await razorpay.orders.fetch(payment.order_id);
    const { restaurantId, plan } = order.notes;
    
    // Calculate subscription duration based on plan
    const now = new Date();
    let endDate = new Date(now);
    
    switch (plan) {
      case 'basic':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'premium':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'enterprise':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Create or update subscription
    let subscription = await Subscription.findOne({ 
      restaurantId: restaurantId,
      status: 'active'
    });
    
    if (subscription) {
      subscription.endDate = new Date(Math.max(subscription.endDate, endDate));
      subscription.plan = plan;
      subscription.paymentId = payment.id;
      subscription.razorpayOrderId = payment.order_id;
      subscription.razorpayPaymentId = payment.id;
    } else {
      subscription = new Subscription({
        restaurantId: restaurantId,
        status: 'active',
        plan: plan,
        startDate: now,
        endDate: endDate,
        paymentId: payment.id,
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id
      });
    }
    
    await subscription.save();
    return subscription;
  } catch (error) {
    console.error('Error updating subscription after payment:', error);
    throw error;
  }
}

async function handleFailedPayment(payment) {
  try {
    // Log failed payment
    console.log(`Payment failed for order ${payment.order_id}`);
    
    // You might want to notify the user or take other actions
    // For example, you could create a failed payment record
    
    const order = await razorpay.orders.fetch(payment.order_id);
    const { restaurantId } = order.notes;
    
    // You could update a pending subscription to 'failed' status
    // or send a notification to the restaurant
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

module.exports = subscriptionController;

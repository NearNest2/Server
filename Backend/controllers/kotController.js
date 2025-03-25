const Bill = require('../models/billModel');
const HoldBill = require('../models/holdBillModel');

exports.getKOTStatus = async (req, res) => {
  try {
    // Get active bills and hold bills
    const [activeBills, holdBills] = await Promise.all([
      Bill.find({
        restaurantId: req.user.restaurantId,
        status: { $in: ['ACTIVE', 'COMPLETED'] },
        createdAt: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
        }
      }).sort({ createdAt: -1 }),
      
      HoldBill.find({
        restaurantId: req.user.restaurantId,
        status: 'HOLD',
        createdAt: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
        }
      }).sort({ createdAt: -1 })
    ]);

    res.json({
      activeBills,
      holdBills,
      totalKOTs: activeBills.length + holdBills.length
    });
  } catch (error) {
    console.error('Error in getKOTStatus:', error);
    res.status(500).json({ 
      message: 'Failed to fetch KOT status',
      error: error.message 
    });
  }
};
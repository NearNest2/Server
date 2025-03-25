// controllers/reportController.js
const Bill = require('../models/billModel');

// Utility function to get date range
const getDateRange = (timeFrame) => {
  const now = new Date();
  const start = new Date();
  
  switch (timeFrame) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
      break;
    case 'last7days':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last30days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last3months':
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last6months':
      start.setMonth(start.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastyear':
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  
  return { start, end: now };
};

exports.getItemSalesReport = async (req, res) => {
  try {
    const { 
      timeFrame, 
      startDate, 
      endDate,
      sortBy = 'quantity', // quantity or revenue
      limit = 10,
      page = 1
    } = req.query;

    let dateRange;
    
    if (timeFrame) {
      dateRange = getDateRange(timeFrame);
    } else if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
      dateRange.end.setHours(23, 59, 59, 999);
    } else {
      // Default to today if no date range specified
      dateRange = getDateRange('today');
    }

    const pipeline = [
      {
        $match: {
          restaurantId: req.user.restaurantId,
          status: 'COMPLETED',
          createdAt: {
            $gte: dateRange.start,
            $lte: dateRange.end
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            productId: '$items.productId',
            itemName: '$items.itemName',
            category: '$items.category'
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { 
            $sum: { 
              $multiply: ['$items.quantity', '$items.price'] 
            } 
          },
          averagePrice: { $avg: '$items.price' }
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id.productId',
          itemName: '$_id.itemName',
          category: '$_id.category',
          totalQuantity: 1,
          totalRevenue: 1,
          averagePrice: 1
        }
      }
    ];

    // Add sorting based on user preference
    const sortField = sortBy === 'revenue' ? 'totalRevenue' : 'totalQuantity';
    pipeline.push({ $sort: { [sortField]: -1 } });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute the aggregation
    const itemSales = await Bill.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [...pipeline];
    totalPipeline.splice(-2, 2); // Remove skip and limit
    const totalCount = await Bill.aggregate(totalPipeline);

    res.json({
      data: itemSales,
      pagination: {
        total: totalCount.length,
        page: parseInt(page),
        totalPages: Math.ceil(totalCount.length / parseInt(limit))
      },
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      }
    });
  } catch (error) {
    console.error('Error in getItemSalesReport:', error);
    res.status(500).json({
      message: 'Failed to fetch item sales report',
      error: error.message
    });
  }
};
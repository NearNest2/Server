// holdBillController.js
const HoldBill = require('../models/holdBillModel');
const Table = require('../models/tableModel');
const Product = require('../models/productModel');

const calculateTotals = (items, discountPercentage = 0, discountAmount = 0) => {
  const CGST_RATE = 0.025;
  const SGST_RATE = 0.025;
  
  let taxableAmount = 0;
  let nonTaxableAmount = 0;
  
  items.forEach(item => {
    const itemPrice = item.selectedVariant ? 
      item.selectedVariant.price : 
      (item.pricingType === 'mrp' ? item.price : item.price);
      
    const itemTotal = itemPrice * (item.quantity || 1);
    
    if (item.pricingType === 'basePrice') {
      taxableAmount += itemTotal;
    } else {
      nonTaxableAmount += itemTotal;
    }
  });
  
  const subtotal = taxableAmount + nonTaxableAmount;
  const cgst = taxableAmount * CGST_RATE;
  const sgst = taxableAmount * SGST_RATE;
  const totalBeforeDiscount = subtotal + cgst + sgst;
  
  const discount = discountPercentage > 0 ? 
    (totalBeforeDiscount * discountPercentage) / 100 : 
    discountAmount;
  const total = totalBeforeDiscount - discount;
  
  return {
    subtotal: Number(subtotal.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    totalBeforeDiscount: Number(totalBeforeDiscount.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

exports.createHoldBill = async (req, res) => {
  try {
    const { tableId, items, names, discountPercentage = 0, paymentMode = 'Cash' } = req.body;
    const validPaymentModes = ['Cash', 'UPI', 'Card', 'Other'];
    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({ message: 'Invalid payment mode' });
    }

    if (!tableId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Table ID and items are required' });
    }

    // Validate discount percentage
    const validatedDiscount = Number(discountPercentage);
    if (isNaN(validatedDiscount) || validatedDiscount < 0 || validatedDiscount > 100) {
      return res.status(400).json({ message: 'Invalid discount percentage' });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Process all items first to validate they exist
    const itemsWithDetails = [];
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        restaurantId: req.user.restaurantId
      });

      if (!product) {
        return res.status(400).json({ 
          message: `Product not found: ${item.productId}`,
          details: { productId: item.productId }
        });
      }

      let price = product.pricingType === 'mrp' ? product.sellingPrice : product.basePrice;
      if (item.variant) {
        const variant = product.variants.find(v => v.name === item.variant.name);
        if (!variant) {
          return res.status(400).json({ 
            message: `Variant not found for product: ${product.itemName}`,
            details: { productId: item.productId, variantName: item.variant.name }
          });
        }
        price = variant.price;
      }

      itemsWithDetails.push({
        productId: product._id,
        itemName: product.itemName,
        quantity: item.quantity || 1,
        price,
        pricingType: product.pricingType,
        category: product.category,
        variant: item.variant,
        names: item.names
      });
    }

    const totals = calculateTotals(itemsWithDetails, validatedDiscount);

    const holdBill = new HoldBill({
      restaurantId: req.user.restaurantId,
      tableId,
      tableNumber: table.tableNumber,
      items: itemsWithDetails,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      discountPercentage: validatedDiscount,
      discountAmount: totals.discount,
      totalAmount: totals.total,
      names,
      status: 'HOLD',
      paymentMode
    });

    await holdBill.save();
    res.status(201).json(holdBill);
  } catch (error) {
    console.error('Error in createHoldBill:', error);
    res.status(500).json({ 
      message: 'Failed to create hold bill',
      error: error.message 
    });
  }
};

exports.getHoldBills = async (req, res) => {
  try {
    const holdBills = await HoldBill.find({
      restaurantId: req.user.restaurantId,
      status: 'HOLD'
    }).sort({ createdAt: -1 });

    // Get table details for all bills
    const holdBillsWithTableNumbers = await Promise.all(
      holdBills.map(async (bill) => {
        const table = await Table.findById(bill.tableId);
        return {
          ...bill.toJSON(),
          tableNumber: table ? table.tableNumber : null
        };
      })
    );

    res.json(holdBillsWithTableNumbers);
  } catch (error) {
    console.error('Error in getHoldBills:', error);
    res.status(500).json({ 
      message: 'Failed to fetch hold bills',
      error: error.message 
    });
  }
};
// Add to holdBillController.js
exports.getHoldBillsByTableId = async (req, res) => {
  try {
    const { tableId } = req.params;
    
    if (!tableId) {
      return res.status(400).json({ message: 'Table ID is required' });
    }
    
    const holdBills = await HoldBill.find({
      restaurantId: req.user.restaurantId,
      tableId: tableId,
      status: 'HOLD'
    }).sort({ createdAt: -1 });
    
    res.json(holdBills);
  } catch (error) {
    console.error('Error in getHoldBillsByTableId:', error);
    res.status(500).json({ 
      message: 'Failed to fetch hold bills for the table',
      error: error.message 
    });
  }
};

exports.resumeHoldBill = async (req, res) => {
  try {
    const holdBill = await HoldBill.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
      status: 'HOLD'
    });

    if (!holdBill) {
      return res.status(404).json({ message: 'Hold bill not found' });
    }

    // Get table details
    const table = await Table.findById(holdBill.tableId);

    // Update hold bill status
    holdBill.status = 'RESUMED';
    await holdBill.save();

    res.json({
      ...holdBill.toJSON(),
      tableNumber: table ? table.tableNumber : null
    });
  } catch (error) {
    console.error('Error in resumeHoldBill:', error);
    res.status(500).json({ 
      message: 'Failed to resume hold bill',
      error: error.message 
    });
  }
};
exports.updateHoldBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Find the existing hold bill
    const existingBill = await HoldBill.findOne({
      _id: id,
      restaurantId: req.user.restaurantId,
      status: 'HOLD'
    });

    if (!existingBill) {
      return res.status(404).json({ message: 'Hold bill not found or not in HOLD status' });
    }

    // Process the new items to validate they exist
    const newItemsWithDetails = [];
    const invalidProducts = [];

    for (const item of items) {
      try {
        // Log the product ID we're searching for
        console.log(`Searching for product with ID: ${item.productId}`);
        
        const product = await Product.findOne({
          _id: item.productId,
          restaurantId: req.user.restaurantId
        });

        if (!product) {
          console.log(`Product not found: ${item.productId}`);
          invalidProducts.push({
            productId: item.productId,
            message: 'Product not found in the database'
          });
          continue; // Skip this item but continue processing others
        }

        let price = product.pricingType === 'mrp' ? product.mrp : product.basePrice;
        if (item.variant) {
          const variant = product.variants.find(v => v.name === item.variant.name);
          if (!variant) {
            invalidProducts.push({
              productId: item.productId,
              productName: product.itemName,
              variantName: item.variant.name,
              message: 'Variant not found for this product'
            });
            continue; // Skip this item
          }
          price = variant.price;
        }

        newItemsWithDetails.push({
          productId: product._id,
          itemName: product.itemName,
          quantity: item.quantity || 1,
          price,
          pricingType: product.pricingType,
          category: product.category,
          variant: item.variant,
          names: item.names || ''
        });
      } catch (error) {
        console.error(`Error processing item ${item.productId}:`, error);
        invalidProducts.push({
          productId: item.productId,
          message: `Error processing item: ${error.message}`
        });
      }
    }

    // If there are invalid products and no valid ones, return error
    if (invalidProducts.length > 0 && newItemsWithDetails.length === 0) {
      return res.status(400).json({
        message: 'Could not process any of the items',
        invalidProducts
      });
    }

    // If we have some valid products, proceed with update but notify about invalid ones
    const updatedItems = [...existingBill.items];
    
    // Add new items or update quantities for existing ones
    for (const newItem of newItemsWithDetails) {
      const existingItemIndex = updatedItems.findIndex(item => {
        if (newItem.variant && item.variant) {
          return String(item.productId) === String(newItem.productId) && 
                 item.variant.name === newItem.variant.name;
        }
        return String(item.productId) === String(newItem.productId) && !item.variant && !newItem.variant;
      });

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        updatedItems[existingItemIndex].quantity += newItem.quantity;
      } else {
        // Add new item
        updatedItems.push(newItem);
      }
    }

    // Recalculate totals
    const totals = calculateTotals(updatedItems, existingBill.discountPercentage);

    // Update the hold bill
    existingBill.items = updatedItems;
    existingBill.subtotal = totals.subtotal;
    existingBill.cgst = totals.cgst;
    existingBill.sgst = totals.sgst;
    existingBill.discountAmount = totals.discount;
    existingBill.totalAmount = totals.total;

    await existingBill.save();
    
    const responseData = {
      message: 'Hold bill updated successfully',
      holdBill: existingBill
    };

    if (invalidProducts.length > 0) {
      responseData.warning = 'Some items could not be processed';
      responseData.invalidProducts = invalidProducts;
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error in updateHoldBill:', error);
    res.status(500).json({ 
      message: 'Failed to update hold bill',
      error: error.message 
    });
  }
};

exports.deleteHoldBill = async (req, res) => {
  try {
    const existingBill = await HoldBill.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId
    });

    if (!existingBill) {
      return res.status(404).json({ 
        message: 'Hold bill not found',
        details: {
          billId: req.params.id,
          restaurantId: req.user.restaurantId
        }
      });
    }

    // If bill exists, delete it
    const deletedBill = await HoldBill.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.user.restaurantId
    });

    if (!deletedBill) {
      return res.status(500).json({ message: 'Failed to delete hold bill' });
    }

    res.json({ 
      message: 'Hold bill deleted successfully',
      deletedBill: deletedBill
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete hold bill',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
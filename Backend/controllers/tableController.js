const Table = require('../models/tableModel');

const tableController = {
  async getTables(req, res) {
    try {
      const tables = await Table.find({ restaurantId: req.user.restaurantId })
        .sort({ tableNumber: 1 });
      res.json(tables);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async createTable(req, res) {
    try {
      const { tableNumber } = req.body;

      const existingTable = await Table.findOne({ 
        restaurantId: req.user.restaurantId,
        tableNumber 
      });

      if (existingTable) {
        return res.status(400).json({ 
          message: 'Table number already exists' 
        });
      }

      const table = new Table({
        restaurantId: req.user.restaurantId,
        tableNumber,
        status: 'Available'
      });

      const savedTable = await table.save();
      res.status(201).json(savedTable);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  async createBulkTables(req, res) {
    try {
      const { baseNumber, quantity } = req.body;
      
      if (!baseNumber || !quantity) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

      const startNumber = parseInt(baseNumber);
      const tableCount = parseInt(quantity);

      if (tableCount <= 0 || tableCount > 50) {
        return res.status(400).json({ 
          message: 'Quantity must be between 1 and 50' 
        });
      }

      const lastTableNumber = startNumber + tableCount - 1;
      const existingTables = await Table.find({
        restaurantId: req.user.restaurantId,
        tableNumber: { 
          $gte: startNumber, 
          $lte: lastTableNumber 
        }
      });

      if (existingTables.length > 0) {
        return res.status(400).json({
          message: 'Some table numbers in this range already exist',
          conflictingNumbers: existingTables.map(t => t.tableNumber)
        });
      }

      const tablesToCreate = Array.from({ length: tableCount }, (_, index) => ({
        restaurantId: req.user.restaurantId,
        tableNumber: startNumber + index,
        status: 'Available'
      }));

      const savedTables = await Table.insertMany(tablesToCreate);
      res.status(201).json(savedTables);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  async updateTableStatus(req, res) {
    try {
      const { status } = req.body;
      
      if (!['Available', 'Occupied'].includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status' 
        });
      }

      const table = await Table.findOneAndUpdate(
        {
          _id: req.params.tableId,
          restaurantId: req.user.restaurantId
        },
        { status },
        { new: true }
      );

      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }

      res.json(table);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  async deleteTable(req, res) {
    try {
      const table = await Table.findOneAndDelete({
        _id: req.params.tableId,
        restaurantId: req.user.restaurantId
      });

      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }

      res.json({ message: 'Table deleted' });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
};

module.exports = tableController;
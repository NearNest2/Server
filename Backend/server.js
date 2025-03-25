const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/productRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const tableRoutes = require('./routes/tableRoutes');
const settingRoutes = require('./routes/settingsRoutes');
const supportRoutes = require('./routes/supportRoutes');
const holdbillRoutes = require('./routes/holdbillRoutes');
const kotRoutes = require('./routes/kotRoutes');
const billRoutes = require('./routes/billRoutes');
const reportRoutes = require('./routes/reportRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true, 
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'], 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB:', err));

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

app.use('/api', userRoutes);
app.use('/api', menuRoutes);
app.use('/api', expenseRoutes);
app.use('/api', tableRoutes);
app.use('/api', settingRoutes);
app.use('/api', supportRoutes);
app.use('/api', holdbillRoutes);
app.use('/api', kotRoutes);
app.use('/api', billRoutes);
app.use('/api', reportRoutes);
app.use('/api/subscription', subscriptionRoutes);



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
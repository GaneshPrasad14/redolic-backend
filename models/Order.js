const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [{
    id: Number,
    name: String,
    price: Number,
    size: String,
    quantity: Number,
  }],
  total: Number,
  paymentMethod: String,
  paymentId: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);

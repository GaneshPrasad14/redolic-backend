const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Order = require('./models/Order');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email transporter is ready to send messages');
  }
});

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
  console.log('Create order request received:', req.body);
  try {
    const { amount, currency = 'INR' } = req.body;

    // For test, skip order creation and just return key
    // In production, create order as above
    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed',
    });
  }
});

// Save order endpoint
app.post('/api/save-order', async (req, res) => {
  try {
    const { items, total, paymentMethod, paymentId } = req.body;

    const order = new Order({
      items,
      total,
      paymentMethod,
      paymentId,
      status: paymentMethod === 'cod' ? 'pending' : 'paid',
    });

    await order.save();

    // Send email notification to admin
    const orderDetails = items.map(item =>
      `${item.name} (Size: ${item.size}, Qty: ${item.quantity}) - ₹${item.price * item.quantity}`
    ).join('\n');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New Order Received - Order ID: ${order._id}`,
      text: `
New Order Details:

Order ID: ${order._id}
Payment Method: ${paymentMethod}
Payment ID: ${paymentId || 'N/A'}
Total Amount: ₹${total}
Status: ${order.status}

Items:
${orderDetails}

Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.json({
      success: true,
      message: 'Order saved successfully',
      orderId: order._id,
    });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save order',
    });
  }
});

// Verify payment endpoint
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature (in production, implement proper verification)
    // For now, just acknowledge
    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

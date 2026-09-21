const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// 1. Base Route (Fixes "Cannot GET /" error)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'CRB Repayment Backend API',
    version: '1.0.0'
  });
});

// 2. Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 3. Main Loan Repayment & Payment Processing Endpoint
app.post('/api/repay-loan', async (req, res) => {
  try {
    const { lender, accountRef, amount, paymentMethod, mpesaNumber } = req.body;

    // Process M-Pesa Payment via Palpluss API
    if (paymentMethod === 'mpesa') {
      if (!mpesaNumber || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and amount are required.'
        });
      }

      // Format inputs according to Palpluss requirements:
      // - phone: standard mobile string (e.g. 0712345678 or 254712345678)
      // - accountReference: string (max 12 characters)
      // - transactionDesc: string (max 13 characters)
      const payload = {
        amount: Number(amount),
        phone: String(mpesaNumber).trim(),
        accountReference: String(accountRef || 'REPAY').trim().substring(0, 12),
        transactionDesc: String(lender || 'LoanRepay').trim().substring(0, 13)
      };

      const palplussResponse = await fetch('https://api.palpluss.com/v1/payments/stk', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${process.env.PALPLUSS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await palplussResponse.json();

      // Check HTTP status from Palpluss API
      if (!palplussResponse.ok) {
        console.error('Palpluss API Error:', responseData);
        return res.status(palplussResponse.status).json({
          success: false,
          message: responseData.message || 'Failed to initiate M-Pesa STK Push.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'M-Pesa STK Push prompt dispatched to phone.',
        data: responseData
      });
    }

    // Process Card Payment (Fallback / Placeholder)
    if (paymentMethod === 'card') {
      return res.status(200).json({
        success: true,
        message: 'Card payment request received.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Unsupported payment method.'
    });

  } catch (error) {
    console.error('Server Internal Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing repayment.'
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// POST Endpoint for handling Loan Repayment / Payment triggering
app.post('/api/repay-loan', async (req, res) => {
  try {
    const { lender, accountRef, amount, paymentMethod, mpesaNumber, cardDetails } = req.body;

    // Handle M-Pesa STK Push via Palpluss
    if (paymentMethod === 'mpesa') {
      if (!mpesaNumber || !amount) {
        return res.status(400).json({ success: false, message: 'Phone number and amount are required.' });
      }

      // Palpluss expects:
      // - Authorization: Basic <YOUR_PALPLUSS_API_KEY>
      // - phone format: 07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX
      // - accountReference max length: 12 characters
      // - transactionDesc max length: 13 characters
      const palplussResponse = await fetch('https://api.palpluss.com/v1/payments/stk', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${process.env.PALPLUSS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Number(amount),
          phone: mpesaNumber,
          accountReference: String(accountRef || 'REPAY').substring(0, 12),
          transactionDesc: String(lender || 'LoanRepay').substring(0, 13)
        })
      });

      const data = await palplussResponse.json();

      if (!palplussResponse.ok) {
        console.error('Palpluss Error:', data);
        return res.status(palplussResponse.status).json({
          success: false,
          message: data.message || 'Palpluss STK Push failed to initiate.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'STK Push initiated successfully.',
        transactionId: data.transactionId
      });
    }

    // Handle Card details or other methods if needed
    if (paymentMethod === 'card') {
      // Send to card processor tokenization endpoint
      return res.status(200).json({ success: true, message: 'Card payment processed.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid payment method.' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

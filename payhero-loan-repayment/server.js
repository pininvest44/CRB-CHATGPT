const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const PAYHERO_API_URL = 'https://backend.payhero.co.ke/api/v2/payments';
const CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID || 133;
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://example.com/callback';

// Endpoint to process loan repayments via PayHero
app.post('/api/repay-loan', async (req, res) => {
  try {
    const { phoneNumber, amount, lender, accountRef, customerName } = req.body;

    if (!phoneNumber || !amount || !accountRef) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const payload = {
      amount: parseFloat(amount),
      phone_number: phoneNumber,
      channel_id: parseInt(CHANNEL_ID, 10),
      provider: 'm-pesa',
      external_reference: `REPAY-${accountRef}`,
      customer_name: customerName || 'Loan Client',
      callback_url: CALLBACK_URL
    };

    // Forward request to PayHero
    const response = await axios.post(PAYHERO_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Payment request initiated successfully. Please enter your PIN on your phone.',
      data: response.data
    });
  } catch (error) {
    console.error('PayHero Request Error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to initiate repayment via PayHero'
    });
  }
});

// PayHero Webhook Callback Handler
app.post('/api/payhero-callback', (req, res) => {
  const callbackData = req.body;
  console.log('Received PayHero Callback:', callbackData);

  // Process status (e.g., update DB status to PAID)
  res.status(200).json({ status: 'success' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

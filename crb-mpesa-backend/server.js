require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory token store to avoid extra token requests
let cachedToken = null;
let tokenExpiry = null;

/**
 * Retrieves a valid OAuth token using Consumer Key and Consumer Secret
 */
async function getAccessToken() {
    const now = Date.now();

    // Reuse active cached token if valid (30s buffer)
    if (cachedToken && tokenExpiry && now < (tokenExpiry - 30000)) {
        return cachedToken;
    }

    const consumerKey = process.env.CLOUDPAY_CONSUMER_KEY;
    const consumerSecret = process.env.CLOUDPAY_CONSUMER_SECRET;
    const baseUrl = process.env.CLOUDPAY_BASE_URL;

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/oauth/v1/token?grant_type=client_credentials`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);

    return cachedToken;
}

// M-Pesa STK Push Endpoint
app.post('/api/payments/mpesa/stkpush', async (req, res) => {
    const { phone, amount, transactionReference, description } = req.body;

    if (!phone || !amount) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Phone and amount are required' });
    }

    try {
        // Step 1: Get Access Token
        const token = await getAccessToken();

        // Step 2: Trigger Payment Request to pay.cloud.or.ke
        const paymentResponse = await fetch(`${process.env.CLOUDPAY_BASE_URL}/v1/stkpush`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone,
                amount,
                reference: transactionReference,
                description: description || 'Payment processing',
                callback_url: process.env.CALLBACK_URL
            })
        });

        const paymentData = await paymentResponse.json();
        res.status(paymentResponse.status).json(paymentData);

    } catch (err) {
        console.error('STK Push Error:', err.message);
        res.status(500).json({ error: 'PAYMENT_FAILED', message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});

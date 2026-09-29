const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static assets from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Root route check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running.' });
});

// Loan Repayment Endpoint
app.post('/api/repay-loan', async (req, res) => {
    try {
        const { lender, accountRef, amount, paymentMethod, mpesaNumber } = req.body;

        if (!lender || !accountRef || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        if (paymentMethod === 'mpesa') {
            if (!mpesaNumber) {
                return res.status(400).json({ success: false, message: 'M-Pesa phone number is required.' });
            }

            // Format phone number to 10 digits (e.g., 0712345678)
            let formattedPhone = mpesaNumber.replace(/\s+/g, '');
            if (formattedPhone.startsWith('254')) {
                formattedPhone = '0' + formattedPhone.substring(3);
            } else if (formattedPhone.startsWith('+254')) {
                formattedPhone = '0' + formattedPhone.substring(4);
            }

            // Payload for PayHero V2 Payments API
            const payheroPayload = {
                amount: Number(amount),
                phone_number: formattedPhone,
                channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
                provider: "m-pesa",
                external_reference: `REPAY-${accountRef.substring(0, 10)}-${Date.now()}`,
                customer_name: `Lender: ${lender}`,
                callback_url: process.env.PAYHERO_CALLBACK_URL || "https://example.com/callback"
            };

            const headers = {
                'Content-Type': 'application/json'
            };

            // Include Basic Auth header if PayHero credentials are set
            if (process.env.PAYHERO_AUTH_HEADER) {
                headers['Authorization'] = process.env.PAYHERO_AUTH_HEADER;
            }

            const response = await axios.post(
                'https://backend.payhero.co.ke/api/v2/payments',
                payheroPayload,
                { headers }
            );

            return res.json({
                success: true,
                message: 'STK push dispatched successfully.',
                data: response.data
            });

        } else if (paymentMethod === 'card') {
            // Card payment handler logic
            return res.json({
                success: true,
                message: 'Card payment submitted successfully.'
            });
        }

        return res.status(400).json({ success: false, message: 'Invalid payment method.' });

    } catch (error) {
        console.error('PayHero API Error:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || 'Failed to initiate payment with PayHero.'
        });
    }
});

// PayHero Callback Route
app.post('/api/payhero-callback', (req, res) => {
    console.log('PayHero Callback Received:', req.body);
    // Process transaction notification logic here
    res.status(200).json({ status: 'SUCCESS' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

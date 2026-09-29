const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend server running' });
});

// Endpoint: Repay Defaulted Loan via STK Push
app.post('/api/repay-loan', async (req, res) => {
    try {
        const { lender, accountRef, amount, listingDate, paymentMethod, mpesaNumber } = req.body;

        if (paymentMethod !== 'mpesa') {
            return res.status(400).json({ success: false, message: 'Only M-Pesa payment method is currently supported via STK Push.' });
        }

        if (!mpesaNumber || !amount) {
            return res.status(400).json({ success: false, message: 'Phone number and amount are required.' });
        }

        // Format phone number to international standard (254XXXXXXXXX)
        let formattedPhone = mpesaNumber.replace(/\+/g, '').replace(/\s+/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        }

        // External Payment Gateway Endpoint
        const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL || 'https://api.payments.com/api/payments/stk-push';
        const API_KEY = process.env.PAYMENT_API_KEY;

        // Payload structured as per payment gateway spec
        const payload = {
            phoneNumber: formattedPhone,
            amount: Number(amount),
            accountReference: accountRef || `Loan-${lender}`,
            transactionDesc: `Repay defaulted loan to ${lender}`,
            metadata: {
                lender: lender,
                listingDate: listingDate,
                nationalId: accountRef
            }
        };

        const response = await fetch(PAYMENT_GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: data.message || 'Payment provider error.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'STK Push sent to mobile phone.',
            data: data
        });

    } catch (error) {
        console.error('STK Push Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while processing STK push.'
        });
    }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

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

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint for Loan Repayment (STK Push)
app.post('/api/repay-loan', async (req, res) => {
    try {
        const { lender, accountRef, amount, listingDate, paymentMethod, mpesaNumber } = req.body;

        if (paymentMethod !== 'mpesa') {
            return res.status(400).json({ success: false, message: 'Only M-Pesa is supported via STK Push.' });
        }

        if (!mpesaNumber || !amount) {
            return res.status(400).json({ success: false, message: 'Phone number and amount are required.' });
        }

        // Format phone number to 254XXXXXXXXX
        let formattedPhone = mpesaNumber.replace(/\+/g, '').replace(/\s+/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        }

        const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL || 'https://api.payments.com/api/payments/stk-push';
        const API_KEY = process.env.PAYMENT_API_KEY;

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
            message: 'STK Push initiated successfully.',
            data: data
        });

    } catch (error) {
        console.error('STK Push Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while processing request.'
        });
    }
});

// Wildcard route to serve index.html for all frontend requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

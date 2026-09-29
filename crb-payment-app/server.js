const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/repay-loan', async (req, res) => {
    try {
        const { lender, accountRef, amount, listingDate, paymentMethod, mpesaNumber } = req.body;

        if (paymentMethod !== 'mpesa') {
            return res.status(400).json({ success: false, message: 'Only M-Pesa is supported via STK Push.' });
        }

        if (!mpesaNumber || !amount) {
            return res.status(400).json({ success: false, message: 'Phone number and amount are required.' });
        }

        let formattedPhone = mpesaNumber.replace(/\+/g, '').replace(/\s+/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        }

        const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL;
        const API_KEY = process.env.PAYMENT_API_KEY;

        if (!PAYMENT_GATEWAY_URL || !API_KEY) {
            console.error('Missing environment variables: PAYMENT_GATEWAY_URL or PAYMENT_API_KEY');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: Missing gateway credentials.'
            });
        }

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

        // Native fetch used here
        const response = await fetch(PAYMENT_GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('Failed to parse gateway JSON response:', rawText);
            return res.status(502).json({
                success: false,
                message: 'Invalid response format from payment gateway.'
            });
        }

        if (!response.ok) {
            console.error('Gateway Error Response:', response.status, data);
            return res.status(response.status).json({
                success: false,
                message: data.message || 'Payment provider declined request.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'STK Push initiated successfully.',
            data: data
        });

    } catch (error) {
        console.error('STK Push System Catch Error:', error.message, error.stack);
        return res.status(500).json({
            success: false,
            message: `Internal server error: ${error.message}`
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

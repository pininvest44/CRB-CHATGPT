const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const EXPRESSPAY_BASE_URL = process.env.EXPRESSPAY_BASE_URL || 'https://api.expresspay.co.ke';
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

// Serve public/index.html on root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Loan repayment endpoint handling ExpressPay STK Push
app.post('/api/repay-loan', async (req, res) => {
    try {
        const { lender, accountReference, amount, phoneNumber, paymentMethod } = req.body;

        if (paymentMethod === 'mpesa') {
            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required for M-Pesa payments.'
                });
            }

            const stkRequestBody = {
                phoneNumber: phoneNumber,
                amount: Number(amount),
                accountReference: accountReference || `LOAN-${Date.now()}`,
                transactionDesc: `Loan Repayment: ${lender}`,
                metadata: {
                    lender: lender,
                    accountRef: accountReference
                }
            };

            const response = await fetch(`${EXPRESSPAY_BASE_URL}/api/payments/stk-push`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${EXPRESSPAY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(stkRequestBody)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return res.status(response.status).json({
                    success: false,
                    message: data.message || 'ExpressPay payment failed.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'STK Push sent successfully.',
                data: data
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Card payment request received.'
            });
        }

    } catch (error) {
        console.error('ExpressPay STK Push Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while dispatching payment prompt.'
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

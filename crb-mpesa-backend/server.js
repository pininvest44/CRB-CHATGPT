const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory store for transaction statuses
const transactions = new Map();

// Health Check Endpoint
app.get('/', (req, res) => {
    res.status(200).send('CRB Payment API Server is Running');
});

// OAuth Token Endpoint
app.post('/api/oauth/token', (req, res) => {
    // Generate mock Bearer token valid for 1 hour
    const token = 'access_' + Math.random().toString(36).substring(2, 15);
    res.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600
    });
});

// M-Pesa STK Push Endpoint
app.post('/api/payments/mpesa/stkpush', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token missing or expired' });
    }

    const { phone, amount, transactionReference, description } = req.body;

    if (!phone || !amount) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Phone and amount are required' });
    }

    const reference = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const checkoutRequestId = 'ws_CO_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // Track transaction status
    transactions.set(reference, {
        reference,
        checkoutRequestId,
        phone,
        amount,
        status: 'PENDING',
        createdAt: new Date()
    });

    // Simulate callback completion after 10 seconds
    setTimeout(() => {
        if (transactions.has(reference)) {
            transactions.get(reference).status = 'SUCCESS';
        }
    }, 10000);

    res.status(200).json({
        reference,
        checkoutRequestId
    });
});

// Check Payment Status Endpoint
app.get('/api/payments/status/:reference', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const { reference } = req.params;
    const txn = transactions.get(reference);

    if (!txn) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found' });
    }

    res.json({
        reference: txn.reference,
        status: txn.status,
        amount: txn.amount
    });
});

// Legacy Credit Report Submission Route
app.post('/api/submit-credit-report', (req, res) => {
    res.json({ success: true, message: 'Credit report request submitted.' });
});

// Legacy OTP Verification Route
app.post('/api/verify-otp-sms', (req, res) => {
    const { otp } = req.body;
    if (otp) {
        res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
});

// Legacy Loan Repayment Fallback Route
app.post('/api/repay-loan', (req, res) => {
    res.json({ success: true, message: 'Loan repayment request processed.' });
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

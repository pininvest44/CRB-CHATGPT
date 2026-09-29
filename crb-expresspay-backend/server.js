const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Install via: npm install node-fetch@2
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;
const EXPRESSPAY_SUBMIT_URL = process.env.EXPRESSPAY_SUBMIT_URL || 'https://sandbox.expresspaygh.com/api/submit.php';

// Server health check & wake-up endpoint
app.get('/', (req, res) => {
    res.send({ status: 'Server is running', timestamp: new Date() });
});

// 1. Submit Credit Report Request
app.post('/api/submit-credit-report', async (req, res) => {
    const { fullName, nationalId, phoneNumber, email } = req.body;

    if (!fullName || !nationalId || !phoneNumber || !email) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const orderId = `CRB-REP-${Date.now()}`;
        const nameParts = fullName.trim().split(' ');
        const firstname = nameParts[0] || 'Customer';
        const lastname = nameParts.slice(1).join(' ') || 'User';

        const params = new URLSearchParams({
            'merchant-id': EXPRESSPAY_MERCHANT_ID,
            'api-key': EXPRESSPAY_API_KEY,
            'firstname': firstname,
            'lastname': lastname,
            'email': email,
            'phonenumber': phoneNumber,
            'accountnumber': nationalId,
            'currency': 'KES',
            'amount': '50.00',
            'order-id': orderId,
            'order-desc': 'CRB Credit Report & Score Request'
        });

        const response = await fetch(EXPRESSPAY_SUBMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const result = await response.json();

        if (result.status === 1 || result.result === 1) {
            return res.status(200).json({ success: true, token: result.token, orderId });
        } else {
            return res.status(400).json({ success: false, message: result['status-text'] || 'Payment initiation failed.' });
        }
    } catch (err) {
        console.error('Credit report payment error:', err);
        return res.status(500).json({ success: false, message: 'Server error processing request.' });
    }
});

// 2. Process Defaulted Loan Repayment
app.post('/api/repay-loan', async (req, res) => {
    const { lender, accountRef, amount, listingDate, paymentMethod, mpesaNumber, cardDetails } = req.body;

    if (!lender || !accountRef || !amount) {
        return res.status(400).json({ success: false, message: 'Missing required repayment details.' });
    }

    try {
        const orderId = `LOAN-REPAY-${Date.now()}`;

        const params = new URLSearchParams({
            'merchant-id': EXPRESSPAY_MERCHANT_ID,
            'api-key': EXPRESSPAY_API_KEY,
            'currency': 'KES',
            'amount': amount.toFixed(2),
            'order-id': orderId,
            'order-desc': `Defaulted Loan Repayment for ${lender} (ID: ${accountRef})`
        });

        if (paymentMethod === 'mpesa' && mpesaNumber) {
            params.append('phonenumber', mpesaNumber);
        }

        const response = await fetch(EXPRESSPAY_SUBMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const result = await response.json();

        if (result.status === 1 || result.result === 1) {
            return res.status(200).json({ 
                success: true, 
                message: 'Loan repayment process initiated successfully.',
                orderId 
            });
        } else {
            return res.status(400).json({ success: false, message: result['status-text'] || 'ExpressPay failed to process loan payment.' });
        }
    } catch (err) {
        console.error('Loan repayment error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error while processing repayment.' });
    }
});

// 3. OTP Verification Placeholder Route
app.post('/api/verify-otp-sms', (req, res) => {
    const { otp, phoneNumber } = req.body;
    if (otp && otp.length >= 4) {
        return res.status(200).json({ success: true, message: 'OTP verified successfully.' });
    }
    return res.status(400).json({ success: false, message: 'Invalid OTP code entered.' });
});

app.listen(PORT, () => {
    console.log(`Server executing on port ${PORT}`);
});

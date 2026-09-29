const express = require('express');
const cors = require('cors');
const path = path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Resolve public folder dynamically across different directory setups on Render
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
    // Fallback if public folder is inside subfolder (e.g., /crb-payment-app/public)
    const nestedPath = path.join(__dirname, 'crb-payment-app', 'public');
    if (fs.existsSync(nestedPath)) {
        publicPath = nestedPath;
    }
}

app.use(express.static(publicPath));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', publicPath: publicPath });
});

// STK Push Loan Repayment Endpoint
app.post('/api/repay-loan', async (req, res) => {
    try {
        const { lender, accountRef, amount, listingDate, paymentMethod, mpesaNumber } = req.body;

        if (paymentMethod !== 'mpesa') {
            return res.status(400).json({ success: false, message: 'Only M-Pesa is supported via STK Push.' });
        }

        if (!mpesaNumber || !amount) {
            return res.status(400).json({ success: false, message: 'Phone number and amount are required.' });
        }

        // Format phone number to international standard (254XXXXXXXXX)
        let formattedPhone = mpesaNumber.replace(/\+/g, '').replace(/\s+/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        }

        const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL;
        const API_KEY = process.env.PAYMENT_API_KEY;

        if (!PAYMENT_GATEWAY_URL || !API_KEY) {
            console.error('SERVER ERROR: PAYMENT_GATEWAY_URL or PAYMENT_API_KEY environment variables are missing.');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: Missing payment gateway credentials.'
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

        // Execute STK Push using Node.js native fetch
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
            console.error('JSON Parse Error from Gateway:', rawText);
            return res.status(502).json({
                success: false,
                message: 'Invalid response received from payment provider.'
            });
        }

        if (!response.ok) {
            console.error('Gateway Error Response:', response.status, data);
            return res.status(response.status).json({
                success: false,
                message: data.message || 'Payment provider rejected request.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'STK Push initiated successfully.',
            data: data
        });

    } catch (error) {
        console.error('--- STK Push Network Catch Error ---');
        console.error('Error Message:', error.message);
        if (error.cause) {
            console.error('Fetch Cause Detail:', error.cause);
        }

        return res.status(500).json({
            success: false,
            message: `Network error connecting to payment API: ${error.message}`
        });
    }
});

// Wildcard Route: Serve index.html for all non-API requests
app.get('*', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html file not found. Check repository folder structure.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving static files from: ${publicPath}`);
});

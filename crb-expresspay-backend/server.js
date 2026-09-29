const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY || '';
const EXPRESSPAY_SUBMIT_URL = process.env.EXPRESSPAY_SUBMIT_URL || 'https://expresspay.co.ke/api/submit';

app.get('/', (req, res) => {
    res.send({ status: 'Server is active' });
});

app.post('/api/repay-loan', async (req, res) => {
    const { mpesaNumber, phoneNumber, amount } = req.body;
    const mobileNumber = phoneNumber || mpesaNumber;

    console.log('\n--- NEW REPAYMENT REQUEST ---');
    console.log('User Input Phone:', mobileNumber);
    console.log('User Input Amount:', amount);

    if (!mobileNumber || !amount) {
        return res.status(400).json({ 
            success: false, 
            message: 'Both mobile number and amount are required.' 
        });
    }

    try {
        const orderId = `PAY-${Date.now()}`;
        const cleanPhone = mobileNumber.toString().replace(/[^0-9]/g, '');

        // Form-encoded parameters using strictly the API key + required dummy email to clear API validation
        const params = new URLSearchParams();
        params.append('api-key', EXPRESSPAY_API_KEY);
        params.append('phonenumber', cleanPhone);
        params.append('amount', parseFloat(amount).toFixed(2));
        params.append('currency', 'KES');
        params.append('order-id', orderId);
        params.append('email', `customer${cleanPhone}@gmail.com`); // Prevents "Invalid Request - email ()"

        console.log('ExpressPay Target Endpoint:', EXPRESSPAY_SUBMIT_URL);

        const response = await fetch(EXPRESSPAY_SUBMIT_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params
        });

        const rawText = await response.text();
        console.log('ExpressPay HTTP Status:', response.status);
        console.log('ExpressPay Raw Response:', rawText);

        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error('Failed to parse JSON response from ExpressPay.');
            return res.status(400).json({ 
                success: false, 
                message: `ExpressPay API Response: ${rawText}` 
            });
        }

        if (result.status === 1 || result.result === 1 || result.success === true) {
            return res.status(200).json({ 
                success: true, 
                message: 'Payment request initiated successfully.',
                orderId 
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                message: result['status-text'] || result.message || 'Payment processing failed.' 
            });
        }
    } catch (err) {
        console.error('Server Processing Error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error processing payment request.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

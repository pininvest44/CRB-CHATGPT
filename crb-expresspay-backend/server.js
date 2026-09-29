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

    console.log('\n--- NEW PAYMENT REQUEST RECEIVED ---');
    console.log('Incoming Request Body:', JSON.stringify(req.body, null, 2));

    if (!mobileNumber || !amount) {
        console.error('Validation Error: Missing phone number or amount');
        return res.status(400).json({ 
            success: false, 
            message: 'Both mobile number and amount are required.' 
        });
    }

    try {
        const orderId = `PAY-${Date.now()}`;

        const payloadData = {
            'api-key': EXPRESSPAY_API_KEY,
            'phonenumber': mobileNumber,
            'amount': parseFloat(amount).toFixed(2),
            'currency': 'KES',
            'order-id': orderId
        };

        const params = new URLSearchParams(payloadData);

        console.log('Outgoing ExpressPay Target URL:', EXPRESSPAY_SUBMIT_URL);
        console.log('Outgoing Payload Params:', params.toString().replace(EXPRESSPAY_API_KEY, '***HIDDEN_KEY***'));

        const response = await fetch(EXPRESSPAY_SUBMIT_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params
        });

        console.log('ExpressPay Response HTTP Status:', response.status, response.statusText);

        const rawText = await response.text();
        console.log('ExpressPay Raw Response Body:', rawText);

        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error('JSON Parse Error: ExpressPay did not return valid JSON');
            return res.status(400).json({ 
                success: false, 
                message: `Invalid Response from ExpressPay: ${rawText}` 
            });
        }

        if (result.status === 1 || result.result === 1 || result.success === true) {
            console.log('Payment Request Success:', result);
            return res.status(200).json({ 
                success: true, 
                message: 'Payment request initiated successfully.',
                orderId 
            });
        } else {
            console.error('ExpressPay Rejected Transaction:', result);
            return res.status(400).json({ 
                success: false, 
                message: result['status-text'] || result.message || 'Payment initiation failed.' 
            });
        }
    } catch (err) {
        console.error('SERVER EXCEPTION DETECTED:');
        console.error(err.stack || err);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error processing payment request.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

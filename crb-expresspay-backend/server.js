const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;
const EXPRESSPAY_SUBMIT_URL = process.env.EXPRESSPAY_SUBMIT_URL || 'https://expresspay.co.ke/api/submit';

app.get('/', (req, res) => {
    res.send({ status: 'Server is active' });
});

app.post('/api/repay-loan', async (req, res) => {
    const { mpesaNumber, phoneNumber, amount, email } = req.body;
    const mobileNumber = phoneNumber || mpesaNumber;

    if (!mobileNumber || !amount) {
        return res.status(400).json({ 
            success: false, 
            message: 'Both mobile number and amount are required.' 
        });
    }

    try {
        const orderId = `PAY-${Date.now()}`;
        
        // Use provided email or fallback to a default dummy address to satisfy ExpressPay API validation
        const customerEmail = email || `user_${mobileNumber}@crb-kenya.co.ke`;

        const params = new URLSearchParams({
            'api-key': EXPRESSPAY_API_KEY,
            'phonenumber': mobileNumber,
            'amount': parseFloat(amount).toFixed(2),
            'email': customerEmail,
            'currency': 'KES',
            'order-id': orderId
        });

        const response = await fetch(EXPRESSPAY_SUBMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const result = await response.json();

        if (result.status === 1 || result.result === 1 || result.success === true) {
            return res.status(200).json({ 
                success: true, 
                message: 'Payment request initiated successfully.',
                orderId 
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                message: result['status-text'] || result.message || 'Payment initiation failed.' 
            });
        }
    } catch (err) {
        console.error('Payment processing error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error processing payment request.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

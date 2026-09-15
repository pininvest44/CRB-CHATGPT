require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment Variables
const ADMIN_PHONE_NUMBER = (process.env.ADMIN_PHONE_NUMBER || '254710986455').replace('+', '');
const MOBITECH_API_KEY = process.env.MOBITECH_API_KEY || '76de8c373d39d680187c4aed169d1419ccb803adc34ad017';
const MOBITECH_SENDER_NAME = process.env.MOBITECH_SENDER_NAME || 'MOBI-TECH';
const MOBITECH_SERVICE_ID = parseInt(process.env.MOBITECH_SERVICE_ID || '0', 10);

const MOBITECH_ENDPOINT = 'https://app.mobitechtechnologies.com/sms/sendsms';

// Helper to format numbers to 254XXXXXXXXX standard
function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1);
  }
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    return '254' + cleaned;
  }
  return cleaned;
}

app.get('/', (req, res) => {
  res.status(200).send('CRB SMS Service is live.');
});

// 1. Submit Credit Report Request
app.post('/api/submit-credit-report', async (req, res) => {
  try {
    const { fullName, nationalId, phoneNumber, email } = req.body;

    if (!fullName || !nationalId || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, ID Number, and Mobile Number are required.' 
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const smsMessage = `New CRB Request:\nName: ${fullName}\nID: ${nationalId}\nPhone: ${formattedPhone}\nEmail: ${email || 'N/A'}`;

    const smsPayload = {
      mobile: ADMIN_PHONE_NUMBER,
      response_type: 'json',
      sender_name: MOBITECH_SENDER_NAME,
      service_id: MOBITECH_SERVICE_ID,
      message: smsMessage
    };

    const smsResponse = await axios.post(MOBITECH_ENDPOINT, smsPayload, {
      headers: {
        'h_api_key': MOBITECH_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000 
    });

    return res.status(200).json({
      success: true,
      message: 'Request submitted successfully!',
      data: smsResponse.data
    });

  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error('Mobitech API Failure:', errorDetails);
    
    return res.status(500).json({
      success: false,
      message: typeof errorDetails === 'string' ? errorDetails : 'Failed to send SMS via Mobitech API.'
    });
  }
});

// 2. Send OTP Section Entry to User's Mobile Number via Mobitech
app.post('/api/send-otp', async (req, res) => {
  try {
    const { otp, phoneNumber } = req.body;

    if (!otp || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'OTP entry and Phone Number are required.'
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const otpMessage = `Your verification OTP is: ${otp}`;

    const smsPayload = {
      mobile: formattedPhone,
      response_type: 'json',
      sender_name: MOBITECH_SENDER_NAME,
      service_id: MOBITECH_SERVICE_ID,
      message: otpMessage
    };

    const smsResponse = await axios.post(MOBITECH_ENDPOINT, smsPayload, {
      headers: {
        'h_api_key': MOBITECH_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to ' + formattedPhone,
      data: smsResponse.data
    });

  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error('Mobitech OTP SMS Failure:', errorDetails);

    return res.status(500).json({
      success: false,
      message: typeof errorDetails === 'string' ? errorDetails : 'Failed to send OTP via Mobitech API.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration from Environment Variables
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+254710986455';
const MOBITECH_API_KEY = process.env.MOBITECH_API_KEY || '76de8c373d39d680187c4aed169d1419ccb803adc34ad017';
const MOBITECH_SENDER_NAME = process.env.MOBITECH_SENDER_NAME || 'MOBI-TECH';
const MOBITECH_SERVICE_ID = parseInt(process.env.MOBITECH_SERVICE_ID || '0', 10);

const MOBITECH_ENDPOINT = 'https://app.mobitechtechnologies.com/sms/sendsms';

// Route to handle form submission
app.post('/api/submit-credit-report', async (req, res) => {
  try {
    const { fullName, nationalId, phoneNumber, email, loanAmount } = req.body;

    // Validate incoming data
    if (!fullName || !phoneNumber || !nationalId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Format the message body
    const message = `New CRB Form Submission:\nName: ${fullName}\nID: ${nationalId}\nPhone: ${phoneNumber}\nEmail: ${email || 'N/A'}\nAmount: ${loanAmount || 'N/A'}\n\nRegards\nCRB System`;

    // Mobitech Payload Structure
    const smsPayload = {
      mobile: ADMIN_PHONE_NUMBER,
      response_type: 'json',
      sender_name: MOBITECH_SENDER_NAME,
      service_id: MOBITECH_SERVICE_ID,
      message: message
    };

    // Send SMS via Mobitech API
    const response = await axios.post(MOBITECH_ENDPOINT, smsPayload, {
      headers: {
        'h_api_key': MOBITECH_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('Mobitech Response:', response.data);

    return res.status(200).json({
      success: true,
      message: 'Request submitted and SMS notification sent successfully.',
      data: response.data
    });

  } catch (error) {
    console.error('Mobitech API Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Form submitted, but failed to send SMS notification.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

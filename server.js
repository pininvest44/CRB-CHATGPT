const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environmental Variables
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+254710986455';
const MOBITECH_API_KEY = process.env.MOBITECH_API_KEY || '76de8c373d39d680187c4aed169d1419ccb803adc34ad017';
const MOBITECH_SENDER_NAME = process.env.MOBITECH_SENDER_NAME || 'MOBI-TECH';
const MOBITECH_SERVICE_ID = parseInt(process.env.MOBITECH_SERVICE_ID || '0', 10);

const MOBITECH_ENDPOINT = 'https://app.mobitechtechnologies.com/sms/sendsms';

app.post('/api/submit-credit-report', async (req, res) => {
  try {
    const { fullName, nationalId, phoneNumber, email } = req.body;

    if (!fullName || !nationalId || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, ID, and Phone Number are required.' 
      });
    }

    // Format the message body sent to the admin phone
    const smsMessage = `New CRB Credit Report Request:\nName: ${fullName}\nID No: ${nationalId}\nClient Phone: ${phoneNumber}\nEmail: ${email || 'N/A'}`;

    // Payload formatted for Mobitech API
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
      }
    });

    console.log('Mobitech API Response:', smsResponse.data);

    return res.status(200).json({
      success: true,
      message: 'Request processed and SMS notification dispatched.',
      data: smsResponse.data
    });

  } catch (error) {
    console.error('API or Server Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process request and dispatch SMS.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server executing on port ${PORT}`);
});

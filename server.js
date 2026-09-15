const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS explicitly for all origins and headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (for Render cold start pings)
app.get('/', (req, res) => {
  res.status(200).send('CRB SMS Service is live.');
});

// Environment Variables - Ensure phone is formatted as 2547XXXXXXXX without '+'
const ADMIN_PHONE_NUMBER = (process.env.ADMIN_PHONE_NUMBER || '254710986455').replace('+', '');
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
        message: 'Name, ID Number, and Mobile Number are required.' 
      });
    }

    const smsMessage = `New CRB Request:\nName: ${fullName}\nID: ${nationalId}\nPhone: ${phoneNumber}\nEmail: ${email || 'N/A'}`;

    // Mobitech payload (formatted recipient number)
    const smsPayload = {
      mobile: ADMIN_PHONE_NUMBER,
      response_type: 'json',
      sender_name: MOBITECH_SENDER_NAME,
      service_id: MOBITECH_SERVICE_ID,
      message: smsMessage
    };

    // Axios request to Mobitech
    const smsResponse = await axios.post(MOBITECH_ENDPOINT, smsPayload, {
      headers: {
        'h_api_key': MOBITECH_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000 
    });

    console.log('Mobitech API Response:', smsResponse.data);

    // Return success response to client
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

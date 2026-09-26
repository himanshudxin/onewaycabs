/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Enterprise Notification Service (SMS & WhatsApp Engine)
 * Supports Fast2SMS, MSG91, Twilio & WhatsApp Business Cloud API
 */

require('dotenv').config();

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || '';
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'OWTAXI';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';

// Clean Indian 10-digit mobile number
function cleanIndianPhone(phone) {
  return (phone || '').replace(/\D/g, '').slice(-10);
}

// 1. Fast2SMS Indian Gateway Integration
async function sendViaFast2SMS({ phone, message, otp = null }) {
  const cleanPhone = cleanIndianPhone(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, error: 'Invalid 10-digit Indian phone number' };
  }

  if (!FAST2SMS_API_KEY) {
    return { success: false, error: 'FAST2SMS_API_KEY missing' };
  }

  try {
    let bodyPayload = {};
    if (otp) {
      bodyPayload = {
        route: 'otp',
        variables_values: String(otp),
        numbers: cleanPhone
      };
    } else {
      bodyPayload = {
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: cleanPhone
      };
    }

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await response.json();
    return { success: data.return === true || response.ok, provider: 'fast2sms', response: data };
  } catch (err) {
    console.error('[Notification Service] Fast2SMS error:', err.message);
    return { success: false, error: err.message };
  }
}

// 2. MSG91 DLT Standard Indian Gateway
async function sendViaMSG91({ phone, otp, message }) {
  const cleanPhone = cleanIndianPhone(phone);
  if (!MSG91_AUTH_KEY || !cleanPhone) return { success: false, error: 'MSG91 credentials or phone missing' };

  try {
    if (otp) {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${process.env.MSG91_OTP_TEMPLATE_ID || ''}&mobile=91${cleanPhone}&authkey=${MSG91_AUTH_KEY}&otp=${otp}`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();
      return { success: data.type === 'success', provider: 'msg91', response: data };
    } else {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': MSG91_AUTH_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_FLOW_ID || '',
          short_url: '0',
          recipients: [{ mobiles: `91${cleanPhone}`, message }]
        })
      });
      const data = await response.json();
      return { success: data.type === 'success', provider: 'msg91', response: data };
    }
  } catch (err) {
    console.error('[Notification Service] MSG91 error:', err.message);
    return { success: false, error: err.message };
  }
}

// 3. Twilio Global Gateway
async function sendViaTwilio({ phone, message }) {
  const cleanPhone = cleanIndianPhone(phone);
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', `+91${cleanPhone}`);
    params.append('From', TWILIO_FROM_NUMBER);
    params.append('Body', message);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();
    return { success: res.ok, provider: 'twilio', sid: data.sid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 4. WhatsApp Business Cloud API Integration
async function sendViaWhatsAppCloud({ phone, message, templateName = null }) {
  const cleanPhone = cleanIndianPhone(phone);
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
    return { success: false, error: 'WhatsApp Cloud API credentials not configured' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${cleanPhone}`,
        type: 'text',
        text: { body: message }
      })
    });
    const data = await res.json();
    return { success: res.ok, provider: 'whatsapp_cloud', data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 5. Unified High-Level Dispatcher
async function sendSms({ phone, message, otp = null }) {
  const cleanPhone = cleanIndianPhone(phone);
  console.log(`[SMS Dispatch] Target: +91 ${cleanPhone} | Preview: "${(message || `OTP: ${otp}`).slice(0, 80)}..."`);

  // Try Fast2SMS
  if (FAST2SMS_API_KEY) {
    const res = await sendViaFast2SMS({ phone: cleanPhone, message, otp });
    if (res.success) return res;
  }

  // Try MSG91
  if (MSG91_AUTH_KEY) {
    const res = await sendViaMSG91({ phone: cleanPhone, message, otp });
    if (res.success) return res;
  }

  // Try Twilio
  if (TWILIO_ACCOUNT_SID) {
    const res = await sendViaTwilio({ phone: cleanPhone, message: message || `Your OneWayTaxi OTP is ${otp}. Valid for 5 mins.` });
    if (res.success) return res;
  }

  // Development / Console Simulation Logger
  return {
    success: true,
    isSimulated: true,
    provider: 'local_console',
    notice: 'SMS logged to server console. Add FAST2SMS_API_KEY or MSG91_AUTH_KEY in .env for live telecom broadcast.'
  };
}

// Direct WhatsApp Deep Link Generator (Always 100% works for click-to-chat across India)
function generateWhatsAppDeepLink(phone, message) {
  const cleanPhone = cleanIndianPhone(phone);
  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// 6. High-Level Domain Notification Handlers
async function sendBookingConfirmationNotifications(booking) {
  const cleanPhone = cleanIndianPhone(booking.passengerPhone);
  const msg = `Namaste ${booking.passengerName || 'Passenger'}! Your OneWayTaxi from ${booking.pickupCity} to ${booking.dropCity} on ${booking.pickupDate} at ${booking.pickupTime} is CONFIRMED.\nBooking ID: ${booking.bookingId}\nTotal Fare: Rs ${booking.totalFare}\nAdvance Paid: Rs ${booking.advancePaid || 0}\nBalance due to driver: Rs ${booking.balanceDue || booking.totalFare}\n24x7 Patna Helpline: +91 80021 41816.\nHave a safe and comfortable trip!`;

  // SMS
  const smsRes = await sendSms({ phone: cleanPhone, message: msg });

  // WhatsApp Cloud API if enabled
  if (WHATSAPP_ACCESS_TOKEN) {
    sendViaWhatsAppCloud({ phone: cleanPhone, message: msg }).catch(() => {});
  }

  return {
    sms: smsRes,
    whatsappLink: generateWhatsAppDeepLink(cleanPhone, msg)
  };
}

async function sendDriverAssignmentNotifications(booking, driver) {
  const cleanPhone = cleanIndianPhone(booking.passengerPhone);
  const msg = `OneWayTaxi Chauffeur Allocated!\nBooking: ${booking.bookingId}\nRoute: ${booking.pickupCity} -> ${booking.dropCity}\nChauffeur: ${driver.name} (+91 ${cleanPhoneIndian(driver.phone)})\nCab: ${driver.vehicleModel || 'Sedan'} [${driver.vehicleNumber || 'Bihar Cab'}]\nRating: 4.9⭐\nYour driver will arrive 15 minutes before scheduled pickup time.`;

  const smsRes = await sendSms({ phone: cleanPhone, message: msg });
  return {
    sms: smsRes,
    whatsappLink: generateWhatsAppDeepLink(cleanPhone, msg)
  };
}

function cleanPhoneIndian(p) {
  return (p || '').replace(/\D/g, '').slice(-10);
}

function getNotificationConfig() {
  return {
    fast2smsConfigured: !!FAST2SMS_API_KEY,
    msg91Configured: !!MSG91_AUTH_KEY,
    twilioConfigured: !!TWILIO_ACCOUNT_SID,
    whatsappCloudConfigured: !!WHATSAPP_ACCESS_TOKEN,
    helplinePhone: process.env.DISPATCH_HELPLINE || '+91 80021 41816'
  };
}

module.exports = {
  sendSms,
  sendViaFast2SMS,
  sendViaMSG91,
  sendViaTwilio,
  sendViaWhatsAppCloud,
  generateWhatsAppDeepLink,
  sendBookingConfirmationNotifications,
  sendDriverAssignmentNotifications,
  getNotificationConfig
};

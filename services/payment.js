/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Enterprise Payment Gateway Service (Razorpay & Cashfree)
 * Handles Advance Booking Token Payments, Webhooks & Cryptographic Signature Verification
 */

require('dotenv').config();
const crypto = require('crypto');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';

// 1. Create Razorpay Order
async function createRazorpayOrder({ amountInRupees, bookingId, passengerName, passengerPhone, notes = {} }) {
  const amountInPaise = Math.round(Number(amountInRupees) * 100);
  const receipt = `rcpt_${bookingId || Date.now()}`.slice(0, 40);

  // If live or test keys are present in environment
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    try {
      const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            bookingId: bookingId || '',
            passengerName: passengerName || '',
            passengerPhone: passengerPhone || '',
            platform: 'OneWayTaxiBihar',
            ...notes
          }
        })
      });

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.error?.description || 'Razorpay order creation failed');
      }

      return {
        success: true,
        provider: 'razorpay',
        keyId: RAZORPAY_KEY_ID,
        orderId: orderData.id,
        amount: orderData.amount, // in paise
        currency: orderData.currency,
        isSandbox: false
      };
    } catch (err) {
      console.error('[Payment Service] Razorpay API error:', err.message);
      throw err;
    }
  }

  // Graceful Sandbox / Demo Mode for testing when keys are pending
  const sandboxOrderId = `order_demo_${Date.now()}`;
  return {
    success: true,
    provider: 'razorpay_sandbox',
    keyId: RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
    orderId: sandboxOrderId,
    amount: amountInPaise,
    currency: 'INR',
    isSandbox: true,
    notice: 'Demo mode active. Provide RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env for live bank settlements.'
  };
}

// 2. Verify Razorpay Payment Signature (HMAC SHA-256)
function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId) {
    return { verified: false, error: 'Missing orderId or paymentId' };
  }

  // If in sandbox mode without real secrets, accept demo signature
  if (!RAZORPAY_KEY_SECRET && orderId.startsWith('order_demo_')) {
    return { verified: true, isSandbox: true, paymentId, orderId };
  }

  if (!RAZORPAY_KEY_SECRET) {
    return { verified: false, error: 'RAZORPAY_KEY_SECRET not configured' };
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature || '', 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return { verified: false, error: 'Signature length mismatch' };
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    return { verified: isValid, orderId, paymentId };
  } catch (err) {
    return { verified: false, error: err.message };
  }
}

// 3. Verify Razorpay Webhook Signature
function verifyRazorpayWebhook(payloadString, webhookSignature) {
  if (!RAZORPAY_WEBHOOK_SECRET) return false;
  try {
    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
    return expected === webhookSignature;
  } catch (e) {
    return false;
  }
}

// 4. Cashfree PG Support
async function createCashfreeOrder({ amountInRupees, bookingId, customerId, customerPhone, customerEmail }) {
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    return {
      success: true,
      provider: 'cashfree_sandbox',
      orderId: `cf_order_${Date.now()}`,
      isSandbox: true,
      notice: 'Configure CASHFREE_APP_ID & CASHFREE_SECRET_KEY in .env'
    };
  }

  const endpoint = process.env.CASHFREE_ENV === 'production' 
    ? 'https://api.cashfree.com/pg/orders' 
    : 'https://sandbox.cashfree.com/pg/orders';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: `cf_${bookingId}_${Date.now()}`.slice(0, 45),
      order_amount: Number(amountInRupees),
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId || `cust_${customerPhone}`,
        customer_phone: (customerPhone || '9876543210').slice(-10),
        customer_email: customerEmail || 'passenger@onewaytaxibihar.com'
      },
      order_meta: {
        return_url: `https://onewaytaxibihar.com/booking-success.html?order_id={order_id}`
      }
    })
  });

  const data = await res.json();
  return { success: res.ok, data };
}

function getPaymentConfig() {
  return {
    razorpayConfigured: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
    cashfreeConfigured: !!(CASHFREE_APP_ID && CASHFREE_SECRET_KEY),
    razorpayKeyId: RAZORPAY_KEY_ID || null,
    defaultAdvanceAmount: 299, // INR
    supportedCurrencies: ['INR']
  };
}

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyRazorpayWebhook,
  createCashfreeOrder,
  getPaymentConfig
};

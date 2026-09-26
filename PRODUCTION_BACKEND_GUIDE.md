# OneWayTaxiBihar - Real-World Production Backend Architecture Guide

This guide details the enterprise production backend setup implemented for **OneWayTaxiBihar** (`onewaytaxibihar.com`), covering the **Database Layer**, **Razorpay Indian Payment Gateway**, and **SMS/WhatsApp Telecom Gateways**.

---

## 1. Enterprise Database Service (`services/db.js`)

Your application now has an Enterprise Database Service that supports both **MongoDB Atlas** and **PostgreSQL (Supabase / Neon / RDS)** with seamless zero-downtime local caching.

### Connecting MongoDB Atlas:
Your credentials are configured in `.env`:
```env
MONGODB_URI=mongodb+srv://himanshudu255_db_user:Himanshu%40123@cluster0.7pf5pvc.mongodb.net/onewaytaxibihar?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=onewaytaxibihar
```

> [!IMPORTANT]
> **Action Required in MongoDB Atlas Dashboard:**
> If you see `SSL routines:ssl3_read_bytes:tlsv1 alert internal error` (Alert 80), MongoDB Atlas is blocking incoming network IPs.
> 1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com/).
> 2. Go to **Security** $\to$ **Network Access**.
> 3. Click **Add IP Address**.
> 4. Select **Allow Access from Anywhere (`0.0.0.0/0`)** and click **Confirm**.
> 5. Within 60 seconds, your server will automatically connect and push all records!

### Option B: Using PostgreSQL (Supabase / Neon)
If you prefer PostgreSQL for ACID relational guarantees:
1. Create a free PostgreSQL project at [supabase.com](https://supabase.com).
2. Add your connection string in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:<your_password>@db.<project_ref>.supabase.co:5432/postgres?sslmode=require
   ```
3. Restart the server (`npm start`). It will automatically auto-create tables and sync.

### Database Migration Tool
To seed all existing records from `data/db.json` into your remote cloud database at any time, run:
```bash
node scripts/migrate-database.js
```

---

## 2. Indian Payment Gateway (`services/payment.js`)

The platform is integrated with **Razorpay** (supporting PhonePe, Google Pay, Paytm, BHIM UPI, RuPay, Debit/Credit Cards, and Netbanking) for advance token payments (₹299 default).

### Available Endpoints:
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/payments/config` | Retrieves public payment settings and active gateways |
| `POST` | `/api/payments/create-order` | Generates a Razorpay order in INR paise |
| `POST` | `/api/payments/verify` | Cryptographically verifies HMAC-SHA256 signature |
| `POST` | `/api/payments/webhook` | Handles background asynchronous payment capture |

### Setting Up Live Payments:
1. Sign up / Log in to [dashboard.razorpay.com](https://dashboard.razorpay.com/).
2. Navigate to **Account & Settings** $\to$ **API Keys**.
3. Generate your **Key ID** and **Key Secret**.
4. Paste them into `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
   ```
5. Restart your server. The frontend booking modal will automatically switch from Sandbox to Live Bank Settlements!

---

## 3. SMS & WhatsApp Telecom Gateways (`services/notification.js`)

The platform features a multi-channel telecom engine supporting:
- **Fast2SMS**: Instant OTP route (no DLT approval required for Quick OTP).
- **MSG91**: DLT enterprise standard in India for transactional SMS.
- **Twilio**: Global SMS gateway.
- **WhatsApp Cloud API**: Direct template messages to passenger and driver.

### Activating Real SMS in 2 Minutes (Fast2SMS):
1. Create a free account at [fast2sms.com](https://www.fast2sms.com/).
2. Copy your **Dev API Key** from your Fast2SMS Dashboard.
3. Paste into `.env`:
   ```env
   FAST2SMS_API_KEY=your_fast2sms_api_key_here
   ```
4. Now, every OTP requested via `/api/auth/send-otp` or booking confirmation will be sent as an actual SMS to Indian mobile numbers (+91)!

### Testing Notification Dispatch:
You can verify SMS delivery at any time:
```bash
curl -X POST http://localhost:8080/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"phone":"6206494214","message":"OneWayTaxiBihar live test message"}'
```

---

## 4. Diagnostics & System Health Endpoint

Visit:
```http
GET http://localhost:8080/api/admin/system-status
```
Returns real-time status of:
- **Database Engine** (`mongodb` / `postgres` / `local` + connection state + record counts)
- **Payment Gateway** (`razorpayConfigured`, `cashfreeConfigured`, `keyId`)
- **Notification Gateways** (`fast2smsConfigured`, `msg91Configured`, `twilioConfigured`)

---

## 5. Summary of Architecture Enhancements

```
┌────────────────────────────────────────────────────────┐
│                   OneWayTaxiBihar                      │
├────────────────────────────────────────────────────────┤
│  Frontend (Customer / Admin / Driver)                  │
│  - Razorpay Checkout v1 Popup Integration              │
│  - 1-Click WhatsApp Direct Deep Links                  │
│  - Real-time Status Badges & Driver Allocation Alerts  │
├────────────────────────────────────────────────────────┤
│  REST API Layer (api/index.js)                         │
│  - /payments/create-order & /payments/verify           │
│  - /auth/send-otp with telecom SMS dispatch            │
│  - /admin/system-status live diagnostics               │
│  - Concurrency & 15-second duplicate booking lock      │
├────────────────────────────────────────────────────────┤
│  Enterprise Services                                   │
│  - services/db.js (MongoDB Atlas + PostgreSQL + Cache) │
│  - services/payment.js (HMAC SHA-256 Signature Verify) │
│  - services/notification.js (Fast2SMS/MSG91/WhatsApp)  │
└────────────────────────────────────────────────────────┘
```

# OneWayTaxiBihar (OTB) - Complete API & System Specification Blueprint
> **Version:** 2.0.0 (Enterprise Production Standard)  
> **Platform:** Outstation Intercity One-Way & Round-Trip Taxi Network across Bihar & Neighboring States  
> **Target Deployments:** Vercel Serverless Functions, Node.js Docker / VPS Container, MongoDB Atlas Cloud  

---

## 1. Executive Summary & Domain Overview
**OneWayTaxiBihar** (`onewaytaxibihar.com`) is a dedicated intercity taxi hailing and dispatch platform operating across all 38 districts of Bihar (Patna, Gaya, Muzaffarpur, Darbhanga, Bhagalpur, Purnia, etc.) plus cross-border routes (Varanasi, Deoghar, Ranchi, Siliguri, Gorakhpur, Kolkata).

### Core Value Propositions
1. **Guaranteed Zero Return-Fare on One-Way Trips**: Passengers only pay for the exact distance travelled one-way (no empty return taxi fees).
2. **All-Inclusive Transparent Pricing**: Base fare includes Tolls, FASTag, State Entry Permits, Driver Allowance, and 5% GST.
3. **Instant Zero-Click Lead Capture**: Instant ingestion of customer inquiries into Central Dispatch when fare calculations or phone numbers are inputted.
4. **Sub-20ms High-Throughput Cloud Database**: Connection-pooled MongoDB Atlas engine with memory-cached revalidation.
5. **Multi-Role Security**: Passenger Self-Service, Central Dispatcher / Admin, and Driver Fleet Chauffeur interfaces.

---

## 2. Technology Stack & Runtime Specifications

| Layer | Recommended Technology | Requirements & Runtime Flags |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18.x to v24.x) | CommonJS / ES Modules, Native HTTP, `crypto`, `zlib` |
| **Primary Database** | MongoDB Atlas Cloud (v6.x+) | Connection Pooling (`maxPoolSize: 50`, `minPoolSize: 5`, `socketTimeoutMS: 30000`) |
| **Fallback / Cache** | In-Memory Atomic Read/Write Cache | Revalidated every 3s in background; file persistence (`data/db.json`) |
| **Serverless Host** | Vercel Serverless Functions | `vercel.json` rewrite configuration (`/api/(.*)` ➔ `api/index.js`) |
| **Communication Layer** | WhatsApp Cloud API / Fast2SMS | Dynamic webhook & automated booking dispatch templates |
| **Payment Gateway** | Razorpay Indian Payment Gateway | Standard UPI Intent, QR Codes, NetBanking, Debit/Credit Cards |

---

## 3. Highway Distance & Dynamic Pricing Algorithm

### 3.1 Cab Fleet Tiers & Base Tariffs

| Fleet Tier | Vehicle Models | Base Rate / KM | Min Billable KM | Driver Allowance | Minimum Booking Fare |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Go Hatchback** | Maruti WagonR, Tata Tiago, Celerio | **₹11.50 / km** | 100 KM | ₹250 (if >250 km) | ₹1,499 |
| **Prime Sedan** | Swift Dzire, Toyota Etios, Honda Amaze | **₹13.50 / km** | 100 KM | ₹300 (if >250 km) | ₹1,799 |
| **Family SUV** | Maruti Ertiga, Kia Carens, Triber (6-7 Seats) | **₹18.50 / km** | 100 KM | ₹400 (if >250 km) | ₹2,499 |
| **Executive Innova** | Toyota Innova Crysta | **₹24.00 / km** | 100 KM | ₹500 (if >250 km) | ₹3,499 |

### 3.2 Highway Distance Calculation Formula
Distance between any two cities is computed by:
1. **Pre-computed Highway Matrix** (`BIHAR_DISTANCES` mapping e.g. `patna_gaya: 104`, `patna_darbhanga: 142`, `patna_muzaffarpur: 75`, `patna_bhagalpur: 235`).
2. **Haversine Geodesic Fallback with Road Tortuosity**:
   $$\text{Road Distance (KM)} = \text{Haversine}(\text{Coord}_1, \text{Coord}_2) \times 1.28$$
   *(1.28 factor accounts for Bihar State Highway & NH topology).*

### 3.3 Final Fare Formula
$$\text{Base Charge} = \max(\text{Distance KM}, \text{Min KM}) \times \text{Per KM Rate}$$
$$\text{Estimated Tolls \& FASTag} = \text{round}(\text{Distance KM} \times 1.60)$$
$$\text{GST (5\%)} = \text{round}((\text{Base Charge} + \text{Driver Allowance}) \times 0.05)$$
$$\text{Total Fare} = \text{Base Charge} + \text{Tolls} + \text{Driver Allowance} + \text{GST} - \text{Discount}$$

---

## 4. Complete Database Schemas (MongoDB Collections)

### 4.1 Collection: `bookings`
```json
{
  "_id": "ObjectId",
  "bookingId": "OTB-2026-4891",
  "customerId": "USR_9835123456",
  "passengerName": "Amit Kumar",
  "passengerPhone": "+91 9835123456",
  "passengerEmail": "amit@example.com",
  "originCity": "Patna",
  "destCity": "Gaya",
  "pickupAddress": "Boring Road Crossing, Patna",
  "dropAddress": "Bodhtree Chowk, Gaya",
  "pickupDate": "2026-10-15",
  "pickupTime": "08:30 AM",
  "distanceKm": 104,
  "duration": "2h 45m",
  "fleetClass": "Prime Sedan",
  "fleetModel": "Swift Dzire / Etios",
  "tripOtp": "4891",
  "totalFare": 2198,
  "advancePaid": 300,
  "balanceDue": 1898,
  "walletUsed": 100,
  "couponCode": "BIHAR100",
  "couponDiscount": 100,
  "paymentMethod": "Cash/UPI to Driver",
  "paymentStatus": "PARTIALLY_PAID",
  "bookingStatus": "REQUESTED",
  "assignedDriverId": "DRV_101",
  "driverDetails": {
    "id": "DRV_101",
    "name": "Ramesh Singh",
    "phone": "+91 9876543210",
    "vehicleNumber": "BR 01 PB 1234",
    "vehicleModel": "Swift Dzire White",
    "rating": 4.9
  },
  "statusHistory": [
    {
      "status": "REQUESTED",
      "timestamp": "2026-10-03T15:00:00.000Z",
      "actor": "Passenger",
      "note": "Online booking request received"
    }
  ],
  "whatsappDispatchUrl": "https://wa.me/917281851011?text=...",
  "createdAt": "2026-10-03T15:00:00.000Z",
  "updatedAt": "2026-10-03T15:00:00.000Z"
}
```

### 4.2 Collection: `leads` (Fare Checks & Unfinished Checkout Inquiries)
```json
{
  "_id": "ObjectId",
  "id": "LEAD_1791040000",
  "phone": "+91 9835123456",
  "cleanPhone": "9835123456",
  "passengerName": "Amit Kumar",
  "originCity": "Patna",
  "destCity": "Gaya",
  "tripType": "oneway",
  "distanceKm": 104,
  "duration": "2h 45m",
  "estFareSedan": 2198,
  "source": "Hero Fare Check",
  "status": "NEW",
  "bookingId": null,
  "notes": [],
  "createdAt": "2026-10-03T14:55:00.000Z",
  "updatedAt": "2026-10-03T14:55:00.000Z"
}
```

### 4.3 Collection: `drivers`
```json
{
  "_id": "ObjectId",
  "id": "DRV_101",
  "name": "Ramesh Kumar Singh",
  "phone": "+91 9876543210",
  "licenseNumber": "BR-01-2018-009876",
  "city": "Patna",
  "currentLocation": "Patna Junction Stand",
  "cabTier": "Prime Sedan",
  "vehicleNumber": "BR 01 PB 1234",
  "vehicleModel": "Swift Dzire",
  "status": "AVAILABLE",
  "rating": 4.9,
  "totalTrips": 342,
  "kycVerified": true,
  "createdAt": "2026-01-10T10:00:00.000Z"
}
```

### 4.4 Collection: `users` (Passengers)
```json
{
  "_id": "ObjectId",
  "id": "USR_9835123456",
  "name": "Amit Kumar",
  "phone": "+91 9835123456",
  "cleanPhone": "9835123456",
  "email": "amit@example.com",
  "walletBalance": 100,
  "role": "customer",
  "createdAt": "2026-10-03T15:00:00.000Z"
}
```

### 4.5 Collection: `sessions`
```json
{
  "_id": "ObjectId",
  "token": "otb_8f29acb091f8273645e",
  "userId": "adm_01",
  "phone": "+91 6206494214",
  "role": "admin",
  "createdAt": "2026-10-03T15:00:00.000Z"
}
```

---

## 5. Comprehensive REST API Specifications

### 5.1 Public & Passenger Endpoints

#### 1. System Health Check
- **Route**: `GET /api/health`
- **Auth**: None
- **Response `200 OK`**:
```json
{
  "status": "ONLINE",
  "platform": "OneWayTaxiBihar Production API",
  "domain": "onewaytaxibihar.com",
  "time": "2026-10-03T15:30:00.000Z",
  "helpline": "+91 80021 41816",
  "whatsapp": "+91 72818 51011"
}
```

#### 2. Fare Calculation Engine
- **Route**: `POST /api/fare/calculate`
- **Request Body**:
```json
{
  "originCity": "Patna",
  "destCity": "Darbhanga",
  "tripType": "oneway"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "originCity": "Patna",
  "destCity": "Darbhanga",
  "distanceKm": 142,
  "duration": "3h 15m",
  "fares": {
    "hatchback": { "tierName": "Go Hatchback", "totalFare": 1999, "baseRate": 11.5 },
    "sedan": { "tierName": "Prime Sedan", "totalFare": 2499, "baseRate": 13.5 },
    "suv": { "tierName": "Family SUV", "totalFare": 3799, "baseRate": 18.5 },
    "innova": { "tierName": "Executive Innova", "totalFare": 4999, "baseRate": 24.0 }
  }
}
```

#### 3. Ingest Instant Inquiry / Lead
- **Route**: `POST /api/leads`
- **Request Body**:
```json
{
  "phone": "9835123456",
  "passengerName": "Amit Kumar",
  "originCity": "Patna",
  "destCity": "Gaya",
  "tripType": "oneway",
  "source": "Hero Fare Check"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "lead": { "id": "LEAD_1791040123", "status": "NEW", "phone": "+91 9835123456" }
}
```

#### 4. Create New Booking Request
- **Route**: `POST /api/bookings`
- **Request Body**:
```json
{
  "passengerName": "Amit Kumar",
  "passengerPhone": "9835123456",
  "passengerEmail": "amit@example.com",
  "originCity": "Patna",
  "destCity": "Gaya",
  "pickupAddress": "Boring Road Crossing, Patna",
  "dropAddress": "Bodhtree Chowk, Gaya",
  "pickupDate": "2026-10-15",
  "pickupTime": "08:30 AM",
  "cabTier": "sedan",
  "totalFare": 2198,
  "useWallet": true,
  "couponCode": "BIHAR100",
  "paymentMethod": "Cash to Driver"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "booking": {
    "bookingId": "OTB-2026-4891",
    "bookingStatus": "REQUESTED",
    "tripOtp": "4891",
    "totalFare": 2098,
    "whatsappDispatchUrl": "https://wa.me/917281851011?text=..."
  },
  "message": "Booking request received! Our partner/driver will call you within 5 minutes."
}
```

#### 5. Cancel Booking (Zero Cancellation Fee)
- **Route**: `POST /api/bookings/cancel`
- **Request Body**: `{ "bookingId": "OTB-2026-4891" }`
- **Response `200 OK`**:
```json
{ "success": true, "message": "Booking cancelled successfully with ₹0 fee" }
```

---

### 5.2 Central Dispatch & Admin Endpoints

#### 1. Admin Authentication
- **Route**: `POST /api/admin/login`
- **Request Body**: `{ "username": "admin", "password": "your_secure_password" }`
- **Response `200 OK`**:
```json
{
  "success": true,
  "token": "adm_sess_90f7a8b1c2d3e4f5",
  "admin": { "id": "adm_01", "username": "admin", "role": "admin" }
}
```

#### 2. Query All Bookings (Reverse Chronological)
- **Route**: `GET /api/admin/bookings`
- **Header**: `Authorization: Bearer <admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 31,
  "bookings": [ /* array of booking documents, newest first */ ]
}
```

#### 3. Query All Live Leads / Inquiries
- **Route**: `GET /api/admin/leads`
- **Header**: `Authorization: Bearer <admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 24,
  "leads": [ /* array of lead documents, newest first */ ]
}
```

#### 4. Confirm Booking & Assign Driver
- **Route**: `POST /api/admin/assign-driver`
- **Header**: `Authorization: Bearer <admin_token>`
- **Request Body**:
```json
{
  "bookingId": "OTB-2026-4891",
  "driverId": "DRV_101"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "booking": {
    "bookingId": "OTB-2026-4891",
    "bookingStatus": "ASSIGNED",
    "driverDetails": { "name": "Ramesh Kumar Singh", "phone": "+91 9876543210" }
  }
}
```

#### 5. Query Driver Fleet
- **Route**: `GET /api/admin/drivers`
- **Header**: `Authorization: Bearer <admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "drivers": [ /* array of driver profiles */ ]
}
```

#### 6. Database Health & Cluster Status
- **Route**: `GET /api/admin/system-status`
- **Header**: `Authorization: Bearer <admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "database": {
    "engine": "mongodb",
    "connected": true,
    "cluster": "cluster0.7pf5pvc.mongodb.net",
    "dbName": "onewaytaxibihar",
    "latencyMs": 2
  }
}
```

---

## 6. High-Performance Database Service Architecture

```
                       ┌────────────────────────┐
                       │  Incoming API Request  │
                       │   (Passenger/Admin)    │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │  In-Memory L1 Cache    │  < 1ms response
                       │  (Sync Array Buffers)  │
                       └───────────┬────────────┘
                                   │
                                   ▼
                   ┌────────────────────────────────┐
                   │  MongoDB Atlas Pool Engine     │  2-15ms write-through
                   │  - maxPoolSize: 50             │
                   │  - Compound Indexing           │
                   │  - 3s Background Revalidation  │
                   └────────────────────────────────┘
```

### Essential Database Indexes
```javascript
// Bookings
db.collection('bookings').createIndex({ bookingId: 1 }, { unique: true });
db.collection('bookings').createIndex({ createdAt: -1 });
db.collection('bookings').createIndex({ passengerPhone: 1, bookingStatus: 1 });

// Leads
db.collection('leads').createIndex({ cleanPhone: 1, createdAt: -1 });
db.collection('leads').createIndex({ status: 1 });

// Drivers
db.collection('drivers').createIndex({ phone: 1 }, { unique: true });
db.collection('drivers').createIndex({ status: 1, city: 1 });
```

---

## 7. Deployment Configuration (`vercel.json`)
```json
{
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false,
  "functions": {
    "api/index.js": {
      "includeFiles": "data/**",
      "maxDuration": 15
    }
  },
  "rewrites": [
    { "source": "/api", "destination": "/api/index.js" },
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/admin", "destination": "/admin.html" },
    { "source": "/driver", "destination": "/driver.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

---

## 8. Environment Variables Specification (`.env`)
```ini
# Server Port
PORT=8080

# Production MongoDB Atlas URI
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.7pf5pvc.mongodb.net/onewaytaxibihar?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=onewaytaxibihar

# Central Dispatch Helplines
CENTRAL_HELPLINE=+918002141816
WHATSAPP_DISPATCH_PHONE=+917281851011
OWNER_ALERT_PHONE=+916206494214

# Admin Authentication
ADMIN_USER=admin
ADMIN_PASS=admin123
JWT_SECRET=otb_super_secret_production_key_2026

# Optional Telecom / Payment Credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
FAST2SMS_API_KEY=xxxxxxxxxxxxxxxx
```

---
*Generated for OneWayTaxiBihar Mobility Architecture. Ready for full autonomous implementation by any AI Agent or Backend Engineer.*

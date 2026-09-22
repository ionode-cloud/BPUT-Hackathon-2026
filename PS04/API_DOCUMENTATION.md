# 📡 Sustainable Facility Intelligence — API Documentation

> **Base URL:** `http://localhost:5000`
> **Version:** 1.0.0
> **Database:** MongoDB Atlas (`PS04`)
> **Content-Type:** `application/json`

---

## Table of Contents

- [Overview](#overview)
- [Endpoint Summary](#endpoint-summary)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
  - [GET /api/data](#1-get-apidata--latest-snapshot)
  - [GET /api/data?all=true](#2-get-apidataall--all-records)
  - [GET /api/data/:id](#3-get-apidataid--single-record)
  - [POST /api/data](#4-post-apidata--create-snapshot)
  - [PUT /api/data/:id](#5-put-apidataid--update-snapshot)
  - [DELETE /api/data/:id](#6-delete-apidataid--delete-one)
  - [DELETE /api/data](#7-delete-apidata--delete-all)
- [Field Reference](#field-reference)
- [Error Responses](#error-responses)
- [Example Payloads](#example-payloads)

---

## Overview

The API exposes a **single endpoint** — `/api/data` — that manages sensor snapshots for the Sustainable Facility Intelligence platform. Each snapshot document holds **all** sensor readings from every domain (air quality, energy, water, waste, traffic, assets, safety, and AI forecasts) at a given point in time.

```
POST   /api/data          Create new sensor snapshot
GET    /api/data          Fetch latest snapshot
GET    /api/data?all=true Fetch all snapshots
GET    /api/data/:id      Fetch snapshot by ID
PUT    /api/data/:id      Update snapshot by ID
DELETE /api/data/:id      Delete snapshot by ID
DELETE /api/data          Delete ALL snapshots
```

---

## Endpoint Summary

| Method | URL | Description | Status Codes |
|--------|-----|-------------|--------------|
| `GET` | `/api/data` | Latest sensor snapshot | 200, 404 |
| `GET` | `/api/data?all=true` | All snapshots (newest first) | 200 |
| `GET` | `/api/data?all=true&limit=N` | Last N snapshots | 200 |
| `GET` | `/api/data/:id` | Single snapshot by MongoDB `_id` | 200, 404 |
| `POST` | `/api/data` | Create new snapshot (auto-inherits previous metrics) | 201, 400 |
| `PUT` | `/api/data` | Update latest snapshot directly (ideal for Postman) | 200, 201, 400 |
| `PUT` | `/api/data/:id` | Partially update a snapshot by MongoDB `_id` | 200, 400, 404 |
| `DELETE` | `/api/data/:id` | Delete one snapshot | 200, 404 |
| `DELETE` | `/api/data` | Delete all snapshots | 200 |

---

## Data Model

Each document in the `sensordatas` MongoDB collection contains the following fields:

### Identifiers & Metadata

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `ObjectId` | Auto-generated MongoDB ID |
| `timestamp` | `Date` | Reading timestamp (defaults to `Date.now`) |
| `source` | `String` | Data origin: `"sensor"` \| `"manual"` \| `"synthetic"` |
| `location` | `String` | Facility zone tag (e.g. `"BPUT Campus"`) |
| `notes` | `String` | Free-text remarks |
| `createdAt` | `Date` | Auto-managed by Mongoose |
| `updatedAt` | `Date` | Auto-managed by Mongoose |

### Sensor Fields by Domain

#### 🏢 Overview
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `sustainabilityScore` | `Number` | 0–100 | Overall facility sustainability score |

#### 🌫️ Air Quality
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `aqi` | `Number` | — | Air Quality Index |
| `pm25` | `Number` | µg/m³ | Fine particulate matter (PM2.5) |
| `pm10` | `Number` | µg/m³ | Coarse particulate matter (PM10) |
| `co2` | `Number` | ppm | Carbon dioxide concentration |
| `smoke` | `Number` | ppm | Smoke / MQ-2 sensor reading |
| `nh3` | `Number` | ppm | Ammonia vapor concentration (MQ-137) |
| `voc` | `Number` | ppm | Volatile organic compounds (MiCS-6814 / TVOC) |

#### 🌦️ Weather & Environment
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `rainfall` | `Number` | mm | Rainfall accumulation |
| `windSpeed` | `Number` | km/h | Anemometer reading |
| `windDirection` | `String` | — | Compass direction (e.g. `"NE"`, `"SW"`) |
| `lightIntensity` | `Number` | lux | Ambient light sensor (LDR / BH1750) |

#### ⚡ Energy
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `livePower` | `Number` | kW | Real-time power draw |
| `todaysEnergy` | `Number` | kWh | Cumulative energy today |
| `peakDemand` | `Number` | kW | Peak power demand today |
| `estimatedCost` | `Number` | ₹ | Estimated electricity cost today |

#### 💧 Water
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `tankLevel` | `Number` | % | Water tank fill level |
| `todaysUsage` | `Number` | Litres | Cumulative water usage today |
| `flowRate` | `Number` | L/min | Real-time flow rate |
| `leakStatus` | `String` | — | `"Normal"` \| `"Leak Detected"` |

#### 🗑️ Waste
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `totalBins` | `Number` | — | Total monitored bins |
| `averageFill` | `Number` | % | Average bin fill level |
| `wasteCollected` | `Number` | kg | Total waste collected today |
| `overflowRisk` | `Number` | — | Count of bins at overflow risk |

#### 🚗 Traffic & Parking
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `parkingOccupancy` | `Number` | % | Overall parking lot occupancy |
| `occupiedSlots` | `Number` | — | Number of occupied parking slots |
| `totalSlots` | `Number` | — | Total parking capacity |
| `vehiclesToday` | `Number` | — | Total vehicles entered today |
| `avgWaitingTime` | `Number` | minutes | Average vehicle queue waiting time |

#### 🏭 Asset Utilization
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `totalEquipment` | `Number` | — | Total tracked equipment units |
| `activeEquipment` | `Number` | — | Currently active units |
| `utilization` | `Number` | % | Overall asset utilization rate |
| `maintenanceDue` | `Number` | — | Equipment units due for maintenance |

#### 🚨 Safety
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `safetyScore` | `Number` | 0–100 | Facility safety score |
| `incidentsToday` | `Number` | — | Total incidents logged today |
| `openIncidents` | `Number` | — | Unresolved incidents |
| `avgResponse` | `Number` | minutes | Average incident response time |

#### 🤖 AI Forecasts
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `energyForecast` | `Number` | kWh | Predicted energy consumption (next 24 h) |
| `waterForecast` | `Number` | Litres | Predicted water usage (next day) |
| `overflowPrediction` | `Number` | hours | Hours until next bin overflow |

---

## API Endpoints

---

### 1. `GET /api/data` — Latest Snapshot

Returns the **most recent** sensor snapshot.

**Request**
```http
GET /api/data
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "_id": "6aae885b6040b5ddf2500477",
    "sustainabilityScore": 79,
    "timestamp": "2026-09-19T13:04:26.826Z",
    "aqi": 72,
    "pm25": 31,
    "pm10": 58,
    "co2": 620,
    "smoke": 48,
    "nh3": 12.4,
    "voc": 0.35,
    "rainfall": 3.2,
    "windSpeed": 14,
    "windDirection": "NE",
    "lightIntensity": 74200,
    "livePower": 4.2,
    "todaysEnergy": 125,
    "peakDemand": 8.6,
    "estimatedCost": 1125,
    "tankLevel": 72,
    "todaysUsage": 2450,
    "flowRate": 12.4,
    "leakStatus": "Normal",
    "totalBins": 25,
    "averageFill": 62,
    "wasteCollected": 145,
    "overflowRisk": 2,
    "parkingOccupancy": 68,
    "occupiedSlots": 68,
    "totalSlots": 100,
    "vehiclesToday": 463,
    "avgWaitingTime": 4,
    "totalEquipment": 50,
    "activeEquipment": 38,
    "utilization": 76,
    "maintenanceDue": 4,
    "safetyScore": 88,
    "incidentsToday": 3,
    "openIncidents": 2,
    "avgResponse": 6,
    "energyForecast": 138,
    "waterForecast": 2610,
    "overflowPrediction": 5,
    "source": "synthetic",
    "location": "BPUT Campus",
    "notes": "Seeded demo snapshot",
    "createdAt": "2026-09-19T13:04:27.408Z",
    "updatedAt": "2026-09-19T13:04:27.408Z"
  }
}
```

**Response `404 Not Found`** — No data in the database yet.
```json
{
  "success": false,
  "message": "No sensor data found."
}
```

---

### 2. `GET /api/data?all` — All Records

Returns **all** snapshots sorted by `timestamp` descending (newest first).

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `all` | `boolean` | — | Set to `true` to return all records |
| `limit` | `number` | `0` (unlimited) | Max number of records to return |

**Request**
```http
GET /api/data?all=true
GET /api/data?all=true&limit=10
```

**Response `200 OK`**
```json
{
  "success": true,
  "count": 3,
  "data": [
    { "_id": "...", "timestamp": "2026-09-19T14:00:00Z", "aqi": 74, "..." : "..." },
    { "_id": "...", "timestamp": "2026-09-19T13:00:00Z", "aqi": 72, "..." : "..." },
    { "_id": "...", "timestamp": "2026-09-19T12:00:00Z", "aqi": 68, "..." : "..." }
  ]
}
```

---

### 3. `GET /api/data/:id` — Single Record

Fetch a single snapshot by its MongoDB `_id`.

**Request**
```http
GET /api/data/6aae885b6040b5ddf2500477
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": { "_id": "6aae885b6040b5ddf2500477", "..." : "..." }
}
```

**Response `404 Not Found`**
```json
{
  "success": false,
  "message": "Record not found."
}
```

---

### 4. `POST /api/data` — Create Snapshot

Creates a new sensor snapshot. **All fields are optional** — send only what your sensors report.

**Request**
```http
POST /api/data
Content-Type: application/json
```

**Minimal Body** (air quality only)
```json
{
  "aqi": 85,
  "pm25": 42,
  "pm10": 71,
  "co2": 680,
  "smoke": 55,
  "nh3": 14.2,
  "voc": 0.42,
  "source": "sensor",
  "location": "Gate 2"
}
```

**Full Body** (all domains)
```json
{
  "timestamp": "2026-09-19T18:30:00.000Z",
  "sustainabilityScore": 79,

  "aqi": 72,
  "pm25": 31,
  "pm10": 58,
  "co2": 620,
  "smoke": 48,
  "nh3": 12.4,
  "voc": 0.35,

  "rainfall": 3.2,
  "windSpeed": 14,
  "windDirection": "NE",
  "lightIntensity": 74200,

  "livePower": 4.2,
  "todaysEnergy": 125,
  "peakDemand": 8.6,
  "estimatedCost": 1125,

  "tankLevel": 72,
  "todaysUsage": 2450,
  "flowRate": 12.4,
  "leakStatus": "Normal",

  "totalBins": 25,
  "averageFill": 62,
  "wasteCollected": 145,
  "overflowRisk": 2,

  "parkingOccupancy": 68,
  "occupiedSlots": 68,
  "totalSlots": 100,
  "vehiclesToday": 463,
  "avgWaitingTime": 4,

  "totalEquipment": 50,
  "activeEquipment": 38,
  "utilization": 76,
  "maintenanceDue": 4,

  "safetyScore": 88,
  "incidentsToday": 3,
  "openIncidents": 2,
  "avgResponse": 6,

  "energyForecast": 138,
  "waterForecast": 2610,
  "overflowPrediction": 5,

  "source": "sensor",
  "location": "BPUT Campus",
  "notes": "Hourly push from IoT gateway"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "message": "Sensor data created.",
  "data": {
    "_id": "6aae91f36040b5ddf2500490",
    "aqi": 85,
    "pm25": 42,
    "..." : "...",
    "createdAt": "2026-09-19T18:30:01.000Z",
    "updatedAt": "2026-09-19T18:30:01.000Z"
  }
}
```

**Response `400 Bad Request`** — Schema validation error.
```json
{
  "success": false,
  "message": "SensorData validation failed: aqi: Cast to Number failed..."
}
```

---

### 5. `PUT /api/data/:id` — Update Snapshot

Partially updates any fields of an existing snapshot. Only the fields provided in the body are changed; all others remain untouched.

**Request**
```http
PUT /api/data/6aae885b6040b5ddf2500477
Content-Type: application/json
```

**Body** (only changed fields needed)
```json
{
  "aqi": 90,
  "pm25": 48,
  "leakStatus": "Leak Detected",
  "openIncidents": 3
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Sensor data updated.",
  "data": {
    "_id": "6aae885b6040b5ddf2500477",
    "aqi": 90,
    "pm25": 48,
    "leakStatus": "Leak Detected",
    "openIncidents": 3,
    "..." : "...",
    "updatedAt": "2026-09-19T19:00:00.000Z"
  }
}
```

**Response `404 Not Found`**
```json
{
  "success": false,
  "message": "Record not found."
}
```

---

### 6. `DELETE /api/data/:id` — Delete One

Deletes a single snapshot by `_id` and returns the deleted document.

**Request**
```http
DELETE /api/data/6aae885b6040b5ddf2500477
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Sensor data deleted.",
  "data": {
    "_id": "6aae885b6040b5ddf2500477",
    "..." : "..."
  }
}
```

**Response `404 Not Found`**
```json
{
  "success": false,
  "message": "Record not found."
}
```

---

### 7. `DELETE /api/data` — Delete All or Clear Seed Data

> [!CAUTION]
> Without query parameters, this permanently removes **every** snapshot document from the database. Use with caution.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `seedOnly` | `boolean` | `false` | When `true`, deletes **only** synthetic demo/seed records (`source: 'synthetic'` or notes containing "seed"), preserving your real API sensor data. |

**Request**
```http
DELETE /api/data?seedOnly=true
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Deleted 3 seed record(s).",
  "deletedCount": 3
}
```

---

## Error Responses

All error responses follow a consistent shape:

```json
{
  "success": false,
  "message": "<human-readable error description>"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / validation error |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Example Payloads

### cURL Examples

**GET latest snapshot**
```bash
curl http://localhost:5000/api/data
```

**GET all records (last 5)**
```bash
curl "http://localhost:5000/api/data?all=true&limit=5"
```

**POST new sensor reading**
```bash
curl -X POST http://localhost:5000/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "aqi": 88,
    "pm25": 45,
    "pm10": 65,
    "todaysEnergy": 130,
    "tankLevel": 68,
    "source": "sensor",
    "location": "Gate 2"
  }'
```

**PUT update a record**
```bash
curl -X PUT http://localhost:5000/api/data/6aae885b6040b5ddf2500477 \
  -H "Content-Type: application/json" \
  -d '{ "aqi": 95, "safetyScore": 85 }'
```

**DELETE one record**
```bash
curl -X DELETE http://localhost:5000/api/data/6aae885b6040b5ddf2500477
```

### JavaScript (fetch) Examples

**GET latest**
```js
const res  = await fetch('http://localhost:5000/api/data');
const json = await res.json();
console.log(json.data.aqi); // 72
```

**POST new snapshot**
```js
const res = await fetch('http://localhost:5000/api/data', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    aqi: 88, pm25: 45, todaysEnergy: 130,
    source: 'sensor', location: 'Gate 2'
  }),
});
const json = await res.json();
console.log(json.data._id);
```

**PUT update**
```js
const id  = '6aae885b6040b5ddf2500477';
const res = await fetch(`http://localhost:5000/api/data/${id}`, {
  method:  'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ aqi: 95, openIncidents: 3 }),
});
```

**DELETE one**
```js
const id  = '6aae885b6040b5ddf2500477';
await fetch(`http://localhost:5000/api/data/${id}`, { method: 'DELETE' });
```

---

## Running the Server

```bash
# Install dependencies
cd backend
npm install

# Start (production)
npm start

# Start (development with auto-reload via nodemon)
npm run dev

# Seed demo data (run once)
node seed.js
```

**Environment Variables** (`.env`)

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://ionodecloud_db_user:***@ionode.ckcssnb.mongodb.net/PS04` |
| `PORT` | `5000` |

---

*Generated for BPUT Hackathon 2026 — PS04 Sustainable Facility Intelligence Platform*

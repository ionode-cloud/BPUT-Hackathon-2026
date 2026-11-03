# 📡 Facility AI — API Request & Ingestion Examples

This guide provides copy-pasteable request examples for **`GET`**, **`PUT`**, **`POST`**, and **`DELETE`** endpoints against the Sustainable Facility Intelligence backend (`http://localhost:5011/api/data`).

---

## 📑 Table of Contents
1. [Endpoint Overview](#-endpoint-overview)
2. [Postman Guide: Send, Update & Verify Data](#-postman-guide-send-update--verify-data)
3. [PUT — Update Latest Telemetry & Dynamic Objects](#1-put--update-latest-snapshot)
4. [POST — Create a New Snapshot Record](#2-post--create-new-sensor-snapshot)
5. [GET — Read Live & Historical Telemetry](#3-get--read-telemetry)
6. [DELETE — Remove Data](#4-delete--remove-records)
7. [Python & JavaScript Integration Snippets](#5-code-integration-examples)
8. [Schema Field Reference](#6-schema-field-reference)

---

## 🌐 Endpoint Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **`GET`** | `/api/data` | Returns latest consolidated telemetry snapshot. |
| **`GET`** | `/api/data?all=true&limit=20` | Returns array of recent historical records (newest first). |
| **`GET`** | `/api/data/:id` | Returns single record by MongoDB `_id`. |
| **`PUT`** | `/api/data` | Updates latest snapshot with fresh timestamp. Unsent fields are preserved. |
| **`PUT`** | `/api/data/:id` | Updates specific snapshot by MongoDB `_id`. |
| **`POST`** | `/api/data` | Inserts a brand new snapshot document into MongoDB. |
| **`DELETE`** | `/api/data/:id` | Deletes a single snapshot by `_id`. |
| **`DELETE`** | `/api/data?seedOnly=true` | Cleans up only synthetic/seed demo records. |
| **`DELETE`** | `/api/data` | Clears all records in the collection. |

---

## 📮 Postman Guide: Send, Update & Verify Data

### Step 0: Common Postman Body Setup
Before sending or updating data in Postman:
1. Open Postman and create a **New Request** (`+` button).
2. Click the **Body** tab (located right below the URL input bar).
3. Select the **`raw`** radio button.
4. On the far right of the radio buttons, click the dropdown (default is usually `Text`) and select **`JSON`**.
   *(Postman automatically sets `Content-Type: application/json` in the background).*

---

### Step 1: Update Live Data (`PUT`)
Use **`PUT`** to modify the live snapshot (e.g. inject `aiForecasting`, update `priorityEngine`, or flip valve switches). Unsent fields are automatically preserved!

1. Change method dropdown to **`PUT`**.
2. URL:
   ```text
   http://localhost:5011/api/data
   ```
3. In **Body** ➔ **raw** ➔ **JSON**, paste:
   ```json
   {
     "livePower": 24.5,
     "tankLevel": 88,
     "valve1": true,
     "aiForecasting": {
       "model": "Neural Load Forecaster",
       "peakWindow": "14:00 - 16:30",
       "expectedDemandKwh": 165.4,
       "confidence": "96%"
     },
     "priorityEngine": {
       "directive": "Switch to BESS Battery Infeed",
       "priorityRank": 1,
       "status": "active"
     }
   }
   ```
4. Click the blue **Send** button.
5. **Expected Status**: `200 OK`
   ```json
   {
     "success": true,
     "message": "Sensor data updated.",
     "data": { ... }
   }
   ```

---

### Step 2: Send New Snapshot (`POST`)
Use **`POST`** when you want to insert a brand new timestamped sensor reading.

1. Change method dropdown to **`POST`**.
2. URL:
   ```text
   http://localhost:5011/api/data
   ```
3. In **Body** ➔ **raw** ➔ **JSON**, paste:
   ```json
   {
     "aqi": 45,
     "pm25": 12.4,
     "co2": 410,
     "livePower": 18.2,
     "todaysEnergy": 52.8,
     "tankLevel": 74,
     "valve1": false,
     "source": "sensor",
     "location": "Science Block 3",
     "aiForecasting": {
       "prediction": "Rain expected in 2 hours",
       "riskLevel": "Low"
     },
     "priorityEngine": {
       "status": "All Systems Normal"
     }
   }
   ```
4. Click the blue **Send** button.
5. **Expected Status**: `201 Created`
   ```json
   {
     "success": true,
     "message": "Sensor data created.",
     "data": { ... }
   }
   ```

---

### Step 3: Verify Updated Data (`GET`)
1. Create another tab in Postman.
2. Method: **`GET`**.
3. URL: `http://localhost:5011/api/data`.
4. Click **Send**.
5. You will immediately see your newly updated `aiForecasting`, `priorityEngine`, and telemetry numbers in the response JSON!

---

## 1. PUT — Update Latest Snapshot

Use `PUT` to update the active live facility snapshot (e.g. from operator clicks, valve actuation, or AI background models updating `aiForecasting` and `priorityEngine`).

> **Smart Merging**: Any field you do not provide in the payload remains untouched in MongoDB.

### HTTP / Postman
- **URL**: `http://localhost:5011/api/data`
- **Method**: `PUT`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Raw JSON Body**:
```json
{
  "aqi": 52,
  "livePower": 24.6,
  "tankLevel": 85,
  "valve1": true,
  "aiForecasting": {
    "model": "Prophet + LSTM Ensemble",
    "horizon": "24h",
    "expectedDemandKwh": 164.2,
    "confidenceScore": 96.8,
    "peakWindow": "13:30 - 16:00",
    "solarGenerationPeak": "18.4 kW at 12:30",
    "advisory": "Pre-cool lab facilities prior to peak tariff window at 14:00"
  },
  "priorityEngine": {
    "triageLevel": "Level 2 Operational Optimization",
    "currentPriorityRank": 1,
    "activeDirective": "Shift water reservoir pump cycle to 21:00 low-tariff slot",
    "targetActuator": "Main Inlet Valve 1",
    "slaMins": 15,
    "status": "active"
  }
}
```

### cURL (Bash / Linux / macOS)
```bash
curl -X PUT http://localhost:5011/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "valve1": true,
    "aiForecasting": {
      "model": "LSTM Ensemble",
      "expectedDemandKwh": 164.2
    },
    "priorityEngine": {
      "directive": "Shift pump cycle",
      "priority": "HIGH"
    }
  }'
```

### PowerShell (Windows)
```powershell
$body = @{
  valve1 = $true
  aiForecasting = @{
    model = "LSTM Ensemble"
    expectedDemandKwh = 164.2
  }
  priorityEngine = @{
    directive = "Shift pump cycle"
    priority = "HIGH"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:5011/api/data" -Method Put -ContentType "application/json" -Body $body
```

---

## 2. POST — Create New Sensor Snapshot

Use `POST` when IoT gateways, physical microcontrollers (ESP32, Arduino, Raspberry Pi), or periodic sensors log a new reading.

> **Field Inheritance**: If a sensor node posts only a subset of fields (e.g. only temperature or water flow), missing fields automatically inherit the previous reading so different telemetry channels never blank each other out.

### HTTP / Postman
- **URL**: `http://localhost:5011/api/data`
- **Method**: `POST`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Raw JSON Body**:
```json
{
  "aqi": 48,
  "pm25": 14.2,
  "pm10": 22.8,
  "co2": 420,
  "smoke": 0.1,
  "nh3": 1.2,
  "voc": 0.05,
  "rainfall": 0,
  "windSpeed": 5.4,
  "windDirection": "NE",
  "lightIntensity": 65000,
  "livePower": 19.5,
  "todaysEnergy": 45.2,
  "peakDemand": 32.1,
  "estimatedCost": 384.2,
  "tankLevel": 78,
  "todaysUsage": 1250,
  "flowRate": 12.5,
  "leakStatus": "Normal",
  "valve1": false,
  "valve2": false,
  "totalBins": 12,
  "averageFill": 42,
  "wasteCollected": 110,
  "overflowRisk": 0,
  "parkingOccupancy": 55,
  "occupiedSlots": 55,
  "totalSlots": 100,
  "vehiclesToday": 320,
  "avgWaitingTime": 3,
  "safetyScore": 92,
  "incidentsToday": 0,
  "openIncidents": 0,
  "avgResponse": 5,
  "location": "Central Campus",
  "source": "sensor",
  "aiForecasting": {
    "predictedKwh": 145,
    "rainProbability": 10
  },
  "priorityEngine": {
    "status": "All Clear",
    "queueLength": 0
  }
}
```

### cURL (Bash / Linux / macOS)
```bash
curl -X POST http://localhost:5011/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "aqi": 48,
    "pm25": 14.2,
    "livePower": 19.5,
    "tankLevel": 78,
    "source": "sensor"
  }'
```

---

## 3. GET — Read Telemetry

### A. Get Latest Consolidated Snapshot
```bash
curl http://localhost:5011/api/data
```
**Sample Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6ac7446cc28bf6c9702f9a1c",
    "sustainabilityScore": 79,
    "timestamp": "2026-11-03T07:15:30.000Z",
    "aqi": 66,
    "pm25": 8.1,
    "livePower": 19.5,
    "todaysEnergy": 45.2,
    "tankLevel": 78,
    "valve1": false,
    "valve2": false,
    "aiForecasting": {},
    "priorityEngine": {}
  }
}
```

### B. Get Historical Array of Snapshots
```bash
curl "http://localhost:5011/api/data?all=true&limit=20"
```

### C. Get Snapshot by Mongo ID
```bash
curl http://localhost:5011/api/data/6ac7446cc28bf6c9702f9a1c
```

---

## 4. DELETE — Remove Records

### A. Delete a Single Record by ID
```bash
curl -X DELETE http://localhost:5011/api/data/6ac7446cc28bf6c9702f9a1c
```

### B. Delete Only Synthetic / Seed Records (Safe for Real Hardware Data)
```bash
curl -X DELETE "http://localhost:5011/api/data?seedOnly=true"
```

### C. Delete All Records (Factory Reset Collection)
```bash
curl -X DELETE http://localhost:5011/api/data
```

---

## 5. Code Integration Examples

### JavaScript / Node.js (`fetch`)
```javascript
const API_URL = 'http://localhost:5011/api/data';

// 1. PUT Custom Data
async function updateTelemetry() {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      livePower: 22.8,
      aiForecasting: {
        model: 'LSTM Horizon 24',
        predictedKwh: 158.4,
        confidence: '95%'
      },
      priorityEngine: {
        currentRank: 1,
        directive: 'Activate backup solar feed'
      }
    })
  });
  const result = await response.json();
  console.log('PUT Result:', result);
}

// 2. GET Latest Data
async function readTelemetry() {
  const response = await fetch(API_URL);
  const json = await response.json();
  console.log('Live Data:', json.data);
  console.log('AI Forecasting:', json.data.aiForecasting);
  console.log('Priority Engine:', json.data.priorityEngine);
}
```

### Python (`requests`)
```python
import requests

API_URL = "http://localhost:5011/api/data"

# 1. PUT Custom Data
payload = {
    "valve1": True,
    "aiForecasting": {
        "model": "XGBoost + Prophet",
        "predictedHourlyPeak": 18.4,
        "anomaliesDetected": 0
    },
    "priorityEngine": {
        "status": "Active Triage",
        "primaryTarget": "Solenoid Valve 1"
    }
}

response = requests.put(API_URL, json=payload)
print("PUT Response:", response.json())

# 2. GET Live Snapshot
get_response = requests.get(API_URL)
data = get_response.json()["data"]
print("Live Forecast:", data.get("aiForecasting"))
print("Priority Engine:", data.get("priorityEngine"))
```

---

## 6. Schema Field Reference

| Key | Type | Description |
| :--- | :--- | :--- |
| `aiForecasting` | `Object` / `Mixed` | Free-form dynamic AI forecast payload. |
| `priorityEngine` | `Object` / `Mixed` | Free-form autonomous dispatch & triage matrix payload. |
| `aqi` | `Number` | Air Quality Index (0 - 500). |
| `pm25`, `pm10` | `Number` | Particulate matter (µg/m³). |
| `co2`, `smoke`, `nh3`, `voc` | `Number` | Gas sensors (ppm). |
| `livePower` | `Number` | Real-time wattage draw (kW). |
| `todaysEnergy` | `Number` | Daily cumulative energy (kWh). |
| `peakDemand` | `Number` | Recorded peak intraday demand (kW). |
| `estimatedCost` | `Number` | Computed electricity bill tariff (₹). |
| `tankLevel` | `Number` | Reservoir water tank level (%). |
| `flowRate` | `Number` | Flow meter telemetry (L/min). |
| `todaysUsage` | `Number` | Daily cumulative water consumed (L). |
| `leakStatus` | `String` | `"Normal"` or `"Leak Detected"`. |
| `valve1`, `valve2` | `Boolean` | Solenoid actuator states (`true` = OPEN, `false` = CLOSED). |
| `averageFill` | `Number` | Waste bin fill level (%). |
| `overflowRisk` | `Number` | Count of bins approaching 90%+ volume. |
| `parkingOccupancy` | `Number` | Parking lot capacity utilization (%). |
| `safetyScore` | `Number` | Safety & incident readiness index (0 - 100). |
| `source` | `String` | Origin of snapshot (`"sensor"`, `"manual"`, `"synthetic"`). |
| `location` | `String` | Facility zone identifier tag (e.g. `"Campus North"`). |


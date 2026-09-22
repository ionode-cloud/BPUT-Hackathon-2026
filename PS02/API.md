# Heatwaves & Edge AI - REST API Documentation

**BPUT Hackathon 2026 - Problem Statement PS02**  
Local Heat Stress Monitoring & Edge AI Response System  
Hardware: Arduino UNO Q (Qualcomm Dragonwing QRB2210 + STM32U585) + ESP32-WROOM-32D x2

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL and Headers](#base-url-and-headers)
3. [System Architecture](#system-architecture)
4. [Response Format](#response-format)
5. [Node Management - CRUD](#node-management---crud)
   - [GET /api/nodes](#get-apinodes)
   - [GET /api/nodes/:id](#get-apinodesid)
   - [POST /api/nodes](#post-apinodes)
   - [PUT /api/nodes/:id](#put-apinodesid)
   - [DELETE /api/nodes/:id](#delete-apinodesid)
6. [Sensor Readings](#sensor-readings)
   - [POST /api/readings](#post-apireadings)
   - [GET /api/readings](#get-apireadings)
   - [GET /api/readings/latest](#get-apireadingslatest)
   - [GET /api/readings/node/:nodeId](#get-apireadingsnodeid)
7. [Dashboard and Analytics](#dashboard-and-analytics)
8. [Alerts](#alerts)
9. [Heat Map](#heat-map)
10. [Error Codes](#error-codes)
11. [Postman Quick Reference](#postman-quick-reference)
12. [Sensor Field Reference](#sensor-field-reference)
13. [WBGT Risk Thresholds](#wbgt-risk-thresholds)

---

## Overview

| Property | Value |
|---|---|
| Protocol | HTTP/REST |
| Data Format | JSON |
| Authentication | None (Local Area Network) |
| Edge AI Engine | Qualcomm Dragonwing QRB2210 Linux on MASTER-01 |
| Actuation Controller | STM32U585 MCU (GPIO relay control) |
| Offline Resilience | Full offline mode - zero cloud dependency |

---

## Base URL and Headers

```
Base URL:     http://localhost:5000/api
Content-Type: application/json
Accept:       application/json
```

---

## System Architecture

```
+------------------------------------------------------------+
|              MASTER NODE - Arduino UNO Q                   |
|  Qualcomm Dragonwing QRB2210 Linux  (Edge AI Inference)    |
|  STM32U585 MCU  (Sensor Polling + Relay / Actuation GPIO)  |
|  Sensors: BME688 | DS18B20 | Anemometer | BH1750 | MLX90640|
|  Express.js API Server  |  MongoDB Database                |
+------------+----------------------------+------------------+
             |                            |
   +---------+----------+    +-----------+-----------+
   |      SLAVE-01      |    |       SLAVE-02        |
   |  ESP32-WROOM-32D   |    |   ESP32-WROOM-32D     |
   | Street Market Zone |    |  School Rooftop Zone  |
   | All 5 sensor types |    |  All 5 sensor types   |
   +--------------------+    +-----------------------+
   POST /api/readings (raw telemetry -> Edge AI auto-computes WBGT / HeatIndex)
```

- **MASTER-01**: Arduino UNO Q running local Edge AI (QRB2210) + STM32U585 for sensing and relay control
- **SLAVE-01**: ESP32-WROOM-32D at Street Market Corridor
- **SLAVE-02**: ESP32-WROOM-32D at School Rooftop / Playground

---

## Response Format

Success envelope:
```json
{
  "success": true,
  "count": 3,
  "data": [ ... ]
}
```

Error response:
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

---

## System Health

### GET /api/health

Check if the API server and hardware are online.

**Request:** No body required.

**Response 200 OK:**
```json
{
  "status": "online",
  "system": "Heatwaves and Edge AI System",
  "hardware": "Arduino UNO Q (Qualcomm Dragonwing QRB2210 + STM32U585)",
  "offlineResilient": true,
  "timestamp": "2026-09-18T06:00:00.000Z"
}
```

---

## Node Management - CRUD

Base path: `/api/nodes`

---

### GET /api/nodes

List all registered hardware nodes with their latest sensor reading attached.

**Request:** No body.

**Response 200 OK:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64f3a1b2c3d4e5f6a7b8c9d0",
      "nodeId": "MASTER-01",
      "nodeName": "Arduino UNO Q Master Node",
      "nodeType": "master",
      "location": "Community Emergency Center and Room 102",
      "status": "online",
      "signalStrength": -48,
      "batteryLevel": 98,
      "hardwareSpecs": {
        "processor": "Qualcomm Dragonwing QRB2210 Linux + STM32U585",
        "firmwareVersion": "v2.4.1-edge-ai",
        "sensorCount": 6,
        "isOfflineResilient": true
      },
      "lastSeen": "2026-09-18T06:10:00.000Z",
      "latestReading": {
        "temperature": 36.8,
        "humidity": 54,
        "wbgt": 29.8,
        "heatIndex": 40.2,
        "riskLevel": "Moderate"
      }
    },
    {
      "nodeId": "SLAVE-01",
      "nodeName": "Street Market Corridor Node",
      "nodeType": "slave",
      "location": "Outdoor Street Vendor and Market Corridor",
      "status": "online",
      "hardwareSpecs": {
        "processor": "ESP32-WROOM-32D",
        "firmwareVersion": "v1.8.3-slave"
      },
      "latestReading": {
        "temperature": 42.4,
        "wbgt": 33.4,
        "riskLevel": "Dangerous"
      }
    },
    {
      "nodeId": "SLAVE-02",
      "nodeName": "School Rooftop Monitoring Node",
      "nodeType": "slave",
      "location": "Primary School Rooftop and Entry Pavilion",
      "status": "online",
      "latestReading": {
        "temperature": 41.6,
        "wbgt": 32.8,
        "riskLevel": "Dangerous"
      }
    }
  ]
}
```

---

### GET /api/nodes/:id

Get a single node by nodeId (case-insensitive).

**Path Parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| :id | String | YES | Node ID - case-insensitive (e.g. MASTER-01, slave-01) |

**Example:**
```
GET http://localhost:5000/api/nodes/SLAVE-01
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "nodeId": "SLAVE-01",
    "nodeName": "Street Market Corridor Node",
    "nodeType": "slave",
    "location": "Outdoor Street Vendor and Market Corridor",
    "status": "online",
    "signalStrength": -62,
    "batteryLevel": 91,
    "latestReading": {
      "temperature": 42.4,
      "humidity": 41,
      "voc": 142,
      "radiantHeat": 50.5,
      "windSpeed": 2.1,
      "lightIntensity": 70000,
      "surfaceTemperature": 52.4,
      "heatIndex": 47.1,
      "wbgt": 33.4,
      "riskLevel": "Dangerous"
    }
  }
}
```

**Response 404:**
```json
{ "success": false, "message": "Node not found" }
```

---

### POST /api/nodes

Register a new hardware node. `nodeId` must be unique.

**Request Body:**
```json
{
  "nodeId": "SLAVE-03",
  "nodeName": "School Entrance Gateway Node",
  "nodeType": "slave",
  "location": "Primary School Front Entrance - Block C",
  "signalStrength": -72,
  "batteryLevel": 95,
  "hardwareSpecs": {
    "processor": "ESP32-WROOM-32D",
    "firmwareVersion": "v1.8.3-slave",
    "sensorCount": 6,
    "isOfflineResilient": true
  }
}
```

**Body Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| nodeId | String | YES | - | Unique ID, auto-uppercased (e.g. SLAVE-03) |
| nodeName | String | YES | - | Human-readable node name |
| nodeType | String | no | "slave" | "master" or "slave" |
| location | String | no | "Site Node" | Physical deployment location |
| signalStrength | Number | no | -65 | RSSI in dBm |
| batteryLevel | Number | no | 100 | Percentage (0-100) |
| hardwareSpecs.processor | String | no | "Arduino UNO Q" | Processor description |
| hardwareSpecs.firmwareVersion | String | no | "v2.4.1-edge-ai" | Firmware version |
| hardwareSpecs.sensorCount | Number | no | 6 | Total sensor module count |
| hardwareSpecs.isOfflineResilient | Boolean | no | true | Offline capability |

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "_id": "64f3a1b2c3d4e5f6a7b8c9d5",
    "nodeId": "SLAVE-03",
    "nodeType": "slave",
    "status": "online",
    "createdAt": "2026-09-18T06:15:00.000Z"
  }
}
```

**Response 400 (duplicate nodeId):**
```json
{ "success": false, "message": "Node SLAVE-03 already exists" }
```

---

### PUT /api/nodes/:id

Update node properties or **push live sensor telemetry directly to the node**.
When sensor data (`temperature`, `humidity`, `radiantHeat`, `surfaceTemperature`, etc.) is provided:
- The Edge AI engine calculates **Heat Index**, **WBGT** (ISO 7243), and **Heat Risk Level**.
- A new `SensorReading` document is recorded in the database.
- Automated threshold checks evaluate whether an **Active Alert** is triggered.
- If threshold is exceeded (e.g. WBGT ≥ 31.0°C or Temp ≥ 40°C), an alert is generated and returned in the `alert` field, triggering the frontend emergency popup immediately.

**Path Parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| :id | String | YES | Node ID to update (e.g. `SLAVE-01`, `MASTER-01`) |

**Example 1: Ingest Sensor Telemetry (with Alert Evaluation)**
```http
PUT http://localhost:5005/api/nodes/SLAVE-01
Content-Type: application/json

{
  "temperature": 42.8,
  "humidity": 68,
  "radiantHeat": 48.5,
  "surfaceTemperature": 52.0,
  "voc": 120,
  "windSpeed": 1.2,
  "lightIntensity": 70000
}
```

**Response 200 OK (Telemetry + Alert Triggered):**
```json
{
  "success": true,
  "message": "Sensor data ingested. ALERT TRIGGERED: High WBGT (Critical)",
  "data": {
    "nodeId": "SLAVE-01",
    "status": "online",
    "lastSeen": "2026-09-19T11:16:25.992Z",
    "latestReading": {
      "nodeId": "SLAVE-01",
      "temperature": 42.8,
      "humidity": 68,
      "radiantHeat": 48.5,
      "surfaceTemperature": 52.0,
      "heatIndex": 84.2,
      "wbgt": 40.0,
      "riskLevel": "Dangerous"
    }
  },
  "alert": {
    "_id": "6aae6f09207581fd9f5fef61",
    "nodeId": "SLAVE-01",
    "alertType": "High WBGT",
    "value": "40°C",
    "severity": "Critical",
    "message": "Extreme heatwave emergency: WBGT reached 40°C at SLAVE-01. Mandatory work cessation enforced!",
    "status": "Active",
    "timestamp": "2026-09-19T11:16:25.936Z"
  }
}
```

**Example 2: Update Metadata Only**
```http
PUT http://localhost:5005/api/nodes/SLAVE-01
Content-Type: application/json

{
  "nodeName": "Street Market Corridor Node",
  "location": "Street Market Corridor - Zone B Extended",
  "latitude": 20.2985,
  "longitude": 85.8280,
  "status": "online",
  "batteryLevel": 92
}
```

**Allowed status values:** `"online"` | `"offline"` | `"warning"`

**Response 404:**
```json
{ "success": false, "message": "Node not found" }
```

---

### DELETE /api/nodes/:id

Permanently delete a node AND all its associated sensor readings.

> **WARNING:** This action is irreversible. All telemetry records for the node are also removed.

**Path Parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| :id | String | YES | Node ID to delete (e.g. SLAVE-03) |

**Example:**
```
DELETE http://localhost:5000/api/nodes/SLAVE-03
```

**Response 200 OK:**
```json
{
  "success": true,
  "message": "Node SLAVE-03 and associated telemetry deleted"
}
```

---

## Sensor Readings

Base path: `/api/readings`

> **IMPORTANT:** When a reading is submitted via POST, the Edge AI engine on the QRB2210 automatically computes `heatIndex`, `wbgt`, and `riskLevel`. Do NOT send these fields manually.

---

### POST /api/readings

Ingest a new sensor reading from any node (called by ESP32 slave boards or via Postman).

**Required fields:** `nodeId`, `temperature`, `humidity`

**Request Body:**
```json
{
  "nodeId": "SLAVE-01",
  "temperature": 42.6,
  "humidity": 40,
  "voc": 145,
  "radiantHeat": 50.1,
  "windSpeed": 2.4,
  "windDirection": 215,
  "lightIntensity": 68500,
  "surfaceTemperature": 52.8
}
```

**Body Field Reference:**

| Field | Type | Required | Default | Sensor | Description |
|---|---|---|---|---|---|
| nodeId | String | YES | - | - | Source node ID (auto-uppercased) |
| temperature | Number | YES | - | BME688 | Ambient air temperature in Celsius |
| humidity | Number | YES | - | BME688 | Relative humidity in percent |
| voc | Number | no | 80 | BME688 | VOC Index / IAQ (0-500) |
| radiantHeat | Number | no | temp+4.5 | DS18B20 Black Globe | Solar radiant heat in Celsius |
| windSpeed | Number | no | 1.5 | Anemometer | Wind speed in m/s |
| windDirection | Number | no | 120 | Wind Vane | Wind direction in degrees (0-360) |
| lightIntensity | Number | no | 45000 | BH1750 | Solar irradiance in lux |
| surfaceTemperature | Number | no | temp+6.0 | MLX90640 | Roof / surface IR temperature in Celsius |
| timestamp | ISO String | no | now | - | Override timestamp for historical ingestion |

**Auto-computed by Edge AI (QRB2210) - DO NOT SEND:**

| Field | Description |
|---|---|
| heatIndex | Rothfusz Heat Index equation (Celsius) |
| wbgt | Wet Bulb Globe Temperature - ISO 7933 (Celsius) |
| riskLevel | "Safe" / "Moderate" / "Dangerous" based on WBGT thresholds |

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "_id": "64f3a1b2c3d4e5f6a7b8c9e0",
    "nodeId": "SLAVE-01",
    "timestamp": "2026-09-18T06:20:00.000Z",
    "temperature": 42.6,
    "humidity": 40,
    "voc": 145,
    "radiantHeat": 50.1,
    "windSpeed": 2.4,
    "windDirection": 215,
    "lightIntensity": 68500,
    "surfaceTemperature": 52.8,
    "heatIndex": 47.3,
    "wbgt": 33.8,
    "riskLevel": "Dangerous"
  }
}
```

**Auto-generated Alerts based on WBGT:**

| WBGT | Auto Alert |
|---|---|
| >= 31.0 C | Critical - "High WBGT" - Work cessation recommended |
| 28.5 - 30.9 C | Warning - "Dangerous heat risk" - Active cooling triggered |
| < 28.5 C | No alert generated |

---

### GET /api/readings

List recent sensor readings across all or a specific node.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| nodeId | String | all nodes | Filter by node ID |
| limit | Number | 100 | Max readings to return |

**Examples:**
```
GET http://localhost:5000/api/readings
GET http://localhost:5000/api/readings?nodeId=SLAVE-01&limit=50
GET http://localhost:5000/api/readings?nodeId=MASTER-01&limit=24
```

---

### GET /api/readings/latest

Returns the most recent reading for each of the 3 nodes simultaneously.
Used by Dashboard and Live Monitoring pages.

**Example:**
```
GET http://localhost:5000/api/readings/latest
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "primary": {
      "nodeId": "MASTER-01",
      "temperature": 36.8,
      "humidity": 54,
      "wbgt": 29.8,
      "heatIndex": 40.2,
      "riskLevel": "Moderate"
    },
    "nodes": {
      "MASTER-01": { "temperature": 36.8, "humidity": 54, "wbgt": 29.8, "riskLevel": "Moderate" },
      "SLAVE-01":  { "temperature": 42.4, "humidity": 41, "wbgt": 33.4, "riskLevel": "Dangerous" },
      "SLAVE-02":  { "temperature": 41.6, "humidity": 43, "wbgt": 32.8, "riskLevel": "Dangerous" }
    }
  }
}
```

---

### GET /api/readings/node/:nodeId

Time-series history for a specific node, sorted chronologically (oldest to newest).
Used for Analytics and Heat Stress charts.

**Path Parameter:** `:nodeId` - Node ID (MASTER-01, SLAVE-01, SLAVE-02)

**Query Parameter:** `limit` (default 50) - number of data points to return

**Examples:**
```
GET http://localhost:5000/api/readings/node/MASTER-01
GET http://localhost:5000/api/readings/node/SLAVE-01?limit=24
```

**Response 200 OK:**
```json
{
  "success": true,
  "count": 24,
  "data": [
    {
      "nodeId": "MASTER-01",
      "timestamp": "2026-09-17T06:00:00.000Z",
      "temperature": 29.2,
      "humidity": 72,
      "wbgt": 22.1,
      "heatIndex": 29.8,
      "riskLevel": "Safe"
    }
  ]
}
```

---

## Dashboard and Analytics

Base path: `/api/dashboard`

---

### GET /api/dashboard/summary

Complete dashboard summary: live stats, hardware info, personalised risk by population group, autonomous relief action states, and Edge AI short-horizon predictions.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalNodes": 3,
      "onlineNodes": 3,
      "currentWbgt": 29.8,
      "heatRiskLevel": "Moderate",
      "currentTemperature": 36.8,
      "humidity": 54,
      "heatIndex": 40.2,
      "windSpeed": 0.8,
      "surfaceTemperature": 40.8,
      "activeAlerts": 4
    },
    "hardware": {
      "masterNode": "MASTER-01",
      "platform": "Arduino UNO Q",
      "processor": "Qualcomm Dragonwing QRB2210 Linux",
      "coprocessor": "STM32U585 Low-Power Controller",
      "offlineStatus": "Active and Resilient (Zero Cloud Dependence)"
    },
    "reliefActions": [
      { "action": "Industrial Fans",    "trigger": "WBGT >= 27 C", "status": "Active" },
      { "action": "Evaporative Cooler", "trigger": "WBGT >= 28 C", "status": "Active" },
      { "action": "Misting System",     "trigger": "Temp >= 40 C", "status": "Standby" },
      { "action": "Audible Siren",      "trigger": "WBGT >= 31 C", "status": "Standby" }
    ],
    "personalisedRisk": {
      "Labourer": {
        "riskLevel": "Dangerous",
        "wbgt": 31.4,
        "restBreakStatus": "Mandatory 30-min break every hour"
      },
      "Child": {
        "riskLevel": "Moderate",
        "wbgt": 29.2,
        "restBreakStatus": "Rest break recommended every 2 hours"
      },
      "Elderly": {
        "riskLevel": "Dangerous",
        "wbgt": 30.5,
        "restBreakStatus": "Indoor shelter mandatory"
      }
    },
    "prediction": {
      "forecasts": [
        { "horizon": "+15 min",  "predictedTemp": 37.2, "predictedWbgt": 30.1, "riskLevel": "Moderate" },
        { "horizon": "+30 min",  "predictedTemp": 37.8, "predictedWbgt": 30.6, "riskLevel": "Moderate" },
        { "horizon": "+1 hour",  "predictedTemp": 38.6, "predictedWbgt": 31.4, "riskLevel": "Dangerous" },
        { "horizon": "+2 hours", "predictedTemp": 39.5, "predictedWbgt": 32.2, "riskLevel": "Dangerous" }
      ]
    }
  }
}
```

---

### GET /api/dashboard/heat-stress

24-hour chronological time-series data for heat-stress chart rendering.

| Query Parameter | Default | Description |
|---|---|---|
| ?nodeId | MASTER-01 | Node to pull history for |
| ?limit | 24 | Number of data points |

**Example:**
```
GET http://localhost:5000/api/dashboard/heat-stress?nodeId=SLAVE-01&limit=24
```

---

### GET /api/dashboard/prediction

Short-horizon Edge AI heat forecast for +15min, +30min, +1hr, and +2hr.
Computed entirely on the Qualcomm Dragonwing QRB2210 - no cloud APIs used.

| Query Parameter | Default | Description |
|---|---|---|
| ?nodeId | MASTER-01 | Node to generate prediction for |

**Example:**
```
GET http://localhost:5000/api/dashboard/prediction?nodeId=MASTER-01
```

**Response 200 OK:**
```json
{
  "success": true,
  "nodeId": "MASTER-01",
  "data": {
    "engine": "Arduino UNO Q - Qualcomm QRB2210 Linux Local Inference",
    "model": "Autoregressive Thermal-Inertia Model v2.1",
    "executionMode": "Offline Edge Native (No Cloud API)",
    "current": {
      "temperature": 36.8,
      "wbgt": 29.8,
      "heatIndex": 40.2
    },
    "riskTrend": "Escalating Heat Stress",
    "forecasts": [
      { "horizon": "+15 min",  "predictedTemp": 37.2, "predictedWbgt": 30.1, "heatDelta": "+0.4 C" },
      { "horizon": "+30 min",  "predictedTemp": 37.8, "predictedWbgt": 30.6, "heatDelta": "+1.0 C" },
      { "horizon": "+1 hour",  "predictedTemp": 38.6, "predictedWbgt": 31.4, "heatDelta": "+1.8 C" },
      { "horizon": "+2 hours", "predictedTemp": 39.5, "predictedWbgt": 32.2, "heatDelta": "+2.7 C" }
    ]
  }
}
```

---

## Alerts

Base path: `/api/alerts`

---

### GET /api/alerts

List all system and heatwave alerts with optional filters.

| Query Parameter | Description |
|---|---|
| ?severity | Filter: Safe / Warning / Critical / Resolved |
| ?status | Filter: Active / Acknowledged / Resolved |
| ?nodeId | Filter by source node (e.g. SLAVE-01) |

**Examples:**
```
GET http://localhost:5000/api/alerts
GET http://localhost:5000/api/alerts?severity=Critical
GET http://localhost:5000/api/alerts?status=Active&nodeId=SLAVE-01
```

**Response 200 OK:**
```json
{
  "success": true,
  "counts": { "total": 6, "critical": 2, "warning": 3, "safe": 1, "resolved": 1 },
  "data": [
    {
      "_id": "64f3a1b2c3d4e5f6a7b8c9f0",
      "nodeId": "SLAVE-01",
      "alertType": "High WBGT",
      "value": "33.4 C",
      "severity": "Critical",
      "message": "Extreme heat stress: WBGT reached 33.4 C at SLAVE-01. Work cessation recommended.",
      "status": "Active",
      "timestamp": "2026-09-18T06:05:00.000Z"
    }
  ]
}
```

---

### POST /api/alerts

Manually create a heat emergency or system alert.

**Request Body:**
```json
{
  "nodeId": "SLAVE-01",
  "alertType": "High WBGT",
  "value": "33.8 C",
  "severity": "Critical",
  "message": "Mandatory work halt. WBGT exceeded 33 C threshold."
}
```

**Body Field Reference:**

| Field | Type | Required | Description |
|---|---|---|---|
| nodeId | String | YES | Source node ID |
| alertType | String | YES | See supported alert types below |
| value | String | no | Measured value that triggered alert (e.g. "33.8 C") |
| severity | String | YES | "Safe" or "Warning" or "Critical" or "Resolved" |
| message | String | YES | Human-readable alert description |

**Supported alertType values:**
```
High WBGT               High Heat Index         Extreme temperature
High radiant heat       High surface temperature High humidity
Low humidity            Dangerous heat risk      Node offline
Network outage          Power outage             Required rest break
Relief action triggered
```

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "_id": "64f3a1b2c3d4e5f6a7b8c9f1",
    "nodeId": "SLAVE-01",
    "alertType": "High WBGT",
    "value": "33.8 C",
    "severity": "Critical",
    "status": "Active",
    "timestamp": "2026-09-18T06:25:00.000Z"
  }
}
```

---

### PUT /api/alerts/:id

Acknowledge or resolve an existing alert.

**Path Parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| :id | String (ObjectId) | YES | MongoDB _id of the alert document |

**Example:**
```
PUT http://localhost:5000/api/alerts/64f3a1b2c3d4e5f6a7b8c9f0
```

**Request Body:**
```json
{
  "status": "Resolved"
}
```

**Allowed status values:** `"Active"` | `"Acknowledged"` | `"Resolved"`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "_id": "64f3a1b2c3d4e5f6a7b8c9f0",
    "alertType": "High WBGT",
    "severity": "Critical",
    "status": "Resolved"
  }
}
```

---

## Heat Map

### GET /api/heatmap

Spatial microclimate data for all sensor node locations - used to render the street-level urban heat island map.

**Request:** No body or parameters required.

**Example:**
```
GET http://localhost:5000/api/heatmap
```

**Response 200 OK:**
```json
{
  "success": true,
  "city": "Bhubaneswar Urban Heat Monitoring Grid",
  "summary": {
    "totalSensors": 3,
    "avgTemperature": "40.3 C",
    "avgWbgt": "32.0 C",
    "maxSurfaceHeat": "56.4 C",
    "activeHotSpots": 2
  },
  "points": [
    {
      "nodeId": "MASTER-01",
      "zoneName": "Central Community Hall and Relief Shelter",
      "zoneType": "Indoor / High Occupancy Refugium",
      "lat": 20.2961,
      "lng": 85.8245,
      "currentTemp": 36.8,
      "wbgt": 29.8,
      "surfaceTemperature": 40.2,
      "heatIndex": 40.2,
      "riskLevel": "Moderate",
      "thermalIntervention": "Active hydration stations and shaded rest mandatory"
    },
    {
      "nodeId": "SLAVE-01",
      "zoneName": "Street Market Vendor Corridor",
      "zoneType": "Outdoor High Exposure - Urban Heat Island",
      "lat": 20.2980,
      "lng": 85.8310,
      "currentTemp": 42.4,
      "wbgt": 33.4,
      "surfaceTemperature": 52.4,
      "heatIndex": 47.1,
      "riskLevel": "Dangerous",
      "thermalIntervention": "Work halt mandatory. Misting deployed. Emergency shade erected."
    },
    {
      "nodeId": "SLAVE-02",
      "zoneName": "School Rooftop and Playground",
      "zoneType": "Public Institution - Vulnerable Occupancy",
      "lat": 20.2935,
      "lng": 85.8198,
      "currentTemp": 41.6,
      "wbgt": 32.8,
      "surfaceTemperature": 57.2,
      "heatIndex": 46.0,
      "riskLevel": "Dangerous",
      "thermalIntervention": "School evacuated. Children moved to indoor cool zones."
    }
  ]
}
```

---

## Error Codes

| HTTP Status | Meaning | Typical Cause |
|---|---|---|
| 200 OK | Success | Request processed successfully |
| 201 Created | Resource created | POST succeeded |
| 400 Bad Request | Validation error | Missing required fields, duplicate nodeId |
| 404 Not Found | Resource missing | Node or alert ID does not exist |
| 500 Internal Server Error | Server fault | Database error, unexpected exception |

---

## Postman Quick Reference

**Prerequisites:** Backend running at `http://localhost:5000`. MongoDB running or in-memory fallback active.  
**Headers for all requests:** `Content-Type: application/json`

---

### POST Sensor Readings - All 3 Nodes

**MASTER-01 - Indoor Community Center (Moderate Heat):**
```
POST http://localhost:5000/api/readings
Content-Type: application/json

{
  "nodeId": "MASTER-01",
  "temperature": 36.5,
  "humidity": 56,
  "voc": 84,
  "radiantHeat": 39.2,
  "windSpeed": 0.8,
  "windDirection": 140,
  "lightIntensity": 3200,
  "surfaceTemperature": 40.8
}
```

**SLAVE-01 - Street Market (Heatwave Peak - Dangerous):**
```
POST http://localhost:5000/api/readings
Content-Type: application/json

{
  "nodeId": "SLAVE-01",
  "temperature": 43.2,
  "humidity": 38,
  "voc": 158,
  "radiantHeat": 51.4,
  "windSpeed": 1.9,
  "windDirection": 215,
  "lightIntensity": 74000,
  "surfaceTemperature": 54.6
}
```

**SLAVE-02 - School Rooftop (Extreme Surface Heat - Dangerous):**
```
POST http://localhost:5000/api/readings
Content-Type: application/json

{
  "nodeId": "SLAVE-02",
  "temperature": 41.8,
  "humidity": 42,
  "voc": 92,
  "radiantHeat": 50.8,
  "windSpeed": 3.2,
  "windDirection": 180,
  "lightIntensity": 81000,
  "surfaceTemperature": 57.2
}
```

---

### CRUD Node Operations

**Create a new slave node:**
```
POST http://localhost:5000/api/nodes
Content-Type: application/json

{
  "nodeId": "SLAVE-03",
  "nodeName": "Industrial Zone Monitoring Node",
  "nodeType": "slave",
  "location": "IDCO Industrial Estate - Gate 4"
}
```

**Update SLAVE-01 battery and status:**
```
PUT http://localhost:5000/api/nodes/SLAVE-01
Content-Type: application/json

{
  "status": "warning",
  "batteryLevel": 28,
  "signalStrength": -74
}
```

**Delete the test node:**
```
DELETE http://localhost:5000/api/nodes/SLAVE-03
```

---

### Alert Operations

**Trigger a Critical alert:**
```
POST http://localhost:5000/api/alerts
Content-Type: application/json

{
  "nodeId": "SLAVE-01",
  "alertType": "Required rest break",
  "value": "WBGT 34.1 C",
  "severity": "Critical",
  "message": "Mandatory work halt - WBGT exceeded 33 C. All outdoor workers must rest in shade immediately."
}
```

**Resolve an alert (replace ALERT_ID with actual _id from GET /alerts):**
```
PUT http://localhost:5000/api/alerts/ALERT_ID
Content-Type: application/json

{
  "status": "Resolved"
}
```

---

### Query Examples

```
# Get latest readings from all 3 nodes
GET http://localhost:5000/api/readings/latest

# Get last 24 readings from SLAVE-01
GET http://localhost:5000/api/readings/node/SLAVE-01?limit=24

# Get all active Critical alerts
GET http://localhost:5000/api/alerts?severity=Critical&status=Active

# Get full SLAVE-02 node details
GET http://localhost:5000/api/nodes/SLAVE-02

# Get Edge AI prediction for MASTER-01
GET http://localhost:5000/api/dashboard/prediction?nodeId=MASTER-01

# Get heat map spatial data
GET http://localhost:5000/api/heatmap

# Check system health
GET http://localhost:5000/api/health
```

---

## Sensor Field Reference

| Field | Unit | Sensor | Description |
|---|---|---|---|
| temperature | Celsius | BME688 | Ambient air temperature |
| humidity | %RH | BME688 | Relative humidity |
| voc | IAQ Index (0-500) | BME688 | Volatile Organic Compounds / Air Quality |
| radiantHeat | Celsius | DS18B20 (Black Globe) | Solar radiant heat load |
| windSpeed | m/s | Anemometer | Wind speed |
| windDirection | degrees (0-360) | Wind Vane | Wind direction (0 = North) |
| lightIntensity | lux | BH1750 | Solar irradiance / ambient light |
| surfaceTemperature | Celsius | MLX90640 (32x24 pixels) | Rooftop / surface IR temperature |
| heatIndex | Celsius | Edge AI - QRB2210 | Rothfusz Heat Index (auto-computed) |
| wbgt | Celsius | Edge AI - QRB2210 | Wet Bulb Globe Temperature ISO 7933 (auto-computed) |
| riskLevel | String | Edge AI - QRB2210 | Safe / Moderate / Dangerous (auto-computed) |

---

## WBGT Risk Thresholds

| WBGT | Risk Level | WHO / ISO Recommended Action |
|---|---|---|
| < 25 C | Safe | Normal activity permitted |
| 25 - 27.9 C | Moderate | Light precautions, hydrate regularly |
| 28 - 30.9 C | Dangerous | Reduce activity, mandatory rest breaks every hour |
| >= 31 C | Critical | Work cessation mandatory, evacuate all outdoor workers |

---

*BPUT Hackathon 2026 - PS02 Heatwaves and Edge AI*  
*Arduino UNO Q | Qualcomm Dragonwing QRB2210 | STM32U585 | ESP32-WROOM-32D*

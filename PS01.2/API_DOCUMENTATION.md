# AirSense IoT — API & Integration Documentation

**Base API URL:** `http://localhost:5000/api`  
**Socket.IO Server URL:** `http://localhost:5000`  
**Content-Type:** `application/json`  
**Version:** 3.0.0  

---

## Table of Contents

1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Real-Time Socket.IO Integration](#2-real-time-socketio-integration)
   - [Socket Connection](#socket-connection)
   - [Event Catalog](#event-catalog)
   - [Client-Side Integration Example](#client-side-integration-example)
3. [Node & Sensor Telemetry REST API (`/api/nodes`)](#3-node--sensor-telemetry-rest-api-apinodes)
   - [1. POST /api/nodes/:nodeId (Send Sensor Data via Postman)](#1-post-apinodesnodeid-send-sensor-data-via-postman)
   - [2. GET /api/nodes (List All Nodes)](#2-get-apinodes-list-all-nodes)
   - [3. GET /api/nodes/:nodeId (Get Node Details by ID)](#3-get-apinodesnodeid-get-node-details-by-id)
   - [4. PUT /api/nodes/:nodeId (Update Node Details)](#4-put-apinodesnodeid-update-node-details)
   - [5. DELETE /api/nodes/:nodeId (Delete Node & Associated Telemetry)](#5-delete-apinodesnodeid-delete-node--associated-telemetry)
   - [6. PUT /api/nodes/:nodeId/master (Set as Master Node)](#6-put-apinodesnodeidmaster-set-as-master-node)
   - [7. GET /api/nodes/master (Get Active Master Node)](#7-get-apinodesmaster-get-active-master-node)
   - [8. GET /api/nodes/latest (Get Latest Sensor Reading)](#8-get-apinodeslatest-get-latest-sensor-reading)
   - [9. GET /api/nodes/:nodeId/readings (Get Telemetry History for Node)](#9-get-apinodesnodeidreadings-get-telemetry-history-for-node)
   - [10. POST /api/nodes (Register New Node Manually)](#10-post-apinodes-register-new-node-manually)
4. [Dashboard & Historical Analytics API](#4-dashboard--historical-analytics-api)
   - [GET /api/dashboard/summary](#get-apidashboardsummary)
   - [GET /api/readings/history](#get-apireadingshistory)
   - [GET /api/health](#get-apihealth)
5. [Environmental Parameters & Threshold Reference Table](#5-environmental-parameters--threshold-reference-table)
6. [Dashboard Overview Metric Cards](#6-dashboard-overview-metric-cards)

---

## 1. Architecture & System Overview

AirSense IoT is a modern full-stack environmental monitoring solution:
- **Backend:** Express.js + Mongoose (MongoDB) + Socket.IO Server on port `5000`.
- **Frontend:** React + Vite + Recharts + Lucide Icons + Socket.IO Client on port `5173`.
- **Node-Centric Architecture (`/api/nodes`):** Telemetry is submitted and managed directly per node ID (`POST /api/nodes/:nodeId`).
- **Master Node Feeds:** Any node can be designated as the **Master Node**. The Overview Dashboard dynamically scopes all metrics and graphs to this master node.
- **Auto-Discovery:** Submitting telemetry for any new node ID automatically registers the node as `Node 1`, `Node 2`, `Node 3`, etc. The very first node created automatically becomes the Master Node.
- **Instant Synchronization:** Every ingested packet or state change is pushed across Socket.IO directly to connected clients in **real-time** with zero page reloads.

---

## 2. Real-Time Socket.IO Integration

### Socket Connection
- **URL:** `http://localhost:5000`
- **Supported Transports:** WebSocket, Polling
- **CORS Allowed Origins:** `http://localhost:5173` (or configured `CORS_ORIGIN`)

### Event Catalog

| Event Name | Direction | Trigger | Payload Description |
|---|---|---|---|
| `connect` | Client ← Server | Client connects to Socket.IO | Connection established |
| `disconnect` | Client ← Server | Client disconnects | Connection terminated |
| `new_reading` | Client ← Server | `POST /api/nodes/:nodeId` | Full flattened sensor reading object with `nodeId` |
| `update_reading` | Client ← Server | Telemetry record updated | Updated sensor reading object |
| `delete_reading` | Client ← Server | Reading deleted | `{ id: "<MongoDB_ID>" }` |
| `master_node_changed` | Client ← Server | `PUT /api/nodes/:nodeId/master` | Full updated master `Node` object |
| `node_created` | Client ← Server | Auto-discovery or `POST /api/nodes` | Newly registered `Node` object |
| `node_updated` | Client ← Server | `PUT /api/nodes/:nodeId` or signal | Updated `Node` object |
| `node_deleted` | Client ← Server | `DELETE /api/nodes/:nodeId` | `{ nodeId: "<string>", newMasterNodeId: "<string>" }` |

### Client-Side Integration Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected to real-time telemetry stream:', socket.id);
});

// Fired whenever data is sent via Postman to /api/nodes/:nodeId
socket.on('new_reading', (data) => {
  console.log('Real-time telemetry packet received:', data);
  // Update dashboard cards, charts, and table dynamically
});

socket.on('master_node_changed', (node) => {
  console.log('Master node switched to:', node.name, node.nodeId);
});
```

---

## 3. Node & Sensor Telemetry REST API (`/api/nodes`)

Use these endpoints to send sensor readings, view node metrics, designate the master node, update node metadata, and delete nodes.

---

### 1. `POST /api/nodes/:nodeId` (Send Sensor Data via Postman)

**Primary endpoint to send sensor telemetry from Postman or IoT hardware!**

- Automatically discovers and registers the node if it doesn't already exist (assigns `Node 1`, `Node 2`, etc.).
- If this is the first node created, it is automatically designated as the **Master Node**.
- Ingests the sensor reading into MongoDB.
- Broadcasts `new_reading` and `node_updated` / `node_created` over Socket.IO to update all dashboards in real-time.

**Request:**
```http
POST http://localhost:5000/api/nodes/NODE-01
Content-Type: application/json
```

**Request Body (Postman JSON):**
```json
{
  "temperature": 24.5,
  "humidity": 48.0,
  "co2": 650,
  "pm25": 11.2,
  "pm10": 34.0,
  "co": 1.5,
  "no2": 22.0,
  "so2": 12.0,
  "o3": 25.0,
  "voc": 42.0,
  "nh3": 5.2,
  "smoke": 18.0
}
```

> **Note:** All sensor parameters are optional and accept plain numbers. You can also send partial packets (e.g. just temperature and humidity).

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Telemetry ingested successfully for Node 1 (NODE-01)",
  "node": {
    "nodeId": "NODE-01",
    "name": "Node 1",
    "nodeNumber": 1,
    "isMaster": true,
    "status": "online",
    "lastSeen": "2026-09-17T09:00:00.000Z"
  },
  "data": {
    "_id": "6aab86b89f4467a846974ec1",
    "nodeId": "NODE-01",
    "timestamp": "2026-09-17T09:00:00.000Z",
    "temperature": 24.5,
    "humidity": 48.0,
    "co2": 650,
    "pm25": 11.2,
    "pm10": 34.0,
    "co": 1.5,
    "no2": 22.0,
    "so2": 12.0,
    "o3": 25.0,
    "voc": 42.0,
    "nh3": 5.2,
    "smoke": 18.0,
    "actiondevice": true
  }
}
```

> ⚡ **Action Device Automatic Evaluation (`actiondevice`):**
> Evaluates the 10 target air quality & safety sensors:
> - `co2` (safe ≤ 1000 ppm)
> - `pm25` (safe ≤ 12 µg/m³)
> - `pm10` (safe ≤ 54 µg/m³)
> - `co` (safe ≤ 4.4 ppm)
> - `no2` (safe ≤ 53 ppb)
> - `so2` (safe ≤ 35 ppb)
> - `o3` (safe ≤ 54 ppb)
> - `voc` (safe ≤ 200 ppb)
> - `nh3` (safe ≤ 25 ppm)
> - `smoke` (safe ≤ 200 raw)
> 
> - **`true` (`True`):** When **ALL** 10 monitored sensors are in the normal (safe) range.
> - **`false` (`False`):** When **ANY** of these 10 sensors exceed the normal threshold (show high).


---

### 2. `GET /api/nodes` (List All Nodes)

Returns all registered IoT nodes with their latest sensor reading snippet and total records count.

**Request:**
```http
GET http://localhost:5000/api/nodes
```

**Response `200 OK`:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6aab86b89f4467a846974ec1",
      "nodeId": "NODE-01",
      "name": "Node 1",
      "nodeNumber": 1,
      "isMaster": true,
      "status": "online",
      "location": "Main Lab Station",
      "lastSeen": "2026-09-17T09:00:00.000Z",
      "totalReadings": 15,
      "latestReading": {
        "temperature": 24.5,
        "humidity": 48.0,
        "co2": 650,
        "pm25": 11.2
      }
    },
    {
      "_id": "6aab86b89f4467a846974ec2",
      "nodeId": "NODE-02",
      "name": "Node 2",
      "nodeNumber": 2,
      "isMaster": false,
      "status": "online",
      "location": "Warehouse Zone B",
      "lastSeen": "2026-09-17T08:58:00.000Z",
      "totalReadings": 8,
      "latestReading": {
        "temperature": 26.2,
        "humidity": 52.0,
        "co2": 810,
        "pm25": 16.0
      }
    }
  ]
}
```

---

### 3. `GET /api/nodes/:nodeId` (Get Node Details by ID)

Returns a single node by its ID, including its complete status, metadata, total record count, and latest sensor reading.

**Request:**
```http
GET http://localhost:5000/api/nodes/NODE-01
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "_id": "6aab86b89f4467a846974ec1",
    "nodeId": "NODE-01",
    "name": "Node 1",
    "nodeNumber": 1,
    "isMaster": true,
    "status": "online",
    "location": "Main Lab Station",
    "lastSeen": "2026-09-17T09:00:00.000Z",
    "totalReadings": 15,
    "latestReading": { ... }
  }
}
```

---

### 4. `PUT /api/nodes/:nodeId` (Update Sensor Data & Node Details)

Update a node's live sensor readings (e.g. `temperature`, `humidity`, `co2`, `pm25`, `pm10`, `no2`, `so2`, `o3`, `co`, `voc`, `smoke`) AND/OR node metadata (`name`, `location`, `status`).

- If sensor fields are provided in the request body, the backend immediately updates the node's latest sensor reading document in MongoDB.
- Broadcasts `update_reading` and `new_reading` over Socket.IO so all open dashboard cards and charts update in real-time.
- **Important:** The node **must already exist**. `PUT` will **NOT** create a new node. If the node ID is not found, it returns `404 Not Found` (use `POST /api/nodes/:nodeId` or `POST /api/nodes` to create nodes).

**Request (Update Sensor Data via Postman):**
```http
PUT http://localhost:5000/api/nodes/NODE-01
Content-Type: application/json

{
  "temperature": 27.5,
  "humidity": 55.0,
  "co2": 850,
  "pm25": 14.2
}
```

**Request (Update Both Sensor Data and Node Name/Location):**
```http
PUT http://localhost:5000/api/nodes/NODE-01
Content-Type: application/json

{
  "name": "Node 1 - Clean Room",
  "location": "Building A, Floor 2",
  "temperature": 25.0,
  "co2": 720
}
```

**Response `200 OK` (when node exists):**
```json
{
  "success": true,
  "message": "Sensor telemetry updated successfully for Node Node 1 - Clean Room (NODE-01)",
  "node": {
    "nodeId": "NODE-01",
    "name": "Node 1 - Clean Room",
    "nodeNumber": 1,
    "isMaster": true,
    "status": "online",
    "location": "Building A, Floor 2",
    "lastSeen": "2026-09-17T09:39:42.000Z"
  },
  "data": {
    "_id": "6aabaf3d147e77ed90a13f83",
    "nodeId": "NODE-01",
    "timestamp": "2026-09-17T09:13:33.000Z",
    "co2": 850,
    "co2Unit": "ppm",
    "temperature": 27.5,
    "temperatureUnit": "°C",
    "humidity": 55.0,
    "humidityUnit": "%RH",
    "pm25": 14.2,
    "pm25Unit": "µg/m³",
    "updatedAt": "2026-09-17T09:39:43.000Z"
  }
}
```

**Response `404 Not Found` (when node does NOT exist — PUT never creates a node):**
```json
{
  "success": false,
  "message": "Node with ID 'NODE-999' does not exist. Cannot create a new node using PUT method. Please create the node first using POST /api/nodes or send initial data via POST /api/nodes/NODE-999."
}
```

---

### 5. `DELETE /api/nodes/:nodeId` (Delete Node & Associated Telemetry)

Deletes the node from the database and cascade-deletes all sensor readings associated with this node ID. Broadcasts `node_deleted` over Socket.IO.

**Request:**
```http
DELETE http://localhost:5000/api/nodes/NODE-02
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Node Node 2 (NODE-02) and 8 associated readings deleted successfully",
  "data": {
    "deletedNodeId": "NODE-02",
    "deletedReadingsCount": 8,
    "newMaster": "NODE-01"
  }
}
```

---

### 6. `PUT /api/nodes/:nodeId/master` (Set as Master Node)

Designates this node as the active **Master Node**. The Overview Dashboard automatically switches to streaming telemetry from this node. Broadcasts `master_node_changed` over Socket.IO.

**Request:**
```http
PUT http://localhost:5000/api/nodes/NODE-01/master
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Node 1 (NODE-01) is now set as Master Node",
  "data": {
    "nodeId": "NODE-01",
    "name": "Node 1",
    "isMaster": true
  }
}
```

---

### 7. `GET /api/nodes/master` (Get Active Master Node)

Returns the currently designated Master Node feeding the live dashboard.

**Request:**
```http
GET http://localhost:5000/api/nodes/master
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "nodeId": "NODE-01",
    "name": "Node 1",
    "nodeNumber": 1,
    "isMaster": true,
    "status": "online",
    "latestReading": { ... }
  }
}
```

---

### 8. `GET /api/nodes/latest` (Get Latest Sensor Reading)

Returns the most recent reading across the network or scoped to a specific node via query parameter `?nodeId=`.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `nodeId` | string | Optional. Filter latest reading to a specific node (e.g. `NODE-01`). |

**Request:**
```http
GET http://localhost:5000/api/nodes/latest?nodeId=NODE-01
```

---

### 9. `GET /api/nodes/:nodeId/readings` (Get Telemetry History for Node)

Retrieve paginated historical readings recorded specifically for this node.

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Maximum readings per page |
| `page` | integer | `1` | Page index |

**Request:**
```http
GET http://localhost:5000/api/nodes/NODE-01/readings?limit=20&page=1
```

---

### 10. `POST /api/nodes` (Register New Node Manually)

Optionally pre-register a node before sending telemetry.

**Request Body:**
```json
{
  "nodeId": "NODE-03",
  "name": "Node 3",
  "location": "Server Room"
}
```

---

## 4. Dashboard & Historical Analytics API

### `GET /api/dashboard/summary`

Aggregates overall air quality status, average ambient metrics, and database count. Supports optional `?nodeId=` to view metrics scoped to a specific node.

**Request:**
```http
GET http://localhost:5000/api/dashboard/summary?nodeId=NODE-01
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "totalReadings": 15,
    "totalSensors": 11,
    "avgTemperature": 24.5,
    "avgHumidity": 48.0,
    "overallAirQuality": "safe",
    "lastDataReceived": "2026-09-17T09:00:00.000Z",
    "latestReading": { ... },
    "updatedAt": "2026-09-17T09:00:05.000Z"
  }
}
```

---

### `GET /api/readings/history`

Provides time-series data for historical analytics charts.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `nodeId` | string | Optional filter for a specific node ID (e.g. `NODE-01`). |
| `from` | ISO Date String | Filter start time (e.g. `2026-09-16T00:00:00.000Z`) |
| `to` | ISO Date String | Filter end time |
| `sensorType` | string | Filter for a specific sensor (e.g. `co2`, `pm25`, `temperature`) |
| `limit` | integer | Max data points to return (default: `300`) |

**Request:**
```http
GET http://localhost:5000/api/readings/history?nodeId=NODE-01&limit=50
```

---

### `GET /api/health`

Verify backend status and MongoDB connectivity.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "AirSense IoT API is running",
  "timestamp": "2026-09-17T09:00:00.000Z",
  "environment": "development"
}
```

---

## 5. Environmental Parameters & Threshold Reference Table

The dashboard automatically classifies incoming values into **Safe / Good**, **Moderate / Average**, or **Dangerous / Unhealthy** based on these reference ranges:

| Parameter | Sensor Model | Unit | Safe / Good | Moderate / Average | Dangerous / Unhealthy |
|---|---|---|---|---|---|
| **CO (Carbon Monoxide)** | MQ7 | ppm | `0–4.4` | `4.5–9` | `>35 (short-term); >9 (8-hr avg)` |
| **CO₂ (Carbon Dioxide)** | MH-Z19 | ppm | `400–1000` | `1000–2000` | `>5000 (OSHA); >40,000 life-threatening` |
| **NO₂ (Nitrogen Dioxide)** | MiCS-6814 | ppb | `0–53` | `54–100` | `>200` |
| **SO₂ (Sulfur Dioxide)** | MQ135 | ppb | `0–35` | `36–75` | `>185` |
| **O₃ (Ozone)** | MQ131 | ppb | `0–54` | `55–70` | `>85` |
| **PM2.5** | PMS7003 | µg/m³ | `0–12` | `12.1–35.4` | `>55.4 (>150.4 hazardous)` |
| **PM10** | PMS7003 | µg/m³ | `0–54` | `55–154` | `>254 (>424 hazardous)` |
| **Temperature** | DHT22 | °C | `20–26 (comfort)` | `15–20 or 26–32` | `<10 or >38 (health risk)` |
| **Humidity** | DHT22 | % RH | `30–50` | `20–30 or 50–60` | `<20 or >70 (mold/discomfort)` |
| **VOC** | MiCS-6814 | ppb | `0–200` | `201–500` | `>500` |
| **NH₃ (Ammonia)** | MQ137 | ppm | `0–25` | `25.1–50` | `>50` |
| **Smoke Level** | MQ2 | raw | `0–200` | `201–500` | `>500` |

---

## 6. Dashboard Overview Metric Cards

The Overview page (`/overview`) features **Top KPI Cards** and **Sensor Detail Cards** dynamically scoped to the designated **Master Node**:

### Top KPI Stat Cards:
1. 📊 **Total Telemetry:** Real-time total records count received across the system.
2. ⚠️ **Active Alerts:** Total count of active threshold breaches across monitored stations.
3. ⚡ **Action Device:** Displays `True` / `False`. Shows `True` when all 10 monitored sensors (`co2`, `pm25`, `pm10`, `co`, `no2`, `so2`, `o3`, `voc`, `nh3`, `smoke`) are normal; displays `False` if any of these sensors show high levels.
4. 🛰️ **Stream Engine:** Live WebSocket streaming status (`ONLINE` / `OFFLINE`).

### Master Station Atmosphere Cards:
1. 🍃 **Air Quality Status:** Overall assessment badge (`Safe / Good`, `Moderate / Average`, or `Dangerous / Unhealthy`).
2. 🌡️ **Temperature:** Ambient temperature in `°C`.
3. 💧 **Humidity:** Relative humidity in `% RH`.
4. 🛡️ **PM2.5:** Fine particulate matter concentration in `µg/m³`.
5. 🧱 **PM10:** Coarse particulate matter concentration in `µg/m³`.
6. ⚠️ **CO₂ (Carbon Dioxide):** Infrared sensor measurement in `ppm`.
7. 🔥 **CO (Carbon Monoxide):** Combustion gas measurement in `ppm`.
8. ⚡ **O₃ (Ozone):** Ground-level ozone measurement in `ppb`.
9. 🎛️ **NO₂ (Nitrogen Dioxide):** Toxic gas measurement in `ppb`.
10. ✨ **VOC (Volatile Organic):** Organic compounds measurement in `ppb`.
11. ⚗️ **NH₃ (Ammonia):** Ammonia gas concentration in `ppm`.
12. 🌫️ **Smoke Level:** Optical detector reading in `raw`.

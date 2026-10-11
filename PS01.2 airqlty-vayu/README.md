# AirSense IoT — Air Quality & Environmental Monitoring Dashboard

A full-stack **MERN** IoT monitoring dashboard for a 4-node LoRa mesh network measuring 10 air-quality parameters.

## 🏗 Architecture

```
           MASTER NODE (MASTER-01)
         Arduino + LoRa Module
                  |
     ─────────────────────────
     |              |              |
  SLAVE-01       SLAVE-02       SLAVE-03
  Zone A         Zone B         Zone C
  (North Wing)   (South Wing)   (Outdoor)
```

**Each node carries:** MQ7, MH-Z19, MQ131, MiCS-6814, MQ135, PMS7003, DHT22, MQ2

---

## 📦 Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- MongoDB Atlas account (or local MongoDB)

---

## ⚙️ Setup

### 1. Configure MongoDB

Edit **`backend/.env`** and replace `YOUR_PASSWORD`:

```env
MONGODB_URI=mongodb+srv://ionodecloud_db_user:YOUR_PASSWORD@ionode.ckcssnb.mongodb.net/PS01
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

> ⚠ **Never commit `.env` or expose `MONGODB_URI` in frontend code.**

---

### 2. Install & Seed Backend

```bash
cd backend
npm install
npm run seed        # Inserts nodes, 24h of readings, alerts, thresholds
```

### 3. Start Backend

```bash
npm run dev         # Starts on http://localhost:5000
```

### 4. Install & Start Frontend

```bash
cd ../frontend
npm install
npm run dev         # Starts on http://localhost:5173
```

---

## 🌐 Pages

| Route | Page |
|---|---|
| `/overview` | Dashboard summary + trend chart |
| `/monitoring` | Live sensor readings (all nodes) |
| `/nodes` | Node management (CRUD) |
| `/sensors` | Per-sensor detail + history chart |
| `/analytics` | Multi-node historical charts |
| `/alerts` | Alert list with filter/resolve/delete |
| `/thresholds` | Configurable threshold editor |
| `/architecture` | LoRa mesh topology diagram |
| `/reports` | Daily/weekly environmental reports |
| `/settings` | App config + IoT integration guide |

---

## 📡 API Reference

### Health
```
GET /api/health
```

### Nodes
```
GET    /api/nodes
GET    /api/nodes/:id
POST   /api/nodes
PUT    /api/nodes/:id
DELETE /api/nodes/:id
```

### Sensor Readings
```
GET  /api/readings
GET  /api/readings/latest
GET  /api/readings/node/:nodeId
GET  /api/readings/sensor/:sensorType
GET  /api/readings/history?nodeId=&from=&to=
POST /api/readings                 ← IoT device data ingestion
```

### Dashboard
```
GET /api/dashboard/summary
GET /api/dashboard/node-status
GET /api/dashboard/air-quality-summary
GET /api/dashboard/reports/daily?date=YYYY-MM-DD
GET /api/dashboard/reports/weekly
```

### Alerts
```
GET    /api/alerts?severity=&nodeId=&status=&page=&limit=
GET    /api/alerts/summary
POST   /api/alerts
PUT    /api/alerts/:id
DELETE /api/alerts/:id
```

### Thresholds
```
GET /api/thresholds
GET /api/thresholds/:sensorType
PUT /api/thresholds/:sensorType
```

---

## 🤖 Sending Sensor Data from IoT Device

POST to `http://localhost:5000/api/readings`:

```json
{
  "nodeId":      "SLAVE-01",
  "timestamp":   "2026-09-17T10:00:00.000Z",
  "co":          2.5,
  "co2":         850,
  "o3":          30,
  "no2":         25,
  "voc":         40,
  "nh3":         5.0,
  "so2":         20,
  "pm25":        10,
  "pm10":        35,
  "temperature": 26.4,
  "humidity":    48,
  "smoke":       12
}
```

Alerts are **auto-generated** when values cross configured thresholds.

---

## 🔌 Arduino/LoRa Integration

The Master Node should HTTP POST readings after aggregating from all slaves:

```cpp
// On Arduino (with ESP8266/ESP32 WiFi module):
HTTPClient http;
http.begin("http://YOUR_SERVER:5000/api/readings");
http.addHeader("Content-Type", "application/json");
int code = http.POST("{\"nodeId\":\"SLAVE-01\",\"co\":2.5,...}");
```

---

## 🚀 Deployment

### Backend (VPS)
```bash
npm install -g pm2
pm2 start server.js --name airsense-api
pm2 save
```

### Frontend (VPS / Static Host)
```bash
npm run build
# Serve dist/ with nginx or any static server
```

---

## 📊 Threshold Reference

> ⚠ Approximate values — adjust per region and project requirements.

| Sensor | Safe | Moderate | Dangerous |
|---|---|---|---|
| CO | 0–4.4 ppm | 4.5–9 ppm | >9 ppm |
| CO₂ | 400–1000 ppm | 1001–2000 ppm | >2000 ppm |
| O₃ | 0–54 ppb | 55–70 ppb | >71 ppb |
| NO₂ | 0–53 ppb | 54–100 ppb | >101 ppb |
| SO₂ | 0–35 ppb | 36–75 ppb | >76 ppb |
| PM2.5 | 0–12 µg/m³ | 12.1–35.4 µg/m³ | >35.5 µg/m³ |
| PM10 | 0–54 µg/m³ | 55–154 µg/m³ | >155 µg/m³ |
| Temperature | 20–26 °C | 15–32 °C | >38 °C |
| Humidity | 30–50 %RH | 20–60 %RH | >70 %RH |
| VOC | 0–200 ppb | 201–500 ppb | >500 ppb |
| NH₃ (Ammonia) | 0–25 ppm | 25.1–50 ppm | >50 ppm |
| Smoke | 0–200 raw | 201–500 raw | >500 raw |

---

## 📁 Project Structure

```
air-quality-monitoring/
├── backend/
│   ├── config/db.js
│   ├── controllers/        (5 controllers)
│   ├── middleware/errorHandler.js
│   ├── models/             (Node, SensorReading, Alert, Threshold)
│   ├── routes/             (5 route files)
│   ├── seed/seed.js
│   ├── services/           (alertService, thresholdService)
│   ├── server.js
│   ├── .env                ← keep private!
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     (SensorCard, NodeCard, UI)
│   │   ├── layouts/MainLayout.jsx
│   │   ├── pages/          (10 pages)
│   │   ├── services/api.js
│   │   └── utils/thresholds.js
│   ├── .env
│   └── package.json
│
└── README.md
```

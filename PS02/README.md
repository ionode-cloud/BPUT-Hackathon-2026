# Heatwaves & Edge AI — Arduino UNO Q Monitoring & Response System
**Problem Statement 2 — BPUT Hackathon 2026**

A local, room-level and street-level heat stress monitoring and autonomous response web application designed to run on the **Arduino UNO Q** with local Edge AI inference. The system remains fully operational through power cuts and network outages with zero reliance on cloud AI APIs.

---

## 🏗️ System Architecture

```
                       MASTER NODE
                      Arduino UNO Q
                (Qualcomm Dragonwing QRB2210)
                 STM32U585 Sensing & Relays
                     [Local Edge AI]
                            |
                 -----------------------
                 |                     |
             SLAVE-01              SLAVE-02
              (ESP32)               (ESP32)
                 |                     |
           Complete Sensors      Complete Sensors
```

### 1. Master Node: Arduino UNO Q
- **Processor:** Qualcomm Dragonwing QRB2210 Linux core (executes local autoregressive heat stress prediction models).
- **Coprocessor:** STM32U585 for low-power sensor acquisition and direct relay/actuation control (Fans, Coolers, Evaporative Misting, Sirens).
- **Offline Autonomy:** Operates independently without cloud backhaul; persists telemetry to local flash.

### 2. Slave Nodes: ESP32
- **SLAVE-01:** Deployed at Street Market Corridor (High solar radiance & urban canyon).
- **SLAVE-02:** Deployed at Residential Rooftop & School Play Area (Direct thermal radiance).

### 3. Complete Sensor Suite (Per Node)
- **BME688:** Ambient Temperature (°C), Relative Humidity (%RH), VOC / Gas Index (IAQ).
- **DS18B20 (Mounted in Black Globe):** Mean Radiant Heat Temperature (°C).
- **Anemometer with Wind Vane:** Wind Speed (m/s) and Wind Direction (°).
- **BH1750:** Solar Light Irradiance (lux) as direct solar load proxy.
- **MLX90640:** 32×24 Thermal Infrared Array for roof and wall surface heat mapping.

---

## 🎨 Exact Visual Palette (Follows Reference Admin Dashboard)

| Element | Color Hex | Preview / Role |
| :--- | :--- | :--- |
| **Sidebar Background** | `#1F5275` | Fixed dark blue navigation |
| **Sidebar Brand Header** | `#1B496B` | Darker blue brand zone |
| **Main Background** | `#E7E7E7` | Light gray workspace |
| **Cards & Header** | `#FFFFFF` | Crisp rectangular white cards |
| **Primary Typography** | `#173B5A` | Deep dark navy numbers & text |
| **Secondary Typography** | `#8A8A8A` | Subtitle & metadata gray |
| **Teal Accent & Headings**| `#3D8888` | Section titles & primary chart line |
| **Chart Highlights** | `#C5ED8D` | Lime green chart contrast line |
| **Borders & Dividers** | `#D9D9D9` | Minimal thin borders |
| **Safe Status** | `#C5ED8D` | Normal microclimate band |
| **Moderate Status** | `#E7C86A` | Active mitigation warning |
| **Dangerous Status** | `#D96C6C` | Emergency heatwave threshold |
| **Offline Status** | `#A0A0A0` | Network/power disconnected |

---

## 🚀 Key Features

1. **Dashboard Overview:**
   - 8 compact statistic cards: Total Nodes, Online Nodes, Current WBGT, Heat Risk Level, Ambient Temp, Humidity, Heat Index, and Active Alerts.
2. **Short-Horizon Heat Prediction:**
   - Local Edge AI autoregressive thermal-inertia forecasts for **+15 min, +30 min, +1 hour, and +2 hours**.
3. **Personalised Heat Risk:**
   - Targeted physiological assessments and ISO 7243 rest-break recommendations for **Labourer**, **Child**, and **Elderly** profiles.
4. **Local Relief Actions:**
   - Direct STM32U585 actuator states: High-Volume Fan Relay, Air Cooler/AC Relay, Ventilation Louvers, Evaporative Misting Line, and Siren/Beacon alerts.
5. **Live Monitoring:**
   - Real-time telemetry cards for all 10 sensors across `MASTER-01`, `SLAVE-01`, and `SLAVE-02`.
   - Includes interactive **MLX90640 32×24 thermal matrix** popup.
6. **Heat Stress Analytics:**
   - High-fidelity Recharts trends for Temp, WBGT, Heat Index, Humidity, Radiant Heat, Wind Speed, and Surface Heat.
7. **Street-Level Heat Map:**
   - Interactive municipal microclimate map highlighting hot spots and urban heat island mitigation guidelines.
8. **Alerts & System Health:**
   - Filterable severity levels (`Critical`, `Warning`, `Safe`, `Resolved`) with one-click simulation and acknowledgement.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- *(Optional)* MongoDB running locally on port 27017. If not running, the application automatically launches an in-memory database fallback!

### 1. Backend Setup

```bash
cd backend
npm install
npm run seed     # Seeds nodes, 24-hr historical telemetry, and alerts
npm run dev      # Starts Express server on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

Open your browser at: **`http://localhost:5173`**

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Hardware & system offline health check |
| `GET` | `/api/nodes` | Retrieve all 3 hardware nodes with latest telemetry |
| `GET` | `/api/nodes/:id` | Retrieve single node status |
| `POST` | `/api/nodes` | Register new sensor node |
| `GET` | `/api/readings/latest`| Latest readings across Master and Slaves |
| `GET` | `/api/readings/node/:id` | 24-hour time series for specific node |
| `POST` | `/api/readings` | Ingest sensor packet & run local Edge AI algorithms |
| `GET` | `/api/dashboard/summary` | Full dashboard summary, stats, prediction & relief states |
| `GET` | `/api/dashboard/heat-stress` | Historical thermal indices for charting |
| `GET` | `/api/dashboard/prediction` | Local short-horizon heat forecast (+15m to +2h) |
| `GET` | `/api/alerts` | List all system & heatwave alerts |
| `POST` | `/api/alerts` | Trigger / simulate new heat emergency alert |
| `PUT` | `/api/alerts/:id` | Acknowledge or resolve an alert |
| `GET` | `/api/heatmap` | Spatial microclimate points for street heat mapping |

---

## 🛡️ License
Built for **BPUT Hackathon 2026 — Problem Statement 2 (Heatwaves & Edge AI)**.
All rights reserved.

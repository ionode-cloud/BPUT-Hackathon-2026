# 🌡️ Heatwaves & Edge AI — REST API Documentation

> **BPUT Hackathon 2026 — Problem Statement PS02**
> Local Heat Stress Monitoring & Edge AI Response System
> Hardware: Arduino UNO Q (Qualcomm Dragonwing QRB2210 + STM32U585) · ESP32-WROOM-32D × 2

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base URL & Headers](#base-url--headers)
3. [System Architecture](#system-architecture)
4. [Response Format](#response-format)
5. [Endpoints — System Health](#1-system-health)
6. [Endpoints — Node Management](#2-node-management)
7. [Endpoints — Sensor Readings](#3-sensor-readings)
8. [Endpoints — Dashboard & Analytics](#4-dashboard--analytics)
9. [Endpoints — Alerts](#5-alerts)
10. [Endpoints — Heat Map](#6-heat-map)
11. [Error Codes](#error-codes)
12. [Postman Quick Reference](#postman-quick-reference)
13. [Sensor Field Reference](#sensor-field-reference)

---

## Overview

This API serves as the data backbone for a **3-node autonomous edge AI network** designed to monitor and respond to extreme heatwaves in real time. All inference (WBGT, Heat Index, short-horizon prediction) runs **locally on the Master Node** — no cloud services are required.

| Property | Value |
|---|---|
| Protocol | HTTP/REST |
| Data Format | JSON |
| Authentication | None (Local Area Network) |
| Edge AI Engine | Qualcomm Dragonwing QRB2210 Linux (MASTER-01) |
| Actuation Controller | STM32U585 MCU (GPIO relay control) |
| Offline Resilience | ✅ Full offline mode — zero cloud dependency |

---

## Base URL & Headers

`
Base URL:     http://localhost:5000/api
Content-Type: application/json
Accept:       application/json
`

All POST / PUT request bodies must be sent as raw JSON with the Content-Type: application/json header.

---

## System Architecture

`
MASTER NODE — Arduino UNO Q
  Qualcomm Dragonwing QRB2210 Linux (Edge AI Inference)
  STM32U585 MCU (Sensor Polling + Relay/Actuation GPIO)
  Sensors: BME688 · DS18B20 · Anemometer · BH1750 · MLX90640
  API Server (Express.js) · MongoDB Database
        |                          |
  SLAVE-01 (ESP32-WROOM-32D)    SLAVE-02 (ESP32-WROOM-32D)
  Street Market Zone             School Rooftop Zone
  POST /api/readings (raw telemetry -> Edge AI auto-computes WBGT / HeatIndex)
`

---

## Response Format

All responses follow a consistent envelope:

`json
{
  "success": true,
  "count": 3,
  "data": [ ... ]
}
`

Error response:
`json
{
  "success": false,
  "message": "Descriptive error message"
}
`

---

## 1. System Health

### GET /api/health

Returns the server and hardware status.

Response 200 OK:
`json
{
  "status": "online",
  "system": "Heatwaves & Edge AI System",
  "hardware": "Arduino UNO Q (Qualcomm Dragonwing QRB2210 + STM32U585)",
  "offlineResilient": true,
  "timestamp": "2026-09-18T06:00:00.000Z"
}
`

---

## 2. Node Management

Base path: /api/nodes

### GET /api/nodes — List all nodes
### GET /api/nodes/:id — Get node by ID
### POST /api/nodes — Create node
### PUT /api/nodes/:id — Update node
### DELETE /api/nodes/:id — Delete node + all telemetry

POST /api/nodes body:
`json
{
  "nodeId": "SLAVE-03",
  "nodeName": "School Entrance Gateway Node",
  "nodeType": "slave",
  "location": "Primary School Front Entrance",
  "signalStrength": -72,
  "batteryLevel": 95
}
`

PUT /api/nodes/SLAVE-01 body:
`json
{
  "status": "warning",
  "batteryLevel": 28,
  "signalStrength": -74
}
`

---

## 3. Sensor Readings — POST /api/readings

Required: nodeId, temperature, humidity. All others optional.
Edge AI auto-computes: heatIndex, wbgt, riskLevel.

MASTER-01 (Indoor Community Center):
`json
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
`

SLAVE-01 (Street Market — Heatwave Peak):
`json
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
`

SLAVE-02 (School Rooftop — Extreme Surface Heat):
`json
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
`

GET /api/readings?nodeId=SLAVE-01&limit=50
GET /api/readings/latest
GET /api/readings/node/MASTER-01?limit=24

---

## 4. Dashboard

GET /api/dashboard/summary — Live stats, hardware info, relief actions, personalised risk, predictions
GET /api/dashboard/heat-stress?nodeId=SLAVE-01&limit=24
GET /api/dashboard/prediction?nodeId=MASTER-01

---

## 5. Alerts

GET /api/alerts?severity=Critical&status=Active&nodeId=SLAVE-01

POST /api/alerts:
`json
{
  "nodeId": "SLAVE-01",
  "alertType": "High WBGT",
  "value": "33.8 C",
  "severity": "Critical",
  "message": "Mandatory work halt. WBGT >33 C threshold breached."
}
`

PUT /api/alerts/:id:
`json
{ "status": "Resolved" }
`

---

## 6. Heat Map

GET /api/heatmap — Spatial microclimate data for all node locations

---

## Error Codes

| HTTP | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation error |
| 404 | Not Found |
| 500 | Server Error |

---

## WBGT Thresholds

| WBGT | Risk | Action |
|---|---|---|
| < 25 C | Safe | Normal activity |
| 25-27.9 C | Moderate | Hydrate, precautions |
| 28-30.9 C | Dangerous | Reduce activity, mandatory breaks |
| >= 31 C | Critical | Work cessation, evacuate |


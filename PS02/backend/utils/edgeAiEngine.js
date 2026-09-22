/**
 * Edge AI Engine — Local inference and thermal physiological algorithms
 * Runs locally simulating Qualcomm Dragonwing QRB2210 + STM32U585 architecture
 */

// Stull formula approximation for Wet Bulb Temperature (°C)
export function calculateWetBulb(tempC, rh) {
  const T = tempC;
  const RH = rh;
  const Tw =
    T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035;
  return Math.round(Tw * 10) / 10;
}

// NOAA Rothfusz regression for Heat Index (°C)
export function calculateHeatIndex(tempC, rh) {
  const T = (tempC * 9) / 5 + 32; // to Fahrenheit
  const RH = rh;

  let HI = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + RH * 0.094);

  if (HI >= 80) {
    HI =
      -42.379 +
      2.04901523 * T +
      10.14333127 * RH -
      0.22475541 * T * RH -
      0.00683783 * T * T -
      0.05481717 * RH * RH +
      0.00122874 * T * T * RH +
      0.00085282 * T * RH * RH -
      0.00000199 * T * T * RH * RH;

    if (RH < 13 && T >= 80 && T <= 112) {
      const adj = ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95.0)) / 17);
      HI -= adj;
    } else if (RH > 85 && T >= 80 && T <= 87) {
      const adj = ((RH - 85) / 10) * ((87 - T) / 5);
      HI += adj;
    }
  }

  const hiCelsius = ((HI - 32) * 5) / 9;
  return Math.round(hiCelsius * 10) / 10;
}

// Outdoor WBGT using wet bulb, radiant globe (DS18B20), and dry bulb (BME688)
export function calculateWBGT(tempC, rh, radiantHeatC) {
  const Tw = calculateWetBulb(tempC, rh);
  const Tg = radiantHeatC || tempC + 4.5;
  const Td = tempC;

  // Outdoor with solar radiant load: 0.7 Tw + 0.2 Tg + 0.1 Td
  const wbgt = 0.7 * Tw + 0.2 * Tg + 0.1 * Td;
  return Math.round(wbgt * 10) / 10;
}

export function evaluateHeatRiskLevel(wbgt) {
  if (wbgt < 27.0) return 'Safe';
  if (wbgt <= 31.0) return 'Moderate';
  return 'Dangerous';
}

/**
 * Short-Horizon Heat Prediction (Local Edge AI model)
 * Projects thermal trajectory for +15m, +30m, +1h, +2h
 */
export function generateEdgeAiPrediction(currentReading, historicalTrend = []) {
  const currentTemp = currentReading.temperature || 36.5;
  const currentWbgt = currentReading.wbgt || 29.2;
  const solarFactor = (currentReading.lightIntensity || 45000) / 50000;
  const surfaceDelta = (currentReading.surfaceTemperature || 42.0) - currentTemp;

  // Thermal inertia rate (°C/hr estimate based on radiant energy and surface delta)
  const heatRatePerHour = Math.min(2.8, Math.max(0.4, (solarFactor * 1.2) + (surfaceDelta * 0.08)));

  const p15Temp = Math.round((currentTemp + heatRatePerHour * 0.25) * 10) / 10;
  const p30Temp = Math.round((currentTemp + heatRatePerHour * 0.5) * 10) / 10;
  const p1hTemp = Math.round((currentTemp + heatRatePerHour * 1.0) * 10) / 10;
  const p2hTemp = Math.round((currentTemp + heatRatePerHour * 1.8) * 10) / 10;

  const p15Wbgt = Math.round((currentWbgt + heatRatePerHour * 0.18) * 10) / 10;
  const p30Wbgt = Math.round((currentWbgt + heatRatePerHour * 0.35) * 10) / 10;
  const p1hWbgt = Math.round((currentWbgt + heatRatePerHour * 0.7) * 10) / 10;
  const p2hWbgt = Math.round((currentWbgt + heatRatePerHour * 1.2) * 10) / 10;

  return {
    engine: 'Arduino UNO Q — Qualcomm QRB2210 Linux Local Inference',
    model: 'Autoregressive Thermal-Inertia Model v2.1',
    executionMode: 'Offline Edge Native (No Cloud API)',
    timestamp: new Date().toISOString(),
    current: {
      temperature: currentTemp,
      wbgt: currentWbgt,
      heatIndex: currentReading.heatIndex || 38.4,
    },
    predictionHorizon: '15m - 2h',
    riskTrend: p1hWbgt > currentWbgt ? 'Escalating Heat Stress' : 'Stable Microclimate',
    forecasts: [
      {
        horizon: '+15 min',
        predictedTemp: p15Temp,
        predictedWbgt: p15Wbgt,
        riskLevel: evaluateHeatRiskLevel(p15Wbgt),
        heatDelta: `+${Math.round((p15Temp - currentTemp) * 10) / 10}°C`,
      },
      {
        horizon: '+30 min',
        predictedTemp: p30Temp,
        predictedWbgt: p30Wbgt,
        riskLevel: evaluateHeatRiskLevel(p30Wbgt),
        heatDelta: `+${Math.round((p30Temp - currentTemp) * 10) / 10}°C`,
      },
      {
        horizon: '+1 hour',
        predictedTemp: p1hTemp,
        predictedWbgt: p1hWbgt,
        riskLevel: evaluateHeatRiskLevel(p1hWbgt),
        heatDelta: `+${Math.round((p1hTemp - currentTemp) * 10) / 10}°C`,
      },
      {
        horizon: '+2 hours',
        predictedTemp: p2hTemp,
        predictedWbgt: p2hWbgt,
        riskLevel: evaluateHeatRiskLevel(p2hWbgt),
        heatDelta: `+${Math.round((p2hTemp - currentTemp) * 10) / 10}°C`,
      },
    ],
  };
}

/**
 * Personalised Heat Risk grading
 * Profiles: Labourer, Child, Elderly
 */
export function getPersonalisedRisk(profile, reading) {
  const wbgt = reading?.wbgt || 29.2;
  const heatIndex = reading?.heatIndex || 38.0;

  switch (profile) {
    case 'Labourer': {
      let risk = 'Safe';
      let restBreak = 'Normal work rhythm (5 min water break / hour)';
      let explanation = 'Continuous high metabolic exertion elevates core internal body temperature.';

      if (wbgt >= 31.0 || heatIndex >= 42.0) {
        risk = 'Dangerous';
        restBreak = 'Mandatory 45 min rest per 15 min work under shade';
        explanation = 'Critical heat stroke risk during heavy manual labor. Discontinue outdoor roofing/digging.';
      } else if (wbgt >= 28.0 || heatIndex >= 37.0) {
        risk = 'Moderate';
        restBreak = 'Mandatory 30 min rest per 30 min work, electrolyte intake';
        explanation = 'Elevated cardiac stress and heavy perspiration. Rotate workers to shaded recovery zones.';
      }

      return {
        profile: 'Labourer',
        riskLevel: risk,
        heatIndex,
        wbgt,
        restBreakStatus: restBreak,
        explanation,
        vulnerabilityFactor: 'High metabolic rate (350-450W), direct solar exposure',
      };
    }
    case 'Child': {
      let risk = 'Safe';
      let restBreak = 'Normal outdoor play with regular hydration';
      let explanation = 'Children heat up faster due to higher surface-area-to-body-mass ratio.';

      if (wbgt >= 31.5 || heatIndex >= 41.0) {
        risk = 'Dangerous';
        restBreak = 'Immediate cessation of outdoor activities; move indoors to cool zone';
        explanation = 'Severe dehydration and hyperthermia hazard. Sweating rate is less efficient in pediatric subjects.';
      } else if (wbgt >= 28.5 || heatIndex >= 36.5) {
        risk = 'Moderate';
        restBreak = 'Limit outdoor playground time to 20 minutes; provide chilled water';
        explanation = 'Rapid core heat accumulation under direct sunlight.';
      }

      return {
        profile: 'Child',
        riskLevel: risk,
        heatIndex,
        wbgt,
        restBreakStatus: restBreak,
        explanation,
        vulnerabilityFactor: 'Developing thermoregulatory system, reduced sweating efficiency',
      };
    }
    case 'Elderly': {
      let risk = 'Safe';
      let restBreak = 'Standard indoor climate monitoring';
      let explanation = 'Cardiovascular strain increases dramatically during prolonged ambient heat.';

      if (wbgt >= 30.5 || heatIndex >= 40.0) {
        risk = 'Dangerous';
        restBreak = 'Immediate air-conditioned shelter; wellness and vitals check required';
        explanation = 'High probability of heat syncope, cardiovascular breakdown, or heat exhaustion.';
      } else if (wbgt >= 27.8 || heatIndex >= 36.0) {
        risk = 'Moderate';
        restBreak = 'Continuous indoor fan/cooling; avoid any non-essential exertion';
        explanation = 'Blunted thirst perception and reduced cardiac output under heat stress.';
      }

      return {
        profile: 'Elderly',
        riskLevel: risk,
        heatIndex,
        wbgt,
        restBreakStatus: restBreak,
        explanation,
        vulnerabilityFactor: 'Impaired vascular dilation, chronic medications, blunted thirst mechanism',
      };
    }
    default:
      return getPersonalisedRisk('Labourer', reading);
  }
}

/**
 * Local Relief Actions controlled by STM32U585 microcontroller on Arduino UNO Q
 */
export function getLocalReliefActions(reading) {
  const temp = reading?.temperature || 36.5;
  const rh = reading?.humidity || 52;
  const wbgt = reading?.wbgt || 29.2;
  const voc = reading?.voc || 88;

  return [
    {
      id: 'fan',
      name: 'High-Volume Fan Relay',
      status: temp > 32.0 ? 'Active' : 'Inactive',
      triggerReason: temp > 32.0 ? `Ambient temp ${temp}°C > 32.0°C threshold` : 'Ambient temp within safe thermal band',
      localControl: 'STM32U585 Relay Pin 4',
      powerMode: 'Local Low-Power Battery Bank',
    },
    {
      id: 'cooler',
      name: 'Air Cooler / AC Relay',
      status: wbgt >= 29.0 ? 'Active' : 'Inactive',
      triggerReason: wbgt >= 29.0 ? `WBGT ${wbgt}°C exceeds threshold (29.0°C)` : 'WBGT within tolerable comfort limit',
      localControl: 'STM32U585 Relay Pin 7',
      powerMode: 'Local Low-Power Battery Bank',
    },
    {
      id: 'ventilation',
      name: 'Ventilation Louvers',
      status: voc > 100 || temp > 34.0 ? 'Active' : 'Inactive',
      triggerReason: voc > 100 ? `VOC Index ${voc} requires fresh air purge` : 'VOC Index nominal, passive airflow',
      localControl: 'STM32U585 PWM Servo Ch 2',
      powerMode: 'Local Solar + Micro-UPS',
    },
    {
      id: 'evaporative',
      name: 'Evaporative Misting Line',
      status: temp >= 35.0 && rh < 65 ? 'Active' : 'Inactive',
      triggerReason: temp >= 35.0 && rh < 65 ? `High temp (${temp}°C) with low RH (${rh}%) allows adiabatic misting` : 'Misting suppressed (high humidity or low heat)',
      localControl: 'STM32U585 Solenoid Valve Pin 8',
      powerMode: 'Local Low-Power Battery Bank',
    },
    {
      id: 'rest_break',
      name: 'Rest Break Siren & Beacon',
      status: wbgt >= 30.0 ? 'Active' : 'Inactive',
      triggerReason: wbgt >= 30.0 ? `Dangerous WBGT ${wbgt}°C triggered occupational break alert` : 'WBGT below mandatory siren trigger',
      localControl: 'STM32U585 Audio Alarm GPIO 12',
      powerMode: 'Local Piezo Beeper + Flash LED',
    },
  ];
}

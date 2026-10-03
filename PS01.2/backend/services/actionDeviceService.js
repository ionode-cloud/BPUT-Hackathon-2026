/**
 * Action Device evaluation service
 * 
 * Target sensors to evaluate:
 * - co2 (MH-Z19)   : safe <= 1000 ppm
 * - pm25 (PMS7003) : safe <= 12 µg/m³
 * - pm10 (PMS7003) : safe <= 54 µg/m³
 * - co (MQ7)       : safe <= 4.4 ppm
 * - no2 (MiCS-6814): safe <= 53 ppb
 * - so2 (MQ135)    : safe <= 35 ppb
 * - o3 (MQ131)     : safe <= 54 ppb
 * - voc (MiCS-6814): safe <= 200 ppb
 * - nh3 (MQ137)    : safe <= 25 ppm
 * - smoke (MQ2)    : safe <= 200 raw
 * 
 * Logic:
 * When all target sensor readings are normal (<= safeMax): return true
 * If ANY of these sensors show high (> safeMax): return false
 */

const ACTION_DEVICE_THRESHOLDS = {
  co2:   1000,
  pm25:  12,
  pm10:  54,
  co:    4.4,
  no2:   53,
  so2:   35,
  o3:    54,
  voc:   200,
  nh3:   25,
  smoke: 200,
};

/**
 * Evaluates whether all target sensors are normal.
 * @param {Object} reading - Document or raw body with sensor readings
 * @returns {boolean} true if all normal, false if any sensor is high
 */
const computeActionDevice = (reading) => {
  if (!reading) return true;

  for (const [key, maxSafe] of Object.entries(ACTION_DEVICE_THRESHOLDS)) {
    const raw = reading[key];
    const val = (raw !== null && typeof raw === 'object' && raw.value !== undefined)
      ? raw.value
      : raw;

    if (val !== null && val !== undefined && val !== '' && !isNaN(val)) {
      if (Number(val) > maxSafe) {
        return false;
      }
    }
  }

  return true;
};

module.exports = {
  ACTION_DEVICE_THRESHOLDS,
  computeActionDevice,
};

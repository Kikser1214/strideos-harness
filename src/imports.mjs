import path from "node:path";
import { Decoder, Stream } from "@garmin/fitsdk";

export const MAX_IMPORT_BYTES = 8_000_000;
const supportedExtensions = new Set([".fit", ".gpx", ".tcx", ".csv"]);

export class ImportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function cleanFileName(value) {
  const input = String(value || "").trim();
  if (!input || input.includes("\0")) throw new ImportError("Choose a FIT, GPX, TCX, or CSV activity file.");
  return path.basename(input).slice(0, 180);
}

function decodePayload(dataBase64) {
  const input = String(dataBase64 || "").replace(/^data:[^;]+;base64,/i, "");
  if (!input || !/^[a-z0-9+/=\r\n]+$/i.test(input)) throw new ImportError("The activity file payload is not valid base64.");
  const buffer = Buffer.from(input, "base64");
  if (!buffer.length) throw new ImportError("The activity file is empty.");
  if (buffer.length > MAX_IMPORT_BYTES) throw new ImportError("Choose an activity file smaller than 8 MB.", 413);
  return buffer;
}

function rounded(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function isoDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function freshnessFor(activityAt, now = new Date()) {
  const timestamp = activityAt ? new Date(activityAt).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return { status: "unknown", ageHours: null };
  const ageHours = Math.max(0, (now.getTime() - timestamp) / 3_600_000);
  return { status: ageHours <= 36 ? "fresh" : ageHours <= 96 ? "aging" : "stale", ageHours: rounded(ageHours, 1) };
}

function activitySummary(activity) {
  const parts = [];
  if (activity.distanceKm !== null) parts.push(`${activity.distanceKm.toFixed(2)} km`);
  if (activity.durationSeconds !== null) parts.push(`${Math.round(activity.durationSeconds / 60)} min`);
  if (activity.avgHeartRate !== null) parts.push(`${Math.round(activity.avgHeartRate)} bpm avg`);
  return parts.join(" · ") || "Activity summary imported";
}

function normalizeActivity(input, context) {
  const activityAt = isoDate(input.activityAt);
  const activity = {
    source: `file_${context.extension.slice(1)}`,
    format: context.extension.slice(1).toUpperCase(),
    fileName: context.fileName,
    activityAt,
    sport: String(input.sport || "activity").replaceAll("_", " ").slice(0, 80),
    name: String(input.name || input.sport || "Imported activity").slice(0, 140),
    distanceKm: rounded(input.distanceKm, 3),
    durationSeconds: rounded(input.durationSeconds, 0),
    avgHeartRate: rounded(input.avgHeartRate, 0),
    maxHeartRate: rounded(input.maxHeartRate, 0),
    calories: rounded(input.calories, 0),
    sampleCount: Number.isInteger(input.sampleCount) ? input.sampleCount : null,
    warnings: [...new Set((input.warnings || []).filter(Boolean).map((warning) => String(warning).slice(0, 220)))]
  };
  activity.freshness = freshnessFor(activityAt);
  activity.summary = activitySummary(activity);
  return activity;
}

function parseFit(buffer, context) {
  const stream = Stream.fromBuffer(buffer);
  if (!Decoder.isFIT(stream)) throw new ImportError("This file does not contain a valid FIT header.");
  const decoder = new Decoder(Stream.fromBuffer(buffer));
  const integrity = decoder.checkIntegrity();
  const { messages, errors } = decoder.read({ convertDateTimesToDates: true, convertTypesToStrings: true, mergeHeartRates: true });
  const sessions = messages.sessionMesgs || [];
  const laps = messages.lapMesgs || [];
  const records = messages.recordMesgs || [];
  const base = sessions[0] || laps[0] || {};
  if (!sessions.length && !laps.length && !records.length) throw new ImportError("The FIT file decoded, but it did not contain an activity session.");
  const firstRecord = records[0] || {};
  const lastRecord = records[records.length - 1] || {};
  const recordDuration = firstRecord.timestamp && lastRecord.timestamp
    ? (new Date(lastRecord.timestamp).getTime() - new Date(firstRecord.timestamp).getTime()) / 1000
    : null;
  const heartRates = records.map((record) => positive(record.heartRate)).filter((value) => value !== null);
  const warningList = [];
  if (!integrity) warningList.push("FIT checksum or length validation did not pass; decoded values should be reviewed.");
  if (errors.length) warningList.push(`Garmin FIT decoder reported ${errors.length} recoverable issue${errors.length === 1 ? "" : "s"}.`);
  return [normalizeActivity({
    activityAt: base.startTime || firstRecord.timestamp || messages.activityMesgs?.[0]?.timestamp,
    sport: base.sport || base.subSport || "activity",
    name: base.sport ? `${String(base.sport).replaceAll("_", " ")} activity` : "Imported FIT activity",
    distanceKm: positive(base.totalDistance) !== null ? positive(base.totalDistance) / 1000 : positive(lastRecord.distance) !== null ? positive(lastRecord.distance) / 1000 : null,
    durationSeconds: positive(base.totalTimerTime) ?? positive(base.totalElapsedTime) ?? positive(recordDuration),
    avgHeartRate: positive(base.avgHeartRate) ?? (heartRates.length ? heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length : null),
    maxHeartRate: positive(base.maxHeartRate) ?? (heartRates.length ? Math.max(...heartRates) : null),
    calories: positive(base.totalCalories),
    sampleCount: records.length,
    warnings: warningList
  }, context)];
}

function xmlText(buffer, expectedPattern) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new ImportError("XML declarations with external entities are not accepted.");
  if (!expectedPattern.test(text)) throw new ImportError("The file does not match the selected activity format.");
  return text;
}

function blocks(text, tag) {
  const pattern = new RegExp(`<(?:[a-z0-9_-]+:)?${tag}\\b[^>]*>[\\s\\S]*?<\\/(?:[a-z0-9_-]+:)?${tag}>`, "gi");
  return text.match(pattern) || [];
}

function tagValue(text, tag) {
  const match = new RegExp(`<(?:[a-z0-9_-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-z0-9_-]+:)?${tag}>`, "i").exec(text);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : null;
}

function haversineMeters(a, b) {
  const radius = 6_371_000;
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function routeDistance(points) {
  let meters = 0;
  for (let index = 1; index < points.length; index += 1) meters += haversineMeters(points[index - 1], points[index]);
  return meters;
}

function parseGpx(buffer, context) {
  const text = xmlText(buffer, /<(?:[a-z0-9_-]+:)?gpx\b/i);
  const pointBlocks = text.match(/<(?:[a-z0-9_-]+:)?trkpt\b[^>]*>[\s\S]*?<\/(?:[a-z0-9_-]+:)?trkpt>/gi) || [];
  const points = pointBlocks.map((point) => {
    const start = /<[^>]*trkpt\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>/i.exec(point)
      || /<[^>]*trkpt\b[^>]*\blon=["']([^"']+)["'][^>]*\blat=["']([^"']+)["'][^>]*>/i.exec(point);
    if (!start) return null;
    const reversed = /\blon=/.test(start[0].split(/\blat=/i)[0]);
    const lat = Number(reversed ? start[2] : start[1]);
    const lon = Number(reversed ? start[1] : start[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, time: isoDate(tagValue(point, "time")), heartRate: positive(tagValue(point, "hr")) };
  }).filter(Boolean);
  if (!points.length) throw new ImportError("The GPX file does not contain readable track points.");
  const timed = points.filter((point) => point.time);
  const duration = timed.length > 1 ? (new Date(timed[timed.length - 1].time).getTime() - new Date(timed[0].time).getTime()) / 1000 : null;
  const heartRates = points.map((point) => point.heartRate).filter((value) => value !== null);
  return [normalizeActivity({
    activityAt: timed[0]?.time,
    sport: tagValue(text, "type") || "running",
    name: tagValue(text, "name") || "Imported GPX route",
    distanceKm: routeDistance(points) / 1000,
    durationSeconds: positive(duration),
    avgHeartRate: heartRates.length ? heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length : null,
    maxHeartRate: heartRates.length ? Math.max(...heartRates) : null,
    sampleCount: points.length,
    warnings: timed.length < 2 ? ["No complete time range was found, so duration is unavailable."] : []
  }, context)];
}

function parseTcx(buffer, context) {
  const text = xmlText(buffer, /<(?:[a-z0-9_-]+:)?TrainingCenterDatabase\b/i);
  const activityBlock = blocks(text, "Activity")[0] || text;
  const pointBlocks = blocks(activityBlock, "Trackpoint");
  if (!pointBlocks.length) throw new ImportError("The TCX file does not contain readable track points.");
  const points = pointBlocks.map((point) => ({
    time: isoDate(tagValue(point, "Time")),
    distance: positive(tagValue(point, "DistanceMeters")),
    heartRate: positive(tagValue(point, "Value")),
    lat: Number(tagValue(point, "LatitudeDegrees")),
    lon: Number(tagValue(point, "LongitudeDegrees"))
  }));
  const timed = points.filter((point) => point.time);
  const coordinatePoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  const recordedDistances = points.map((point) => point.distance).filter((value) => value !== null);
  const heartRates = points.map((point) => point.heartRate).filter((value) => value !== null);
  const lapTime = positive(/\bTotalTimeSeconds=["']([^"']+)["']/i.exec(activityBlock)?.[1]);
  const duration = lapTime ?? (timed.length > 1 ? (new Date(timed[timed.length - 1].time).getTime() - new Date(timed[0].time).getTime()) / 1000 : null);
  const sport = /<(?:[a-z0-9_-]+:)?Activity\b[^>]*\bSport=["']([^"']+)["']/i.exec(activityBlock)?.[1] || "activity";
  return [normalizeActivity({
    activityAt: tagValue(activityBlock, "Id") || timed[0]?.time,
    sport,
    name: `${sport} activity`,
    distanceKm: recordedDistances.length ? Math.max(...recordedDistances) / 1000 : coordinatePoints.length > 1 ? routeDistance(coordinatePoints) / 1000 : null,
    durationSeconds: positive(duration),
    avgHeartRate: heartRates.length ? heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length : null,
    maxHeartRate: heartRates.length ? Math.max(...heartRates) : null,
    sampleCount: points.length,
    warnings: []
  }, context)];
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += character;
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (quoted) throw new ImportError("The CSV file contains an unterminated quoted value.");
  return rows;
}

function normalizedHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function firstColumn(record, names) {
  for (const name of names) if (record[name] !== undefined && String(record[name]).trim() !== "") return { name, value: record[name] };
  return { name: null, value: null };
}

function durationSeconds(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (/^\d+(?::\d{1,2}){1,2}$/.test(text)) {
    const parts = text.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return positive(text.replace(/[^0-9.]/g, ""));
}

function parseCsv(buffer, context) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = csvRows(text);
  if (rows.length < 2) throw new ImportError("The CSV needs a header and at least one activity row.");
  const headers = rows[0].map(normalizedHeader);
  if (new Set(headers).size !== headers.length || headers.some((header) => !header)) throw new ImportError("The CSV header contains blank or duplicate columns.");
  const activities = [];
  for (const values of rows.slice(1, 101)) {
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const date = firstColumn(record, ["activity_at", "start_time", "timestamp", "datetime", "date", "activity_date"]);
    const sport = firstColumn(record, ["sport", "activity_type", "type", "activity"]);
    const distance = firstColumn(record, ["distance_km", "kilometers", "km", "distance_meters", "meters", "distance_miles", "miles", "distance"]);
    const duration = firstColumn(record, ["duration_seconds", "elapsed_time", "moving_time", "duration", "time"]);
    const avgHeartRate = firstColumn(record, ["avg_heart_rate", "average_heart_rate", "avg_hr", "heart_rate"]);
    const maxHeartRate = firstColumn(record, ["max_heart_rate", "max_hr"]);
    const calories = firstColumn(record, ["calories", "total_calories"]);
    if (![date.value, sport.value, distance.value, duration.value].some((value) => String(value || "").trim())) continue;
    let distanceKm = positive(String(distance.value ?? "").replace(/[^0-9.]/g, ""));
    if (distanceKm !== null && /meter/.test(distance.name || "")) distanceKm /= 1000;
    if (distanceKm !== null && /mile/.test(distance.name || "")) distanceKm *= 1.609344;
    activities.push(normalizeActivity({
      activityAt: date.value,
      sport: sport.value || "activity",
      name: record.name || record.title || sport.value || "Imported CSV activity",
      distanceKm,
      durationSeconds: durationSeconds(duration.value),
      avgHeartRate: positive(String(avgHeartRate.value ?? "").replace(/[^0-9.]/g, "")),
      maxHeartRate: positive(String(maxHeartRate.value ?? "").replace(/[^0-9.]/g, "")),
      calories: positive(String(calories.value ?? "").replace(/[^0-9.]/g, "")),
      sampleCount: 1,
      warnings: date.value && !isoDate(date.value) ? ["The activity date could not be interpreted; freshness is unknown."] : []
    }, context));
  }
  if (!activities.length) throw new ImportError("No activity rows were found. Include a date, activity type, distance, or duration column.");
  const warnings = [];
  if (rows.length > 101) warnings.push("Only the first 100 activity rows were previewed.");
  return activities.map((activity, index) => index === 0 && warnings.length ? { ...activity, warnings: [...activity.warnings, ...warnings] } : activity);
}

export function parseActivityFile({ fileName, dataBase64 }) {
  const safeName = cleanFileName(fileName);
  const extension = path.extname(safeName).toLowerCase();
  if (!supportedExtensions.has(extension)) throw new ImportError("Choose a .fit, .gpx, .tcx, or .csv file.");
  const buffer = decodePayload(dataBase64);
  const context = { fileName: safeName, extension };
  const parsers = { ".fit": parseFit, ".gpx": parseGpx, ".tcx": parseTcx, ".csv": parseCsv };
  const activities = parsers[extension](buffer, context);
  return {
    file: { name: safeName, format: extension.slice(1).toUpperCase(), bytes: buffer.length, rawStored: false },
    activityCount: activities.length,
    activities,
    disclosure: "Preview only. Raw bytes are not stored. Confirm import to save these normalized summaries locally."
  };
}

export function normalizeCheckin(input = {}) {
  const pain = Number(input.pain);
  const rpe = input.rpe === "" || input.rpe === undefined || input.rpe === null ? null : Number(input.rpe);
  const energy = Number(input.energy);
  const sleepFeel = Number(input.sleepFeel);
  if (!Number.isInteger(pain) || pain < 0 || pain > 10) throw new ImportError("Pain must be a whole number from 0 to 10.", 422);
  if (rpe !== null && (!Number.isInteger(rpe) || rpe < 1 || rpe > 10)) throw new ImportError("RPE must be a whole number from 1 to 10.", 422);
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) throw new ImportError("Energy must be a whole number from 1 to 5.", 422);
  if (!Number.isInteger(sleepFeel) || sleepFeel < 1 || sleepFeel > 5) throw new ImportError("Sleep feel must be a whole number from 1 to 5.", 422);
  const capturedAt = isoDate(input.capturedAt) || new Date().toISOString();
  return {
    source: "manual",
    capturedAt,
    pain,
    rpe,
    energy,
    sleepFeel,
    note: String(input.note || "").trim().slice(0, 500),
    freshness: freshnessFor(capturedAt)
  };
}

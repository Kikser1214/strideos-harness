import test from "node:test";
import assert from "node:assert/strict";
import { Encoder, Profile } from "@garmin/fitsdk";
import { ImportError, normalizeCheckin, parseActivityFile } from "../src/imports.mjs";

function encoded(text) {
  return Buffer.from(text).toString("base64");
}

test("GPX import calculates distance, duration, heart rate, and freshness", () => {
  const gpx = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Easy morning</name><type>running</type><trkseg>
    <trkpt lat="41.9981" lon="21.4254"><time>2026-07-18T05:00:00Z</time><extensions><hr>132</hr></extensions></trkpt>
    <trkpt lat="42.0031" lon="21.4254"><time>2026-07-18T05:05:00Z</time><extensions><hr>142</hr></extensions></trkpt>
  </trkseg></trk></gpx>`;
  const result = parseActivityFile({ fileName: "morning.gpx", dataBase64: encoded(gpx) });
  assert.equal(result.activityCount, 1);
  assert.equal(result.file.rawStored, false);
  assert.equal(result.activities[0].durationSeconds, 300);
  assert.ok(result.activities[0].distanceKm > 0.5);
  assert.equal(result.activities[0].avgHeartRate, 137);
});

test("TCX import reads recorded distance and time", () => {
  const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>2026-07-17T06:00:00Z</Id><Lap TotalTimeSeconds="600"><Track>
    <Trackpoint><Time>2026-07-17T06:00:00Z</Time><DistanceMeters>0</DistanceMeters><HeartRateBpm><Value>130</Value></HeartRateBpm></Trackpoint>
    <Trackpoint><Time>2026-07-17T06:10:00Z</Time><DistanceMeters>2000</DistanceMeters><HeartRateBpm><Value>150</Value></HeartRateBpm></Trackpoint>
  </Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
  const activity = parseActivityFile({ fileName: "run.tcx", dataBase64: encoded(tcx) }).activities[0];
  assert.equal(activity.distanceKm, 2);
  assert.equal(activity.durationSeconds, 600);
  assert.equal(activity.maxHeartRate, 150);
});

test("CSV import supports several normalized activity rows", () => {
  const csv = `date,type,distance_km,duration,avg_hr\n2026-07-16T06:00:00Z,Run,5.2,00:30:00,144\n2026-07-17T06:00:00Z,Walk,2,00:25:00,102\n`;
  const result = parseActivityFile({ fileName: "history.csv", dataBase64: encoded(csv) });
  assert.equal(result.activityCount, 2);
  assert.equal(result.activities[0].durationSeconds, 1800);
  assert.equal(result.activities[1].sport, "Walk");
});

test("CSV import recognizes explicit duration_minutes columns", () => {
  const csv = "date,name,distance_km,duration_minutes\n2026-07-18T07:00:00Z,Easy run,4.2,31\n";
  const result = parseActivityFile({ fileName: "minutes.csv", dataBase64: encoded(csv) });
  assert.equal(result.activities[0].durationSeconds, 1860);
  assert.match(result.activities[0].summary, /31 min/);
});

test("official Garmin SDK decodes a generated FIT activity", () => {
  const encoder = new Encoder();
  const start = new Date("2026-07-18T05:00:00Z");
  const end = new Date("2026-07-18T05:30:00Z");
  encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: "development", product: 1, timeCreated: start, type: "activity" });
  encoder.onMesg(Profile.MesgNum.SESSION, { timestamp: end, startTime: start, sport: "running", totalDistance: 5000, totalTimerTime: 1800, avgHeartRate: 145, maxHeartRate: 164, totalCalories: 360 });
  encoder.onMesg(Profile.MesgNum.ACTIVITY, { timestamp: end, totalTimerTime: 1800, numSessions: 1, type: "manual", event: "activity", eventType: "stop" });
  const bytes = encoder.close();
  const activity = parseActivityFile({ fileName: "activity.fit", dataBase64: Buffer.from(bytes).toString("base64") }).activities[0];
  assert.equal(activity.format, "FIT");
  assert.equal(activity.sport, "running");
  assert.equal(activity.distanceKm, 5);
  assert.equal(activity.durationSeconds, 1800);
});

test("imports reject unsupported files and XML entities", () => {
  assert.throws(() => parseActivityFile({ fileName: "notes.txt", dataBase64: encoded("hello") }), ImportError);
  assert.throws(() => parseActivityFile({ fileName: "route.gpx", dataBase64: encoded('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///secret">]><gpx>&y;</gpx>') }), /external entities/i);
});

test("manual check-ins enforce bounded subjective signals", () => {
  const checkin = normalizeCheckin({ pain: 2, rpe: 5, energy: 3, sleepFeel: 4, note: "Heavy legs" });
  assert.equal(checkin.source, "manual");
  assert.equal(checkin.pain, 2);
  assert.throws(() => normalizeCheckin({ pain: 11, energy: 3, sleepFeel: 3 }), /Pain/);
});

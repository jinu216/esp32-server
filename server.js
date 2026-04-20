const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ================= MONGO =================
mongoose.connect(
  "mongodb+srv://Safepark:Danlesco%40123@safepark.ad1to8r.mongodb.net/?retryWrites=true&w=majority"
)
.then(() => console.log("MongoDB Connected 🚀"))
.catch(err => console.log("Mongo Error:", err));

// ================= SCHEMA (EXISTING SENSOR DATA) =================
const Schema = new mongoose.Schema({
  device_id: String,
  node_id: Number,
  type: String,
  x: Number,
  y: Number,
  z: Number,
  magnitude: Number,
  event: Number,
  baseline: Number,
  noise: Number,
  scratch_th: Number,
  hit_th: Number,
  timestamp: Number,
  createdAt: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", Schema);

// ================= NEW SCHEMA (MOTION + VIDEO EVENTS) =================
const MotionSchema = new mongoose.Schema({
  device: String,
  event: String,
  time: Date,
  status: String,
  videoFile: String,
  createdAt: { type: Date, default: Date.now }
});

const MotionEvent = mongoose.model("MotionEvent", MotionSchema);

// ================= MEMORY =================
let latest = {};
let clients = [];
let lastSeen = {};

// ================= WEBSOCKET =================
wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

function broadcast(data){
  clients.forEach(c => {
    if (c.readyState === 1) {
      c.send(JSON.stringify(data));
    }
  });
}

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.send("Server OK 🚀");
});

// ================= LIVE =================
app.get("/live", (req, res) => {
  res.json(latest);
});

// ================= LOGS =================
app.get("/logs", async (req, res) => {
  try {
    const data = await Data.find().sort({ createdAt: -1 }).limit(100);
    res.json(data);
  } catch (e) {
    res.status(500).send("DB Error");
  }
});

// ================= STATUS =================
app.get("/status", (req, res) => {
  let now = Date.now();
  let status = {};

  for (let d in lastSeen) {
    let diff = now - lastSeen[d];

    status[d] =
      diff < 3000 ? "ONLINE" :
      diff < 5000 ? "WARNING" :
      "OFFLINE";
  }

  res.json(status);
});

// ================= SENSOR DATA INPUT (EXISTING) =================
app.post("/data", async (req, res) => {
  try {
    const d = req.body;
    d.timestamp = Date.now();

    latest = d;
    lastSeen[d.device_id] = Date.now();

    await Data.create(d);

    broadcast(d);

    if (d.event === 2) {
      console.log("🚨 HIT DETECTED");
    }

    res.send("OK");
  } catch (e) {
    console.log(e);
    res.status(500).send("Error");
  }
});


// ================= 🚨 NEW: MOTION EVENT FROM ESP32-CAM =================
app.post("/motion-event", async (req, res) => {
  try {
    const { device } = req.body;

    console.log("🚨 MOTION DETECTED:", device);

    const event = await MotionEvent.create({
      device,
      event: "motion_detected",
      time: new Date(),
      status: "triggered"
    });

    // 👉 Trigger external recording system (PC / Raspberry Pi)
    await fetch("http://YOUR-RECORDER-IP:5001/start-recording", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event._id })
    }).catch(err => {
      console.log("Recorder trigger error:", err.message);
    });

    res.json({ success: true, eventId: event._id });

  } catch (err) {
    console.log(err);
    res.status(500).send("Motion Error");
  }
});


// ================= 🎥 NEW: RECORDING DONE CALLBACK =================
app.post("/recording-done", async (req, res) => {
  try {
    const { eventId, file } = req.body;

    await MotionEvent.findByIdAndUpdate(eventId, {
      status: "recorded",
      videoFile: file
    });

    console.log("🎥 Video saved:", file);

    res.json({ ok: true });

  } catch (err) {
    console.log(err);
    res.status(500).send("Update Error");
  }
});


// ================= CLEANUP =================
setInterval(() => {
  clients = clients.filter(c => c.readyState === 1);
}, 30000);

// ================= START =================
server.listen(10000, () => {
  console.log("SafePark Server Running 🚀");
});
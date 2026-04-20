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
mongoose.connect("mongodb+srv://Safepark:Danlesco%40123@safepark.ad1to8r.mongodb.net/?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Connected 🚀"))
  .catch(err => console.log("Mongo Error:", err));

// ================= SCHEMA =================
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

// ================= MEMORY =================
let latest = {};
let clients = [];
let lastSeen = {};

// ================= TELEGRAM =================
const BOT_TOKEN = "YOUR_BOT_TOKEN";
const CHAT_ID = "YOUR_CHAT_ID";

// FIX: native fetch safe for Node 22
async function sendAlert(msg){
  try{
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: msg
      })
    });
  }catch(e){
    console.log("Telegram Error:", e.message);
  }
}

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

// ================= ROUTES =================
app.get("/health", (req, res) => {
  res.send("Server OK 🚀");
});

app.get("/live", (req, res) => {
  res.json(latest);
});

app.get("/logs", async (req, res) => {
  try {
    const data = await Data.find().sort({ createdAt: -1 }).limit(100);
    res.json(data);
  } catch (e) {
    res.status(500).send("DB Error");
  }
});

// ================= DATA RECEIVE =================
app.post("/data", async (req, res) => {
  try {
    const d = req.body;
    d.timestamp = Date.now();

    latest = d;
    lastSeen[d.device_id] = Date.now();

    await Data.create(d);

    broadcast(d);

    if (d.event === 2) {
      sendAlert(`🚨 HIT DETECTED on ${d.device_id}`);
    }

    res.send("OK");
  } catch (e) {
    console.log("POST error:", e);
    res.status(500).send("Error");
  }
});

// ================= DEVICE STATUS =================
app.get("/status", (req, res) => {
  let now = Date.now();
  let status = {};

  for (let k in lastSeen) {
    status[k] = (now - lastSeen[k]) < 3000 ? "ONLINE" : "OFFLINE";
  }

  res.json(status);
});

// ================= AUTO CLEAN (IMPORTANT) =================
// remove stale WS connections every 30 sec
setInterval(() => {
  clients = clients.filter(c => c.readyState === 1);
}, 30000);

// ================= START =================
server.listen(10000, () => {
  console.log("SafePark Server Running 🚀");
});
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= GLOBAL STORAGE =================
let latestData = {
    device_id: "NO_DATA",
    x: 0,
    y: 0,
    z: 0,
    magnitude: 0,
    event: 0,
    timestamp: 0
};

let eventLogs = [];
let calibration = {};
let lastSeen = Date.now();

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
    const diff = Date.now() - lastSeen;

    let status = "ONLINE";

    if (diff > 5000) {
        status = "ESP32 OFFLINE";
    }

    res.json({
        server: "ONLINE",
        esp32: status,
        lastSeen: diff + " ms ago"
    });
});

// ================= RECEIVE DATA =================
app.post("/data", (req, res) => {
    const data = req.body;

    console.log("Incoming Data:", data);

    latestData = {
        ...data,
        timestamp: Date.now()
    };

    lastSeen = Date.now();

    // store logs only for LIVE
    if (data.type === "LIVE") {
        eventLogs.push(latestData);
        if (eventLogs.length > 200) eventLogs.shift();
    }

    // calibration store
    if (data.type === "CALIBRATION") {
        calibration = data;
    }

    res.json({ status: "OK" });
});

// ================= LATEST DATA =================
app.get("/latest_data", (req, res) => {
    res.json(latestData);
});

// ================= EVENTS =================
app.get("/events", (req, res) => {
    res.json(eventLogs);
});

// ================= CALIBRATION =================
app.get("/calibration", (req, res) => {
    res.json(calibration);
});

// ================= ROOT =================
app.get("/", (req, res) => {
    res.send("SafePark Server Running 🚀");
});

// ================= START =================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
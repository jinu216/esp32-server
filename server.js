const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());

// ================= HTTP + WS SERVER =================
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ================= STORAGE =================
let latestData = {};
let calibrationData = {};
let calibrationLogs = [];
let logs = [];

let lastSeen = null;
let espStartTime = null;

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("ESP32 Server Running with WebSocket 🚀");
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
    res.send("OK");
});

// ================= RECEIVE DATA =================
app.post("/data", (req, res) => {
    const data = req.body;

    console.log("Incoming Data:", data);

    // ================= ESP STATUS TRACK =================
    lastSeen = Date.now();

    if (!espStartTime) {
        espStartTime = Date.now();
    }

    // ================= LIVE DATA =================
    if (data.type === "LIVE") {
        latestData = {
            ...data,
            received_at: new Date().toISOString()
        };

        // PUSH TO ALL CLIENTS (REAL TIME)
        io.emit("live", latestData);
    }

    // ================= CALIBRATION =================
    if (data.type === "CALIBRATION") {
        const cal = {
            ...data,
            received_at: new Date().toISOString()
        };

        calibrationData = cal;
        calibrationLogs.push(cal);

        io.emit("calibration", cal);
    }

    // ================= LOG STORAGE =================
    logs.push({
        ...data,
        received_at: new Date().toISOString()
    });

    if (logs.length > 200) logs.shift();

    io.emit("log", data);

    res.status(200).send("OK");
});

// ================= LIVE DATA =================
app.get("/live", (req, res) => {
    res.json(latestData);
});

// ================= CALIBRATION =================
app.get("/calibration", (req, res) => {
    res.json(calibrationData);
});

// ================= CALIBRATION LOGS =================
app.get("/calibration_logs", (req, res) => {
    res.json(calibrationLogs);
});

// ================= LOGS =================
app.get("/logs", (req, res) => {
    res.json(logs);
});

// ================= ESP STATUS =================
app.get("/status", (req, res) => {
    const now = Date.now();
    const isOnline = lastSeen && (now - lastSeen < 3000);

    res.json({
        status: isOnline ? "ON" : "OFF",
        lastSeen
    });
});

// ================= UPTIME =================
app.get("/uptime", (req, res) => {
    if (!espStartTime) {
        return res.json({ uptime_sec: 0 });
    }

    res.json({
        uptime_sec: Math.floor((Date.now() - espStartTime) / 1000)
    });
});

// ================= SOCKET CONNECTION =================
io.on("connection", (socket) => {
    console.log("Client connected 🔌");

    // send latest state instantly
    socket.emit("live", latestData);
    socket.emit("calibration", calibrationData);
    socket.emit("log", logs.slice(-20));

    socket.on("disconnect", () => {
        console.log("Client disconnected ❌");
    });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
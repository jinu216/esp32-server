const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

// ================= SERVER =================
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 10000;

// ================= MONGODB =================
// 👉 Replace with your MongoDB Atlas URL
const MONGO_URL = "mongodb+srv://Safepark:Danlesco%40123@safepark.ad1to8r.mongodb.net/?appName=Safepark";

mongoose.connect(MONGO_URL)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log(err));

// ================= SCHEMA =================
const LogSchema = new mongoose.Schema({
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

const Log = mongoose.model("Log", LogSchema);

// ================= MEMORY CACHE =================
let latestData = {};
let calibrationData = {};
let lastSeen = Date.now();

// ================= HEALTH =================
app.get("/health", (req, res) => {
    let diff = Date.now() - lastSeen;

    if (diff > 3000) {
        return res.send("ESP32 OFFLINE ❌");
    }

    res.send("Server OK ✅");
});

// ================= RECEIVE DATA =================
app.post("/data", async (req, res) => {

    const data = req.body;
    lastSeen = Date.now();

    console.log("Incoming:", data);

    // ================= TYPE HANDLING =================
    if (data.type === "LIVE") {
        latestData = data;
    }

    if (data.type === "CALIBRATION") {
        calibrationData = data;
    }

    // Save ALL to MongoDB
    try {
        await Log.create(data);
    } catch (err) {
        console.log("DB Error:", err);
    }

    // ================= WEBSOCKET PUSH =================
    io.emit("live", latestData);
    io.emit("calibration", calibrationData);
    io.emit("log", data);

    res.send({ status: "OK" });
});

// ================= API ENDPOINTS =================
app.get("/live", (req, res) => {
    res.json(latestData);
});

app.get("/calibration", (req, res) => {
    res.json(calibrationData);
});

app.get("/logs", async (req, res) => {
    const logs = await Log.find().sort({ _id: -1 }).limit(50);
    res.json(logs);
});

// ================= ROOT =================
app.get("/", (req, res) => {
    res.send("SafePark Server Running 🚀");
});

// ================= SOCKET =================
io.on("connection", (socket) => {
    console.log("Client Connected 🔌");

    // send initial data
    socket.emit("live", latestData);
    socket.emit("calibration", calibrationData);

    socket.on("disconnect", () => {
        console.log("Client Disconnected ❌");
    });
});

// ================= START =================
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
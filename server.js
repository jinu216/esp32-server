const express = require("express");
const app = express();

app.use(express.json());

// ================= STORAGE =================
let latestData = {};
let calibrationData = {};
let logs = [];

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("ESP32 Server Running");
});

// ================= RECEIVE DATA =================
app.post("/data", (req, res) => {
    const data = req.body;

    console.log("Incoming Data:", data);

    if (data.type === "CALIBRATION") {
        calibrationData = data;
    }

    if (data.type === "LIVE") {
        latestData = data;
    }

    logs.push(data);
    if (logs.length > 100) logs.shift();

    res.status(200).send("OK");
});

// ================= GET LIVE =================
app.get("/live", (req, res) => {
    res.json(latestData);
});

// ================= GET CALIBRATION =================
app.get("/calibration", (req, res) => {
    res.json(calibrationData);
});

// ================= GET LOGS =================
app.get("/logs", (req, res) => {
    res.json(logs);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
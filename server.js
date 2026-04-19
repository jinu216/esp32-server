const express = require("express");
const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());

// CORS FIX (VERY IMPORTANT for HTML)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    next();
});

// ================= STORAGE =================
let latestData = {};
let calibrationData = {};
let logs = [];

// ================= HEALTH CHECK (IMPORTANT FOR HTML) =================
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        time: Date.now()
    });
});

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("ESP32 Server Running 🚀");
});

// ================= RECEIVE DATA FROM ESP32 =================
app.post("/data", (req, res) => {
    const data = req.body;

    console.log("Incoming Data:", data);

    // Always store latest live data
    if (data.type === "LIVE") {
        latestData = data;
    }

    // Store calibration
    if (data.type === "CALIBRATION") {
        calibrationData = data;
    }

    // Store logs
    logs.push({
        ...data,
        timestamp: Date.now()
    });

    if (logs.length > 200) logs.shift();

    res.status(200).send("OK");
});

// ================= GET LIVE DATA =================
app.get("/live", (req, res) => {
    res.json(latestData || {});
});

// ================= GET CALIBRATION =================
app.get("/calibration", (req, res) => {
    res.json(calibrationData || {});
});

// ================= GET LOGS =================
app.get("/logs", (req, res) => {
    res.json(logs || []);
});

// ================= DELETE ALL LOGS =================
app.delete("/delete_all", (req, res) => {
    logs = [];
    res.json({ message: "All logs deleted" });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
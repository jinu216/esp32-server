const express = require("express");
const app = express();

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server is LIVE 🚀");
});

// Receive ESP32 data
app.post("/data", (req, res) => {
  const data = req.body;

  console.log("Incoming Data:");
  console.log(data);

  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
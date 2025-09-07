const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const programRoutes = require("./routes/program");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", programRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/onehandcoder")
  .then(() => {
    console.log("✅ MongoDB connected");

    // Start server with auto-fallback
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        const newPort = PORT + 1;
        console.log(`⚠️ Port ${PORT} is busy. Trying port ${newPort}...`);
        app.listen(newPort, () => {
          console.log(`🚀 Server running on http://localhost:${newPort}`);
        });
      } else {
        console.error("❌ Server error:", err);
      }
    });

  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

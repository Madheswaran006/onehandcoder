require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const User = require("./models/User");

const app = express();
app.use(express.json());

// === CORS ===
// Allow only the frontend origin in production
const FRONTEND_URL = process.env.FRONTEND_URL || "*";
app.use(cors({ origin: FRONTEND_URL }));

// === MongoDB connection ===
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌ MONGO_URI not set in environment.");
  process.exit(1);
}

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message || err);
    process.exit(1);
  });

// === Helper: Extract token ===
function extractToken(req) {
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (auth) {
    const parts = auth.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
    return auth;
  }
  return req.body?.token || req.query?.token;
}

// === Middleware: Require auth ===
async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: invalid token" });
  }
}

// ================== Routes ==================


app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "username and password required" });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, email: email || "" });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "6h" });

    res.json({ success: true, message: "User registered successfully", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed", error: err.message });
  }
});


// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ success: false, message: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "6h" });
res.json({ success: true, message: "User registered successfully", token });

    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Login failed", error: err.message });
  }
});

// Profile
app.post("/api/profile", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      username: user.username,
      email: user.email,
      subscription: user.subscription,
      progress: user.progress || 0,
      history: user.history || [],
      completedCourses: user.completedCourses || [],
      savedPrograms: user.savedPrograms || [],
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load profile", error: err.message });
  }
});

// Update progress
app.post("/api/progress", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { code = "Practice session", progress = 0 } = req.body;

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.progress = Math.max(0, Math.min(100, Number(progress)));
    user.history = user.history || [];
    user.history.push({ code, date: new Date() });

    await user.save();
    res.json({ success: true, message: "Progress updated", progress: user.progress });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Could not update progress", error: err.message });
  }
});

// Save program
app.post("/api/save-program", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { title, content } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "title and content required" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.savedPrograms.push({ title, content, date: new Date() });
    await user.save();

    res.json({
      success: true,
      message: "Program saved",
      savedPrograms: user.savedPrograms,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Could not save program", error: err.message });
  }
});

// Mark course completed
app.post("/api/complete-course", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { courseName } = req.body;
    if (!courseName) {
      return res
        .status(400)
        .json({ success: false, message: "courseName required" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.completedCourses = user.completedCourses || [];
    if (!user.completedCourses.includes(courseName)) {
      user.completedCourses.push(courseName);
    }

    await user.save();
    res.json({
      success: true,
      message: "Course marked completed",
      completedCourses: user.completedCourses,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Could not mark course", error: err.message });
  }
});

// Get settings
app.get("/api/settings", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const json = JSON.stringify(user.savedPrograms || []);
    const bytes = Buffer.byteLength(json, "utf8");
    const usedMB = Math.ceil(bytes / (1024 * 1024));

    res.json({
      success: true,
      username: user.username,
      email: user.email || "",
      subscription: user.subscription || "Free",
      usedStorageMB: usedMB,
      maxStorageMB: 500,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Could not load settings", error: err.message });
  }
});

// Update account
app.post("/api/settings/update", requireAuth, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.json({ success: true, message: "Account updated" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Update failed", error: err.message });
  }
});

// Reset progress
app.post("/api/settings/reset-progress", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.progress = 0;
    user.history = [];
    await user.save();

    res.json({ success: true, message: "Progress reset" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Reset failed", error: err.message });
  }
});

// === Serve frontend in production ===
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "..", "frontend");
  app.use(express.static(frontendPath));
  app.get("*", (req, res) =>
    res.sendFile(path.join(frontendPath, "index.html"))
  );
}

// === Start server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

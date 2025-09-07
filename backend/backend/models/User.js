const mongoose = require("mongoose");

const ProgramSchema = new mongoose.Schema({
  title: String,
  content: String,
  date: { type: Date, default: Date.now }
});

const HistorySchema = new mongoose.Schema({
  code: String,
  date: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, default: "" },
  password: { type: String, required: true },
  subscription: { type: String, default: "Free" },
  progress: { type: Number, default: 0 },
  history: [HistorySchema],
  completedCourses: [String],
  savedPrograms: [ProgramSchema]
});

module.exports = mongoose.model("User", UserSchema);

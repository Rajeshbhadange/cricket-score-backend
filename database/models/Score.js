const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  overNo: { type: Number, default: 0 },
  ballNo: { type: Number, default: 0 },
  currentOver: {
    type: Object,
    default: { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" },
  },
  allOvers: { type: Array, default: [] },
});

module.exports = mongoose.model("Score", ScoreSchema);

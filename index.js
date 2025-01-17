const express = require("express");
const http = require("http");
const morgan = require("morgan");
const { Server } = require("socket.io");
require("dotenv").config();
const PORT = 5000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: process.env.FRONTEND_URL,
});
const cors = require("cors");
const ScoreModel = require("./database/models/Score");
const connectToDB = require("./database/Connectdb");
const jwt = require("jsonwebtoken");

const secretKey = process.env.SECRET_KEY;
connectToDB();

app.use(cors());
app.use(morgan("dev"));

let ID = "";

app.use(express.json());

function calculateMoveValue(value) {
  if (200 < value && value < 300) return 10;
  if (301 < value && value < 340) return 20;
  if (340 < value && value < 400) return 30;
  if (401 < value && value < 500) return 20;
  if (501 < value && value < 600) return 60;
  if (600 < value && value < 700) return 70;
  if (701 < value && value < 800) return 80;
  if (801 < value && value < 899) return 100;
  if (900 < value && value < 1100) return 130;
  if (1100 < value && value < 1500) return 120;

  return 0;
}

io.on("connection", (socket) => {
  console.log("A user connected to the server.");

  socket.on("getmatchId", () => {
    io.emit("id", ID);
  });

  socket.on("getmatchIdFromServe", () => {
    socket.emit("sendingId", ID);
  });

  socket.on("startingNewMatchFromAdmin", () => {
    ID = "";
    console.log("A new match has started.");
    socket.broadcast.emit("startingNewMatchToUser");
  });

  socket.on("publishscore", async (data) => {
    socket.broadcast.emit("loading", true);
    try {
      const {
        currentBall,
        value,
        widthValue,
        wickets,
        matchId,
        moveValue,
        overNo,
      } = data;

      if (!matchId && ID == "") {
        let overArr = [{ 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" }];
        overArr[overNo][currentBall] = value;
        let Overs = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" };
        Overs[currentBall] = value;

        const scoreData = {
          totalRuns: value === "Out" ? 0 : value,
          overNo,
          ballNo: currentBall + 1,
          totalWickets: value === "Out" ? wickets + 1 : 0,
          currentOver: Overs,
          allOvers: overArr,
          moveValue: calculateMoveValue(widthValue),
        };

        const storedScore = await ScoreModel.create(scoreData);
        data.matchId = storedScore._id;
        ID = storedScore._id;
        socket.emit("matchId", storedScore._id);
        console.log("New match data created with ID:", storedScore._id);
      } else {
        let sId = matchId ? matchId : ID;
        const storedScore = await ScoreModel.findById({ _id: sId });
        let recentOvers = storedScore.allOvers;
        const storedOver =
          currentBall === 5
            ? { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" }
            : storedScore.currentOver;
        let recentOverNo = storedScore.overNo;
        currentBall !== 5 ? (storedOver[currentBall] = value) : "";
        let ball = currentBall === 5 ? 0 : currentBall + 1;
        currentBall === 5 ? (recentOverNo += 1) : "";
        currentBall === 5
          ? recentOvers.push({ 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" })
          : "";
        recentOvers[overNo][currentBall] = value;

        if (value === "Out") {
          let newWickets = storedScore.totalWickets + 1;
          await ScoreModel.findByIdAndUpdate(
            { _id: sId },
            {
              totalWickets: newWickets,
              currentOver: storedOver,
              overNo: recentOverNo,
              ballNo: ball,
              allOvers: recentOvers,
              moveValue,
            }
          );
        } else {
          let newScore = storedScore.totalRuns + value;
          await ScoreModel.findByIdAndUpdate(
            { _id: sId },
            {
              totalRuns: newScore,
              currentOver: storedOver,
              overNo: recentOverNo,
              ballNo: ball,
              allOvers: recentOvers,
              moveValue,
            }
          );
        }

        data.matchId = sId;

        if (!matchId) {
          socket.emit("matchId", ID);
        }
        console.log("Match data updated successfully.");
      }

      setTimeout(() => {
        socket.broadcast.emit("score", data);
      }, 1000);
    } catch (err) {
      console.error("Error publishing score:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected from the server.");
  });
});

app.get("/getMatchData", async (req, res) => {
  try {
    const { id } = req.headers;
    const matchData = await ScoreModel.findById(id);
    if (matchData) {
      return res.json({ success: true, matchData });
    } else {
      return res.json({ success: false, message: "Match data not found." });
    }
  } catch (err) {
    console.error("Error fetching match data:", err.message);
    return res.json({ success: false, message: err.message });
  }
});

// Admin login
app.post("/adminlogin", (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === "admin@gmail.com" && password === "pass@123") {
      const token = jwt.sign({ email }, secretKey);
      res.json({ success: true, token });
      console.log("Admin logged in successfully.");
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }
  } catch (err) {
    console.error("Error during admin login:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.get("/", (req, res) => {
  res.json("Successfully connected to the server.");
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

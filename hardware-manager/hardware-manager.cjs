const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5058;

let printProcess = null;
let scaleProcess = null;

const ROOT_DIR = path.resolve(__dirname, "..", "..");

const PRINT_DIR = path.join(ROOT_DIR, "print-bridge");
const SCALE_DIR = path.join(ROOT_DIR, "scale-bridge");

function startBridge(type) {
  if (type === "print") {
    if (printProcess) return { ok: true, message: "Print bridge already running" };

printProcess = spawn("powershell.exe", [
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  `cd "${PRINT_DIR}"; node print-bridge.js`
], {
  stdio: "inherit",
});

printProcess.on("error", (err) => {
  console.log("Print bridge start error:", err.message);
  printProcess = null;
});

    printProcess.on("exit", () => {
      printProcess = null;
    });

    return { ok: true, message: "Print bridge started" };
  }

  if (type === "scale") {
    if (scaleProcess) return { ok: true, message: "Scale bridge already running" };

  scaleProcess = spawn("powershell.exe", [
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  `cd "${SCALE_DIR}"; node scale-bridge.js`
], {
  stdio: "inherit",
});

scaleProcess.on("error", (err) => {
  console.log("Scale bridge start error:", err.message);
  scaleProcess = null;
});


    scaleProcess.on("exit", () => {
      scaleProcess = null;
    });

    return { ok: true, message: "Scale bridge started" };
  }

  return { ok: false, message: "Invalid bridge type" };
}

function stopBridge(type) {
  if (type === "print") {
    if (printProcess) {
      printProcess.kill();
      printProcess = null;
    }
    return { ok: true, message: "Print bridge stopped" };
  }

  if (type === "scale") {
    if (scaleProcess) {
      scaleProcess.kill();
      scaleProcess = null;
    }
    return { ok: true, message: "Scale bridge stopped" };
  }

  return { ok: false, message: "Invalid bridge type" };
}

app.get("/status", (req, res) => {
  res.json({
    ok: true,
    print: !!printProcess,
    scale: !!scaleProcess,
  });
});

app.post("/start/:type", (req, res) => {
  res.json(startBridge(req.params.type));
});

app.post("/stop/:type", (req, res) => {
  res.json(stopBridge(req.params.type));
});

app.listen(PORT, () => {
  console.log(`Hardware Manager running on http://localhost:${PORT}`);
});
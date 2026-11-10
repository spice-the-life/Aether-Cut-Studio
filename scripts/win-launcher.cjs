const { exec } = require('child_process');

const APP_URL = "https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app";

console.log("====================================================================");
console.log("               AetherCut Studio - Desktop Workstation");
console.log("       Professional Video Editing & VFX Compositing Workstation");
console.log("====================================================================");
console.log("");
console.log("Launching standalone desktop workstation window...");

// Try launching in dedicated window using Microsoft Edge (available on Windows 10 & 11)
exec(`start msedge --app="${APP_URL}" --window-size=1440,900 --enable-gpu-rasterization --enable-zero-copy || start chrome --app="${APP_URL}" --window-size=1440,900 --enable-gpu-rasterization || start "" "${APP_URL}"`, (err) => {
  if (err) {
    console.error("Launch error:", err);
  } else {
    console.log("[OK] AetherCut Studio is running!");
  }
  setTimeout(() => process.exit(0), 1000);
});

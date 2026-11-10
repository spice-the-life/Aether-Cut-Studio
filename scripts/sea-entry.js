const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const APP_URL = "https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app";

console.log("====================================================================");
console.log("              AetherCut Studio - Desktop Workstation");
console.log("      Professional Video Editing & VFX Compositing Workstation");
console.log("====================================================================");
console.log("");
console.log("Launching standalone desktop workstation window...");

// Create desktop shortcut on Windows
try {
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const shortcutPath = path.join(desktopPath, 'AetherCut Studio.url');
  if (fs.existsSync(desktopPath) && !fs.existsSync(shortcutPath)) {
    fs.writeFileSync(shortcutPath, `[InternetShortcut]\nURL=${APP_URL}\nIconIndex=0\n`);
    console.log("[OK] Created Desktop Shortcut: AetherCut Studio");
  }
} catch (e) {
  // ignore
}

// Launch in dedicated standalone application window using Microsoft Edge or Chrome
const cmd = `start msedge --app="${APP_URL}" --window-size=1440,900 --enable-gpu-rasterization --enable-zero-copy || start chrome --app="${APP_URL}" --window-size=1440,900 --enable-gpu-rasterization || start "" "${APP_URL}"`;

exec(cmd, (err) => {
  if (err) {
    console.error("Launch error:", err);
  } else {
    console.log("[OK] AetherCut Studio is running successfully!");
  }
  setTimeout(() => process.exit(0), 1200);
});

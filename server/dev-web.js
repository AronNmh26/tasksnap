// One-touch web dev: starts the Hugging Face proxy and Expo web.
// Usage: npm run dev:web

const { spawn } = require("child_process");

function run(command, args, name) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[dev-web] ${name} exited with signal ${signal}`);
    } else {
      console.log(`[dev-web] ${name} exited with code ${code}`);
    }
  });

  return child;
}

// Start proxy (reads .env automatically in server/hf-proxy.js)
run("node", ["server/hf-proxy.js"], "proxy");

// Start Expo web with cache cleared so env changes are applied.
// Using npx keeps it working even if expo isn't installed globally.
run("npx", ["expo", "start", "--web", "-c"], "expo-web");

console.log("[dev-web] Started proxy + Expo web. Press Ctrl+C to stop.");

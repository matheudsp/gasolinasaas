#!/usr/bin/env node

/**
 * Setup Cloudflare Workers Secrets
 * This script helps you set up production secrets using wrangler
 */

import { exec } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, "..");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}→${colors.reset} ${msg}`),
};

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

/**
 * Set a secret using wrangler
 */
async function setSecret(secretName, secretValue) {
  if (!secretValue || secretValue.trim() === "") {
    log.warning(`Skipping ${secretName} (empty value)`);
    return;
  }

  try {
    log.step(`Setting ${secretName}...`);
    await execAsync(
      `echo "${secretValue}" | wrangler secret put ${secretName}`,
      {
        cwd: serverDir,
        shell: true,
      }
    );
    log.success(`${secretName} set successfully`);
  } catch (error) {
    log.error(`Failed to set ${secretName}: ${error.message}`);
    throw error;
  }
}

/**
 * Parse .dev.vars file
 */
function parseDevVars(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const vars = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      vars[key.trim()] = value.trim();
    }
  }

  return vars;
}

/**
 * Main function
 */
async function main() {
  console.log("\n🔐 Cloudflare Workers Secrets Setup");
  console.log("====================================\n");

  // Check if wrangler is available
  try {
    await execAsync("wrangler --version", { cwd: serverDir });
  } catch {
    log.error("wrangler is not installed or not in PATH");
    console.log("   Run: npm install -g wrangler");
    process.exit(1);
  }

  log.info(
    "This script will help you set production secrets for your Worker.\n"
  );

  const prodVarsPath = join(serverDir, ".prod.vars");
  const devVarsPath = join(serverDir, ".dev.vars");
  const hasProdVars = existsSync(prodVarsPath);
  const hasDevVars = existsSync(devVarsPath);

  let secrets = {};
  let useFile = false;
  let filePath = "";

  // Priority 1: Check for .prod.vars (recommended for production)
  if (hasProdVars) {
    const answer = await question("Read secrets from .prod.vars file? (y/n): ");
    useFile = answer.toLowerCase() === "y";
    filePath = prodVarsPath;
  }
  // Priority 2: Check for .dev.vars (fallback)
  else if (hasDevVars) {
    log.warning(
      "No .prod.vars found. You can create one from .prod.vars.example"
    );
    const answer = await question(
      "Read secrets from .dev.vars instead? (y/n): "
    );
    useFile = answer.toLowerCase() === "y";
    filePath = devVarsPath;
  }

  console.log("");

  if (useFile) {
    const fileName = filePath.includes(".prod.vars")
      ? ".prod.vars"
      : ".dev.vars";
    log.info(`Reading secrets from ${fileName}...\n`);
    secrets = parseDevVars(filePath);
  } else {
    log.info("Enter secrets manually (press Enter to skip):\n");

    secrets.DATABASE_URL = await question("DATABASE_URL: ");
    secrets.DATABASE_URL_POOLER = await question("DATABASE_URL_POOLER: ");
    secrets.BETTER_AUTH_SECRET = await question("BETTER_AUTH_SECRET: ");
    secrets.GITHUB_CLIENT_SECRET = await question("GITHUB_CLIENT_SECRET: ");
    secrets.GOOGLE_CLIENT_SECRET = await question("GOOGLE_CLIENT_SECRET: ");
  }

  console.log("");
  log.step("Setting secrets...\n");

  // Set each secret
  const secretNames = [
    "DATABASE_URL",
    "DATABASE_URL_POOLER",
    "BETTER_AUTH_SECRET",
    "GITHUB_CLIENT_SECRET",
    "GOOGLE_CLIENT_SECRET",
  ];

  for (const secretName of secretNames) {
    await setSecret(secretName, secrets[secretName]);
  }

  console.log("");
  log.success("All secrets have been set successfully!\n");

  console.log("Next steps:");
  console.log("  1. Add non-sensitive public IDs to wrangler.jsonc vars:");
  console.log("     - GITHUB_CLIENT_ID");
  console.log("     - GOOGLE_CLIENT_ID");
  console.log("  2. Deploy your worker: pnpm run deploy\n");

  rl.close();
}

// Run the script
main().catch((error) => {
  log.error(`Script failed: ${error.message}`);
  rl.close();
  process.exit(1);
});

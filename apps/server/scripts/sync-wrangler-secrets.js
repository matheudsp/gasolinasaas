import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseDotenv } from "dotenv";

const parseArgs = () => {
  const result = {};
  for (const argument of process.argv.slice(2)) {
    const trimmed = argument.startsWith("--") ? argument.slice(2) : argument;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      result[trimmed] = "true";
    } else {
      const key = trimmed.slice(0, separatorIndex);
      const value = trimmed.slice(separatorIndex + 1);
      result[key] = value;
    }
  }
  return result;
};

const writeLine = (message) => {
  process.stdout.write(`${message}\n`);
};

const fail = (message) => {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
};

const sanitizeJsonc = (input) => {
  const lines = input.split(/\r?\n/u);
  const cleaned = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//")) {
      continue;
    }
    const commentIndex = line.indexOf("//");
    if (commentIndex === -1) {
      cleaned.push(line);
    } else {
      cleaned.push(line.slice(0, commentIndex));
    }
  }
  return cleaned.join("\n");
};

const options = parseArgs();
const envFile = options["env-file"] ?? ".env";
const envFilePath = join(process.cwd(), envFile);

let envContent;
try {
  envContent = await readFile(envFilePath, "utf8");
} catch (error) {
  fail(`Failed to read environment file at ${envFilePath}: ${error.message}`);
}

const parsedEnv = parseDotenv(envContent);

const onlyKeysSource = options.only;
const secretKeys =
  onlyKeysSource === undefined
    ? Object.keys(parsedEnv)
    : onlyKeysSource
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

if (secretKeys.length === 0) {
  fail("No secret keys were provided or detected.");
}

const secrets = {};
const missingKeys = [];

for (const key of secretKeys) {
  const value = parsedEnv[key];
  if (value === undefined || value.trim().length === 0) {
    missingKeys.push(key);
    continue;
  }
  secrets[key] = value;
}

if (missingKeys.length > 0) {
  fail(`Missing values for: ${missingKeys.join(", ")}`);
}

let workerName = options.worker;
if (workerName === undefined) {
  const configPath = join(
    process.cwd(),
    options["wrangler-config"] ?? "wrangler.jsonc"
  );
  let configContent;
  try {
    configContent = await readFile(configPath, "utf8");
  } catch (error) {
    fail(`Failed to read Wrangler config at ${configPath}: ${error.message}`);
  }
  try {
    const sanitized = sanitizeJsonc(configContent);
    const parsed = JSON.parse(sanitized);
    workerName = parsed.name;
  } catch (error) {
    fail(`Unable to parse Wrangler config: ${error.message}`);
  }
}

if (workerName === undefined || workerName.trim().length === 0) {
  fail(
    "Worker name could not be determined. Use --worker=<name> to provide it explicitly."
  );
}

const dryRun = options["dry-run"] === "true";

if (dryRun) {
  writeLine(`[dry-run] Would sync secrets to ${workerName}.`);
  writeLine(JSON.stringify(secrets, null, 2));
  process.exit(0);
}

const tempDirectory = await mkdtemp(join(tmpdir(), "wrangler-secrets-"));
const tempFilePath = join(tempDirectory, "secrets.json");

await writeFile(tempFilePath, JSON.stringify(secrets));

writeLine(`Syncing ${Object.keys(secrets).length} secrets to ${workerName}...`);

const runBulkUpload = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["wrangler", "secret", "bulk", tempFilePath, "--name", workerName ?? ""],
      { stdio: "inherit" }
    );

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wrangler secret bulk exited with code ${code ?? 1}`));
      }
    });
  });

try {
  await runBulkUpload();
  writeLine("Secrets synced successfully.");
} catch (error) {
  await rm(tempDirectory, { recursive: true, force: true });
  fail(error.message);
}

await rm(tempDirectory, { recursive: true, force: true });

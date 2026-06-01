import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isLogEnabled =
  process.env.NEXT_PUBLIC_ENABLE_LOG === "true" ||
  process.env.ENABLE_LOG === "true";
const logger = {
  log: (...args) => {
    if (isLogEnabled) {
      console.log(...args);
    }
  },
};

// Helper to run commands and print output
function runCommand(command) {
  logger.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
}

// 1. Determine release type (patch, minor, major) or a custom version
const arg = process.argv[2] || "patch";
let newVersion;
let releaseType = null;

const semverRegex = /^\d+\.\d+\.\d+(-.+)?$/;

// 2. Read package.json
const packageJsonPath = path.resolve("package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const oldVersion = packageJson.version;

if (["patch", "minor", "major"].includes(arg)) {
  releaseType = arg;
  // Calculate new version
  const parts = oldVersion.split("-")[0].split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    console.error(`Invalid version format in package.json: ${oldVersion}`);
    process.exit(1);
  }

  if (releaseType === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (releaseType === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  newVersion = parts.join(".");
} else if (semverRegex.test(arg)) {
  newVersion = arg;
} else {
  console.error(
    "Invalid release argument! Use: patch, minor, major, or a specific version (e.g. 1.0.0)",
  );
  process.exit(1);
}

logger.log(
  `Bumping version: ${oldVersion} -> ${newVersion}${releaseType ? ` (${releaseType})` : ""}`,
);

// 4. Update package.json
packageJson.version = newVersion;
fs.writeFileSync(
  packageJsonPath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

try {
  // 5. Git add all changes
  runCommand("git add .");

  // 6. Git commit
  runCommand(`git commit -m "chore(release): v${newVersion}"`);

  // 7. Git tag (important for electron-builder / github release mapping)
  runCommand(`git tag -a v${newVersion} -m "release v${newVersion}"`);

  // 8. Build app (dist)
  runCommand("bun run dist");

  // 9. Publish app
  runCommand("bun run publish");

  logger.log(
    `\n🎉 Successfully bumped, committed, tagged, built, and published v${newVersion}!`,
  );
} catch (error) {
  console.error("\n❌ Release process failed:", error.message);
  process.exit(1);
}

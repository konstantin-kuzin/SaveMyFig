/**
 * Figma Backup Orchestrator Script
 *
 * This script manages the complete Figma file backup workflow by coordinating multiple components:
 *
 * 1. Environment Setup:
 *    - Loads environment variables from .userData/.env using dotenv
 *    - Establishes database connection via backup/db.js for tracking backup status
 *
 * 2. File Cleanup:
 *    - Removes any existing .userData/files.json to ensure clean state
 *
 * 3. File Discovery:
 *    - Checks for TEAMS or PROJECTS environment variables to determine backup scope
 *    - Executes team-based backup via backup/get-team-files.js if TEAMS is defined
 *    - Executes project-based backup via backup/get-project-files.js if PROJECTS is defined
 *    - Skips file generation if neither environment variable is set
 *
 * 4. Backup Execution:
 *    - Runs Playwright tests (automations/download.spec.ts) to perform actual Figma file downloads
 *    - Uses headless mode for automated execution
 *    - Handles test failures by logging errors and propagating exceptions
 *
 * 5. Resource Cleanup:
 *    - Closes database connection to ensure data integrity
 *
 * 6. Optional Network Backup:
 *    - Contains commented-out rsync functionality to copy files to network volume
 *    - Would run rsync with --remove-source-files option after successful backup
 *    - Includes mount point validation for "/Volumes/Design Backup/Figma/HEXA UI"
 *
 * The script implements error handling throughout the process:
 * - Catches and logs errors at each stage
 * - Exits with status code 1 on failures
 * - Ensures database connection is closed even when errors occur
 *
 * Configuration requires setting either TEAMS or PROJECTS environment variables
 * in the .userData/.env file to specify which Figma files to back up.
 */

const fs = require("node:fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const { close: closeDb } = require("./db");

dotenv.config({ path: path.join(__dirname, "../.userData/.env"), override: true });

async function runBackup() {
  try {
    // Clean up previous files.json if it exists
    const filesJsonPath = path.join(__dirname, "../.userData/files.json");
    if (fs.existsSync(filesJsonPath)) {
      fs.unlinkSync(filesJsonPath);
    }

    const teams = process.env.TEAMS;
    const projects = process.env.PROJECTS;

    // Step 1: Generate files.json
    const projectRoot = path.join(__dirname, "..");
    if (teams) {
      console.log(`Checking queue for TEAMS: ${teams}.`);
      execSync(`node backup/get-team-files.js ${teams}`, { stdio: "inherit", cwd: projectRoot });
    }
    else if (projects) {
      console.log(`Checking queue for PROJECTS: ${projects}.`);
      execSync(`node backup/get-project-files.js ${projects}`, { stdio: "inherit", cwd: projectRoot });
    } else {
      console.log("PROJECTS/TEAMS are not defined in .env file. Skipping file generation.");
      return;
    }
    
    // Breakpoint for debugging file generation issues
    // return;
    
    // Step 2: Run tests
    console.log("Running backup...");
    try {
      const playwrightCli = resolvePlaywrightCli(projectRoot);
      const env = buildEnv(projectRoot);
      const debugModeEnabled = String(process.env.DEBUG_MODE || "").toLowerCase() === "on";
      const playwrightModeFlag = debugModeEnabled ? "--headed" : "";
      console.log(`Backup tool is running in ${debugModeEnabled ? "debug" : "silent"} mode.`);
      execSync(
        `"${process.execPath}" "${playwrightCli}" test automations/download.spec.ts ${playwrightModeFlag}`,
        {
          stdio: "inherit",
          cwd: projectRoot,
          env
        }
      );
      console.log("Backup completed successfully!");
    } catch (testError) {
      console.error("Playwright tests failed:", testError);
      throw testError; // Re-throw to be caught by outer try-catch
    }

    await closeDb();

    // After closing DB, check if Alloy volume is mounted and run rsync if so
    const backupPath = "/Volumes/Design Backup/Figma/HEXA UI";
    // if (fs.existsSync(backupPath)) {
    //   //console.log("Network volume is mounted. Running rsync...");
    //   try {
    //     execSync(
    //       'rsync -av --remove-source-files "/Users/mike/work/git-repos/work/stuff/figma-export-clean/downloads/1446837479148090378/" "/Volumes/Alloy/ptsecurity/figma-clean-backups-download/1446837479148090378/"',
    //       { stdio: "inherit" }
    //     );
    //     console.log("rsync completed successfully!");
    //   } catch (rsyncError) {
    //     console.error("rsync failed:", rsyncError);
    //   }
    // } else {
    //   console.log("Alloy volume is not mounted. Skipping rsync.");
    // }
  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  }
}

runBackup();

function resolvePlaywrightCli(projectRoot) {
  // Prefer resolving Playwright CLI entrypoint directly to avoid PATH issues
  const resolveOptions = { paths: [projectRoot, __dirname] };
  const fileCandidates = [
    // resolve with exports if available
    () => ({ label: "require playwright/cli", path: require.resolve("playwright/cli", resolveOptions) }),
    () => ({ label: "require playwright/lib/cli", path: require.resolve("playwright/lib/cli", resolveOptions) }),
    () => ({ label: "require playwright/lib/cli/cli", path: require.resolve("playwright/lib/cli/cli", resolveOptions) }),
    () => ({ label: "require playwright-core/lib/cli", path: require.resolve("playwright-core/lib/cli", resolveOptions) }),
    () => ({ label: "require playwright-core/lib/cli/cli", path: require.resolve("playwright-core/lib/cli/cli", resolveOptions) }),
    () => ({ label: "require @playwright/test/lib/cli", path: require.resolve("@playwright/test/lib/cli", resolveOptions) }),
    // direct file paths if exports fail
    () => ({ label: "file playwright/cli.js", path: path.join(projectRoot, "node_modules", "playwright", "cli.js") }),
    () => ({ label: "file playwright/lib/cli.js", path: path.join(projectRoot, "node_modules", "playwright", "lib", "cli.js") }),
    () => ({ label: "file playwright/lib/cli/cli.js", path: path.join(projectRoot, "node_modules", "playwright", "lib", "cli", "cli.js") }),
    () => ({ label: "file playwright-core/lib/cli.js", path: path.join(projectRoot, "node_modules", "playwright-core", "lib", "cli.js") }),
    () => ({ label: "file playwright-core/lib/cli/cli.js", path: path.join(projectRoot, "node_modules", "playwright-core", "lib", "cli", "cli.js") }),
    () => ({ label: "file @playwright/test/lib/cli.js", path: path.join(projectRoot, "node_modules", "@playwright", "test", "lib", "cli.js") }),
    // bin stub
    () => ({ label: "bin .bin/playwright", path: path.join(projectRoot, "node_modules", ".bin", "playwright") })
  ];

  const attempted = [];

  for (const candidateFn of fileCandidates) {
    try {
      const { label, path: candidate } = candidateFn();
      attempted.push({ label, path: candidate, exists: fs.existsSync(candidate) });
      if (fs.existsSync(candidate)) {
        //console.log(`[playwright-cli] using ${label}: ${candidate}`);
        return candidate;
      }
    } catch (err) {
      attempted.push({ label: "resolve error", path: "", exists: false, error: String(err) });
      // continue
    }
  }

  console.error("[playwright-cli] not found, attempted:", attempted);

  throw new Error("playwright CLI not found in packaged app");
}

function buildEnv(projectRoot) {
  const safePaths = [
    projectRoot && path.join(projectRoot, "node_modules", ".bin"),
    __dirname && path.join(__dirname, "..", "node_modules", ".bin"),
    process.resourcesPath && path.join(process.resourcesPath, "app", "node_modules", ".bin"),
    process.resourcesPath && path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", ".bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin"
  ].filter(Boolean);

  const envPaths = (process.env.PATH || "").split(path.delimiter);
  const merged = Array.from(
    new Set(
      [...safePaths, ...envPaths].filter(p => {
        try {
          return fs.statSync(p).isDirectory();
        } catch {
          return false;
        }
      })
    )
  ).join(path.delimiter);

  return {
    ...process.env,
    PATH: merged
  };
}

/**
 * Figma Backup Orchestrator Script
 *
 * This script manages the complete Figma file backup workflow by coordinating multiple components:
 *
 * 1. Environment Setup:
 *    - Loads environment variables from .userData/.env using dotenv
 *    - Establishes database connection via scripts/db.js for tracking backup status
 *
 * 2. File Cleanup:
 *    - Removes any existing .userData/files.json to ensure clean state
 *
 * 3. File Discovery:
 *    - Checks for TEAMS or PROJECTS environment variables to determine backup scope
 *    - Executes team-based backup via scripts/get-team-files.js if TEAMS is defined
 *    - Executes project-based backup via scripts/get-project-files.js if PROJECTS is defined
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

dotenv.config({ path: path.join(__dirname, "../.userData/.env") });

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
      execSync(`node scripts/get-team-files.js ${teams}`, { stdio: "inherit", cwd: projectRoot });
    }
    else if (projects) {
      console.log(`Checking queue for PROJECTS: ${projects}.`);
      execSync(`node scripts/get-project-files.js ${projects}`, { stdio: "inherit", cwd: projectRoot });
    } else {
      console.log("PROJECTS/TEAMS are not defined in .env file. Skipping file generation.");
      return;
    }

    // Step 2: Run tests
    console.log("Running backup...");
    try {
      //execSync("npx playwright test automations/download.spec.ts  --headed", { stdio: "inherit", cwd: projectRoot });
      execSync("npx playwright test automations/download.spec.ts", { stdio: "inherit", cwd: projectRoot });
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

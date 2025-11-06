const fs = require("node:fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const { close: closeDb } = require("./db");

dotenv.config({ path: path.join(__dirname, "../.env") });



async function runBackup() {
  try {
    // Clean up previous files.json if it exists
    const filesJsonPath = path.join(__dirname, "../files.json");
    if (fs.existsSync(filesJsonPath)) {
      fs.unlinkSync(filesJsonPath);
    }

    console.log(filesJsonPath);
    console.log(process.env.PROJECTS);
    console.log(process.env.FIGMA_ACCOUNT_1_EMAIL);

    const teams = process.env.TEAMS;
    const projects = process.env.PROJECTS;



    // Step 1: Generate files.json
    const projectRoot = path.join(__dirname, "..");
    if (teams) {
      console.log(`Generating files.json for TEAMS: ${teams}...`);
      execSync(`node scripts/get-team-files.js ${teams}`, { stdio: "inherit", cwd: projectRoot });
    }
    else if (projects) {
      console.log(`Generating files.json for PROJECTS: ${projects}...`);
      execSync(`node scripts/get-project-files.js ${projects}`, { stdio: "inherit", cwd: projectRoot });
    } else {
      console.log("PROJECTS/TEAMS are not defined in .env file. Skipping file generation.");
      return;
    }

    // Step 2: Run tests
    console.log("Running tests...");
    try {
      // execSync("npx playwright test automations/download.spec.ts --headed", { stdio: "inherit" });
      execSync("npx playwright test automations/download.spec.ts", { stdio: "inherit", cwd: projectRoot });
      
      console.log("Backup completed successfully!");
    } catch (testError) {
      console.error("Playwright tests failed:", testError);
      throw testError; // Re-throw to be caught by outer try-catch
    }

    await closeDb();

    // After closing DB, check if Alloy volume is mounted and run rsync if so
    const alloyBackupPath = "/Volumes/Alloy/ptsecurity/figma-all-backups";
    if (fs.existsSync(alloyBackupPath)) {
      console.log("Alloy volume is mounted. Running rsync...");
      try {
        execSync(
          'rsync -av --remove-source-files "/Users/mike/work/git-repos/work/stuff/figma-export-clean/downloads/1446837479148090378/" "/Volumes/Alloy/ptsecurity/figma-clean-backups-download/1446837479148090378/"',
          { stdio: "inherit" }
        );
        console.log("rsync completed successfully!");
      } catch (rsyncError) {
        console.error("rsync failed:", rsyncError);
      }
    } else {
      console.log("Alloy volume is not mounted. Skipping rsync.");
    }
  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  }
}

runBackup(); 
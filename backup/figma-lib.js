const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.userData/.env"), override: true });

function getParams() {
  return {
    method: "GET",
    headers: {
      "X-FIGMA-TOKEN": process.env.FIGMA_ACCESS_TOKEN,
    },
  };
}

async function fetchWithRetry(url, params, attempts = 3, timeoutMs = 30000) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...params, signal: controller.signal });
      clearTimeout(timeout);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.err || data.message);
      }
      return data;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (i < attempts) {
        console.warn(`Request failed (attempt ${i}/${attempts}), retrying...`, error.message || error);
        await new Promise((resolve) => setTimeout(resolve, 1000 * i));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function getProjects(teamId) {
  return fetchWithRetry(
    `https://api.figma.com/v1/teams/${teamId}/projects`,
    getParams(),
  );
}

async function getFiles(projectId) {
  return fetchWithRetry(
    `https://api.figma.com/v1/projects/${projectId}/files`,
    getParams(),
  );
}

exports.getProjects = getProjects;
exports.getFiles = getFiles;

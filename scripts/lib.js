const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.userData/.env") });

function getParams() {
  return {
    method: "GET",
    headers: {
      "X-FIGMA-TOKEN": process.env.FIGMA_ACCESS_TOKEN,
    },
  };
}

async function getProjects(teamId) {
  try {
    const response = await fetch(
      `https://api.figma.com/v1/teams/${teamId}/projects`,
      getParams(),
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.err || data.message);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

async function getFiles(projectId) {
  try {
    const response = await fetch(
      `https://api.figma.com/v1/projects/${projectId}/files`,
      getParams(),
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.err || data.message);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

exports.getProjects = getProjects;
exports.getFiles = getFiles;

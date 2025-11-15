const sqlite3 = require("sqlite3").verbose();
const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");

const dbPath = path.join(__dirname, "../figma_backups.db");
const reportPath = path.join(__dirname, "../backup_report.html");

/**
 * Formats date and time with leading zeros
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date and time string
 */
const formatDateTime = (date) => {
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Generates HTML table based on database data with project grouping.
 * @param {Array<Object>} rows - Array of objects where each object is a row from the backups table.
 * @returns {string} - String with complete HTML page code.
 */
const generateHtml = (rows) => {
  // Group records by project_name
  const groupedRows = rows.reduce((groups, row) => {
    const projectName = row.project_name || "Without Project";
    if (!groups[projectName]) {
      groups[projectName] = [];
    }
    groups[projectName].push(row);
    return groups;
  }, {});

  const tableHeaders = `
    <tr>
      <th onclick="sortTable('file_name')" data-sort="file_name" style="width:40%">
        File Name <span class="sort-indicator" id="sort-file_name"></span>
      </th>
      <th onclick="sortTable('last_modified_date')" data-sort="last_modified_date" style="width:15%">
        Last Modified <span class="sort-indicator" id="sort-last_modified_date"></span>
      </th>
      <th onclick="sortTable('last_backup_date')" data-sort="last_backup_date" style="width:15%">
        Last Backup <span class="sort-indicator" id="sort-last_backup_date"></span>
      </th>
      <th onclick="sortTable('next_attempt_date')" data-sort="next_attempt_date" style="width:15%">
        Next Attempt <span class="sort-indicator" id="sort-next_attempt_date"></span>
      </th>
      <th style="width:15%">File Key</th>
    </tr>
  `;

  // Generate rows for each project
  const projectRows = Object.entries(groupedRows)
    .map(([projectName, projectFiles]) => {
      const fileCount = projectFiles.length;
      const projectId = `project-${projectName.replace(/\s+/g, '-').toLowerCase()}`;

      // Project header
      const projectHeader = `
        <tr class="project-header" data-project="${projectId}" onclick="toggleProject('${projectId}')">
          <td colspan="5" class="project-title">
            <span class="toggle-indicator">▶︎</span>
            ${projectName} (${fileCount} file${fileCount === 1 ? '' :  's'})
          </td>
        </tr>
      `;

      // Project file rows
      const fileRows = projectFiles
        .map(
          (row) => `
        <tr class="project-file" data-project="${projectId}">
          <td>${row.file_name || "N/A"}</td>
          <td class='monospace'>${row.last_modified_date ? formatDateTime(row.last_modified_date) : "Never"}</td>
          <td class='monospace'>${row.last_backup_date ? formatDateTime(row.last_backup_date) : "Never"}</td>
          <td class='monospace'>${row.next_attempt_date ? formatDateTime(row.next_attempt_date) : "N/A"}</td>
          <td class='monospace'>${row.file_key}</td>
        </tr>
      `
        )
        .join("");

      return projectHeader + fileRows;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Figma Backup Status Report</title>
      <style>
        body { font-family: Inter, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 2rem; background-color: #f6f8fa; color: #24292e; }
        h1 { border-bottom: 1px solid #e1e4e8; padding-bottom: 0.5em; }
        table { border-collapse: collapse; width: 100%; margin-top: 1rem; font-size: 0.9em; }
        th, td { border: 1px solid #eaeceeff; padding: 8px 12px; text-align: left; }
        .monospace {
          font-family:monospace;
          font-size: 1.1em;
        }
        th { background-color: #f6f8fa; font-weight: 500; cursor: pointer; user-select: none; position: relative; }
        th:hover { background-color: #e1e4e8; }
        tr:nth-child(even) { background-color: #ffffff; }

        /* Styles for sort indicators */
        .sort-indicator {
          display: inline-block;
          margin-left: 8px;
          font-size: 0.8em;
          color: #586069;
          opacity: 0.5;
          transition: opacity 0.2s ease;
        }
        th:hover .sort-indicator {
          opacity: 1;
        }
        .sort-indicator.active {
          opacity: 1;
          color: #24292e;
        }
        .sort-indicator.asc::after {
          content: " ↑";
        }
        .sort-indicator.desc::after {
          content: " ↓";
        }

        /* Styles for project grouping */
        .project-header {
          background-color: #e1e4e8 !important;
          cursor: pointer;
          user-select: none;
        }
        .project-header:hover {
          background-color: #d1d5da !important;
        }
        .project-title {
          padding: 12px !important;
          font-weight: bold;
        }
        .toggle-indicator {
          display: inline-block;
          margin-right: 8px;
          font-size: 0.8em;
          color: #586069;
          transition: transform 0.2s ease;
        }
        .project-header:hover .toggle-indicator {
          color: #24292e;
        }
        .project-file[data-project] {
          display: table-row;
        }
        .project-file.hidden {
          display: none;
        }
      </style>
    </head>
    <body>
      <h1>Figma Backup Status Report</h1>
      <p>Generated on: ${formatDateTime(new Date())}</p>
      <p>Projects: ${Object.keys(groupedRows).length}, files: ${rows.length}</p>
      <table>
        <thead>${tableHeaders}</thead>
        <tbody>${projectRows}</tbody>
      </table>

      <script>
        function toggleProject(projectId) {
          const projectFiles = document.querySelectorAll(\`.project-file[data-project="\${projectId}"]\`);
          const projectHeader = document.querySelector(\`.project-header[data-project="\${projectId}"]\`);
          const toggleIndicator = projectHeader.querySelector('.toggle-indicator');
          const isHidden = projectFiles.length > 0 && projectFiles[0].classList.contains('hidden');

          projectFiles.forEach(file => {
            if (isHidden) {
              file.classList.remove('hidden');
              toggleIndicator.textContent = '▶';
              toggleIndicator.style.transform = 'rotate(90deg)';
            } else {
              file.classList.add('hidden');
              toggleIndicator.textContent = '▶';
              toggleIndicator.style.transform = 'rotate(0deg)';
            }
          });
        }

        // Variables for tracking sort state
        let currentSortColumn = 'file_name';
        let currentSortDirection = 'asc';

        // Table sorting function
        function sortTable(column) {
          const table = document.querySelector('table');
          const tbody = table.querySelector('tbody');

          // Determine sort direction
          if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            currentSortDirection = 'asc';
            currentSortColumn = column;
          }

          // Get all rows
          const allRows = Array.from(tbody.querySelectorAll('tr'));
          const resultRows = [];

          // Process rows by project groups
          let currentProjectFiles = [];
          let currentProjectHeader = null;

          allRows.forEach(row => {
            if (row.classList.contains('project-header')) {
              // If we have accumulated files from the previous project, sort them
              if (currentProjectFiles.length > 0) {
                sortFiles(currentProjectFiles, column);
                resultRows.push(...currentProjectFiles);
              }

              // Save current project header
              currentProjectHeader = row;
              currentProjectFiles = [];
              resultRows.push(currentProjectHeader);
            } else if (row.classList.contains('project-file')) {
              // Add file to current project
              currentProjectFiles.push(row);
            }
          });

          // Sort files of the last project
          if (currentProjectFiles.length > 0) {
            sortFiles(currentProjectFiles, column);
            resultRows.push(...currentProjectFiles);
          }

          // Clear tbody and add sorted rows
          tbody.innerHTML = '';
          resultRows.forEach(row => tbody.appendChild(row));

          // Update sort indicators
          updateSortIndicators();
        }

        // Helper function for sorting files
        function sortFiles(files, column) {
          files.sort((a, b) => {
            let aText, bText;

            // Get text values for comparison depending on column
            if (column === 'file_name') {
              aText = a.cells[0].textContent.trim();
              bText = b.cells[0].textContent.trim();
            } else if (column === 'last_modified_date') {
              aText = a.cells[1].textContent.trim();
              bText = b.cells[1].textContent.trim();
            } else if (column === 'last_backup_date') {
              aText = a.cells[2].textContent.trim();
              bText = b.cells[2].textContent.trim();
            } else if (column === 'next_attempt_date') {
              aText = a.cells[3].textContent.trim();
              bText = b.cells[3].textContent.trim();
            }

            // Handle special values for sorting
            let aVal = aText;
            let bVal = bText;

            if (column === 'last_modified_date' || column === 'last_backup_date') {
              if (aText === 'Never') aVal = '9999-12-31 23:59:59'; // Отправляем в конец
              if (bText === 'Never') bVal = '9999-12-31 23:59:59';
            } else if (column === 'next_attempt_date') {
              if (aText === 'N/A') aVal = '9999-12-31 23:59:59'; // Отправляем в конец
              if (bText === 'N/A') bVal = '9999-12-31 23:59:59';
            }

            // Use special comparison function for dates
            if (column.includes('date')) {
              return compareDates(aVal, bVal, currentSortDirection);
            }

            // Compare strings as strings
            if (aVal < bVal) {
              return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
              return currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }

        // Function for comparing dates in DD.MM.YYYY, HH:MM:SS format
        function compareDates(dateA, dateB, direction) {
          // Handle special values
          if (dateA.includes('9999-12-31') && dateB.includes('9999-12-31')) return 0;
          if (dateA.includes('9999-12-31')) return direction === 'asc' ? 1 : -1;
          if (dateB.includes('9999-12-31')) return direction === 'asc' ? -1 : 1;

          // Parse dates for correct comparison
          const parseDate = (dateStr) => {
            const parts = dateStr.split(' ');
            const datePart = parts[0]; // DD.MM.YYYY
            const timePart = parts[1] || '00:00:00'; // HH:MM:SS

            const dateParts = datePart.split('.');
            const timeParts = timePart.split(':');

            return new Date(
              parseInt(dateParts[2]), // YYYY
              parseInt(dateParts[1]) - 1, // MM (0-based)
              parseInt(dateParts[0]), // DD
              parseInt(timeParts[0]), // HH
              parseInt(timeParts[1]), // MM
              parseInt(timeParts[2]) // SS
            );
          };

          const dateObjA = parseDate(dateA);
          const dateObjB = parseDate(dateB);

          // Compare as Date objects
          if (dateObjA < dateObjB) {
            return direction === 'asc' ? -1 : 1;
          }
          if (dateObjA > dateObjB) {
            return direction === 'asc' ? 1 : -1;
          }
          return 0;
        }

        // Function to update sort indicators
        function updateSortIndicators() {
          // Reset all indicators
          document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.className = 'sort-indicator';
          });

          // Set active indicator
          const activeIndicator = document.getElementById('sort-' + currentSortColumn);
          if (activeIndicator) {
            activeIndicator.classList.add('active', currentSortDirection);
          }
        }

        // By default hide all projects except the first one
        document.addEventListener('DOMContentLoaded', function() {
          const projectHeaders = document.querySelectorAll('.project-header');
          if (projectHeaders.length > 1) {
            for (let i = 1; i < projectHeaders.length; i++) {
              const projectId = projectHeaders[i].getAttribute('data-project');
              toggleProject(projectId);
            }
          }

          // Set initial sort indicator
          updateSortIndicators();
        });
      </script>
    </body>
    </html>
  `;
};

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    return;
  }
  console.log("Connected to the Figma backups database.");
});

const sql = `
  SELECT 
    file_key, 
    project_name, 
    file_name, 
    last_backup_date, 
    last_modified_date, 
    next_attempt_date 
  FROM backups 
  ORDER BY project_name, file_name;
`;

db.all(sql, [], (err, rows) => {
  if (err) {
    console.error("Error running query:", err.message);
    return;
  }

  console.log(`Found ${rows.length} records in the database.`);
  const htmlContent = generateHtml(rows);

  fs.writeFile(reportPath, htmlContent, (writeErr) => {
    if (writeErr) {
      console.error("Error writing HTML report:", writeErr.message);
      return;
    }
    console.log(`Successfully generated report at: ${reportPath}`);

    // Open file in browser
    const openCommand = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${openCommand} ${reportPath}`);
  });

  db.close((closeErr) => {
    if (closeErr) {
      console.error(closeErr.message);
    }
    console.log("Closed the database connection.");
  });
});
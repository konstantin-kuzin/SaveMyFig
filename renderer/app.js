// renderer/app.js
let currentStep = 1;

function showStep(n) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step${n}`).classList.add('active');
  currentStep = n;
}

// Шаг 1: npm install
document.getElementById('btn-install').addEventListener('click', async () => {
  const log = document.getElementById('install-log');
  log.textContent = 'Запуск npm install...\n';
  document.getElementById('btn-install').disabled = true;

  window.api.onNpmOutput((data) => {
    log.textContent += data;
    log.scrollTop = log.scrollHeight;
  });

  try {
    await window.api.runNpmInstall();
    document.getElementById('btn-next1').disabled = false;
    log.textContent += '\n✅ Установка завершена!\n';
  } catch (err) {
    log.textContent += `\n❌ Ошибка: ${err.message}\n`;
  }
});

document.getElementById('btn-next1').addEventListener('click', () => showStep(2));

// Шаг 2: настройка
document.getElementById('btn-select-dir').addEventListener('click', async () => {
  const dir = await window.api.selectOutputDir();
  if (dir) document.getElementById('outputDir').value = dir;
});

document.getElementById('btn-save-env').addEventListener('click', async () => {
  const envData = {
    FIGMA_ACCESS_TOKEN: document.getElementById('token').value,
    PROJECTS: document.getElementById('projects').value,
    OUTPUT_DIR: document.getElementById('outputDir').value
  };
  await window.api.saveEnv(envData);
  document.getElementById('btn-next2').disabled = false;
  alert('Настройки сохранены!');
});

document.getElementById('btn-back2').addEventListener('click', () => showStep(1));
document.getElementById('btn-next2').addEventListener('click', () => showStep(3));

// Шаг 3: бэкап
document.getElementById('btn-run-backup').addEventListener('click', async () => {
  const log = document.getElementById('backup-log');
  log.textContent = 'Запуск бэкапа...\n';
  document.getElementById('btn-run-backup').disabled = true;

  window.api.onBackupOutput((data) => {
    log.textContent += data;
    log.scrollTop = log.scrollHeight;
  });

  try {
    await window.api.runBackup();
    log.textContent += '\n✅ Бэкап завершён!\n';
    document.getElementById('btn-show-report').disabled = false;
  } catch (err) {
    log.textContent += `\n❌ Ошибка: ${err.message}\n`;
  }
});

document.getElementById('btn-show-report').addEventListener('click', async () => {
  try {
    const report = await window.api.generateReport();
    document.getElementById('report-content').textContent = report;
    showStep(4);
  } catch (err) {
    alert('Ошибка генерации отчёта: ' + err.message);
  }
});

// Назад
document.getElementById('btn-back3').addEventListener('click', () => showStep(2));
document.getElementById('btn-back').addEventListener('click', () => showStep(3));
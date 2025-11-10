const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');

// Файлы для копирования (не компилируемые TypeScript)
const STATIC_FILES = [
  'index.html',
  'styles.css'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`✓ Скопирован: ${path.relative(__dirname, dest)}`);
}

function copyDir(src, dest) {
  ensureDir(dest);
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (stat.isFile()) {
      // Копируем только .js файлы, которые не компилируются TypeScript
      if (item.endsWith('.js') && !item.endsWith('.d.ts')) {
        copyFile(srcPath, destPath);
      }
    }
  }
}

function main() {
  console.log('🚀 Начинаем копирование статических файлов...');
  
  // Создаем папку dist если её нет
  ensureDir(DIST_DIR);
  
  // Копируем отдельные статические файлы
  for (const file of STATIC_FILES) {
    const srcPath = path.join(RENDERER_DIR, file);
    const destPath = path.join(DIST_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, destPath);
    } else {
      console.warn(`⚠️  Файл не найден: ${srcPath}`);
    }
  }
  
  // Копируем только ES6 файлы, которые не компилируются TypeScript
  const dirs = []; // Удаляем компоненты - они теперь компилируются
  for (const dir of dirs) {
    const srcPath = path.join(RENDERER_DIR, dir);
    const destPath = path.join(DIST_DIR, dir);
    
    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, destPath);
    } else {
      console.warn(`⚠️  Папка не найдена: ${srcPath}`);
    }
  }
  
  // Отдельно копируем renderer.js (ES6 модуль)
  const rendererJsPath = path.join(RENDERER_DIR, 'renderer.js');
  if (fs.existsSync(rendererJsPath)) {
    const destRendererPath = path.join(DIST_DIR, 'renderer', 'renderer.js');
    ensureDir(path.dirname(destRendererPath));
    copyFile(rendererJsPath, destRendererPath);
  } else {
    console.warn(`⚠️  Файл renderer.js не найден: ${rendererJsPath}`);
  }
  
  
  console.log('✅ Копирование статических файлов завершено!');
}

if (require.main === module) {
  main();
}

module.exports = { main };
const fs = require('fs');
const path = require('path');

// Paths are relative to the gui/ folder where this script lives
const DIST_DIR = path.join(__dirname, 'dist');
const APP_DIR = path.join(__dirname, 'app');
const DIST_UI_DIR = path.join(DIST_DIR, 'app');
const DIST_TMP_DIR = path.join(DIST_DIR, 'app');
const DIST_UI_FILE = path.join(DIST_DIR, 'ui.js');


const STATIC_FILES = [
  'index.html',
  'styles.css',
  'bg.jpg'
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
  console.log('Копирование статических файлов...');
  
  // Создаем папку dist если её нет
  ensureDir(DIST_DIR);
  
  // Копируем отдельные статические файлы
  for (const file of STATIC_FILES) {
    const srcPath = path.join(APP_DIR, file);
    const destPath = path.join(DIST_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, destPath);
    } else {
      console.warn(`⚠️  Файл не найден: ${srcPath}`);
    }
  }
  
  
  const dirs = [];
  for (const dir of dirs) {
    const srcPath = path.join(APP_DIR, dir);
    const destPath = path.join(DIST_DIR, dir);
    
    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, destPath);
    } else {
      console.warn(`⚠️  Папка не найдена: ${srcPath}`);
    }
  }
  
  // Отдельно копируем ui.js
  const uiJsPath = path.join(APP_DIR, 'ui.js');
  if (fs.existsSync(uiJsPath)) {
    const destRendererPath = path.join(DIST_DIR,'ui.js');
    ensureDir(path.dirname(destRendererPath));
    copyFile(uiJsPath, destRendererPath);
  } else {
    console.warn(`⚠️  Файл ui.js не найден: ${uiJsPath}`);
  }
  
  
  console.log('✅ Копирование статических файлов завершено!');
}

if (require.main === module) {
  main();
}

module.exports = { main };

function inlineComponents() {
  console.log('');
  console.log('Встраивание компонентов в ui.js...');
  
  if (!fs.existsSync(DIST_UI_FILE)) {
    console.error('❌ Файл ui.js не найден');
    return;
  }
  
  if (!fs.existsSync(DIST_UI_DIR)) {
    console.error('❌ Папка компонентов не найдена');
    return;
  }
  
  // Читаем содержимое ui.js
  let rendererContent = fs.readFileSync(DIST_UI_FILE, 'utf8');
  
  // Получаем список всех компонентов
  const componentFiles = fs.readdirSync(DIST_UI_DIR)
    .filter(file => file.endsWith('.js') && file.startsWith('ui-'));
  
  console.log(`Найдено компонентов: ${componentFiles.length}`);
  
  let allComponents = '';
  
  // Собираем все компоненты
  for (const componentFile of componentFiles) {
    const componentPath = path.join(DIST_UI_DIR, componentFile);
    let componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Удаляем "use strict" и Object.defineProperty
    componentContent = componentContent
      .replace(/"use strict";\n?/g, '')
      .replace(/Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n/g, '')
      // Удаляем следы экспорта, оставляя только объявление функции
      .replace(/exports\.(\w+) = (\w+);\n?/g, '')
      .replace(/export function (\w+)\(\) \{ return \1\(\); \}\n?/g, '')
      .replace(/export \{.*\};?\n?/g, '');
    
    allComponents += componentContent + '\n\n';
    console.log(`✅ Обработан: ${componentFile}`);
  }
  
  // Удаляем все импорты компонентов
  rendererContent = rendererContent
    .replace(/import.*from ['"]\.\/ui\/.*['"];?\n?/g, '')
    .replace(/import.*from ['"]\.\/ui-.*['"];?\n?/g, '')
    .replace(/\/\/ Встроенный компонент: \w+\n?/g, '');
  
  // Заменяем класс AppRenderer на встроенные компоненты + класс
  const classRegex = new RegExp(`class AppRenderer \\{`, 'g');
  if (classRegex.test(rendererContent)) {
    rendererContent = rendererContent.replace(classRegex, `// ===== ВСТРОЕННЫЕ КОМПОНЕНТЫ =====\n\n${allComponents}// ===== ОСНОВНОЙ КЛАСС =====\nclass AppRenderer {`);
  }
  
  // Удаляем папку компонентов из dist
  
  if (fs.existsSync(DIST_TMP_DIR)) {
    fs.rmSync(DIST_TMP_DIR, { recursive: true, force: true });
    console.log('Удалена папка APP из dist');
 }
  
  // Записываем обновленный ui.js
  fs.writeFileSync(DIST_UI_FILE, rendererContent, 'utf8');
  
  console.log('✅ Вставка UI компонентов завершенa!');
}

if (require.main === module) {
  inlineComponents();
}

module.exports = { inlineComponents };

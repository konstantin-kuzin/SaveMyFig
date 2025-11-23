const fs = require('fs');
const path = require('path');

// Paths are relative to the gui/ folder where this script lives
const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = path.join(__dirname, 'src');
const SRC_STATIC_DIR = path.join(SRC_DIR, 'static');
const DIST_STATIC_DIR = path.join(DIST_DIR, 'src', 'static');
const DIST_UI_DIR = DIST_DIR;
const DIST_UI_FILE = path.join(DIST_DIR, 'ui.js');


const STATIC_FILES = ['index.html', 'styles.css', 'bg.jpg', 'icon.png'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  //console.log(`✓ Copied: ${path.relative(__dirname, dest)}`);
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
      // Copy only .js files that are not compiled by TypeScript
      if (item.endsWith('.js') && !item.endsWith('.d.ts')) {
        copyFile(srcPath, destPath);
      }
    }
  }
}

function main() {
  console.log('Copying static files...');
  
  // Create dist folder if it does not exist
  ensureDir(DIST_DIR);
  
  // Copy static files to dist/src/static
  ensureDir(DIST_STATIC_DIR);
  for (const file of STATIC_FILES) {
    const srcPath = path.join(SRC_STATIC_DIR, file);
    const destPath = path.join(DIST_STATIC_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, destPath);
    } else {
      console.warn(`⚠️  File not found: ${srcPath}`);
    }
  }
  
  
  const dirs = [];
  for (const dir of dirs) {
    const srcPath = path.join(SRC_DIR, dir);
    const destPath = path.join(DIST_DIR, dir);
    
    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, destPath);
    } else {
      console.warn(`⚠️  Directory not found: ${srcPath}`);
    }
  }
  
  // Copy ui.js separately
  const uiJsPath = path.join(SRC_DIR, 'ui.js');
  if (fs.existsSync(uiJsPath)) {
    const destRendererPath = path.join(DIST_DIR,'ui.js');
    ensureDir(path.dirname(destRendererPath));
    copyFile(uiJsPath, destRendererPath);
  } else {
    console.warn(`⚠️  ui.js file not found: ${uiJsPath}`);
  }


  console.log('✅ Copy complete!');
}

if (require.main === module) {
  main();
}

module.exports = { main };

function inlineComponents() {
  console.log('');
  console.log('Preprocessing in ui.js...');
  
  if (!fs.existsSync(DIST_UI_FILE)) {
    console.error('❌ ui.js file not found');
    return;
  }
  
  if (!fs.existsSync(DIST_UI_DIR)) {
    console.error('❌ Components folder not found');
    return;
  }
  
  // Read ui.js content
  let rendererContent = fs.readFileSync(DIST_UI_FILE, 'utf8');
  
  // Get all component files
  const componentFiles = fs.readdirSync(DIST_UI_DIR)
    .filter(file => file.endsWith('.js') && file.startsWith('ui-'));
  
  //console.log(`Найдено компонентов: ${componentFiles.length}`);
  
  let allComponents = '';
  
  // Aggregate all components
  for (const componentFile of componentFiles) {
    const componentPath = path.join(DIST_UI_DIR, componentFile);
    let componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Remove "use strict" and Object.defineProperty
    componentContent = componentContent
      .replace(/"use strict";\n?/g, '')
      .replace(/Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n/g, '')
      // Remove export leftovers, keep function body only
      .replace(/exports\.(\w+) = (\w+);\n?/g, '')
      .replace(/export function (\w+)\(\) \{ return \1\(\); \}\n?/g, '')
      .replace(/export \{.*\};?\n?/g, '');
    
    allComponents += componentContent + '\n\n';
    //console.log(`✅ Complete: ${componentFile}`);
  }
  
  // Удаляем все импорты компонентов
  rendererContent = rendererContent
    .replace(/import.*from ['"]\.\/ui\/.*['"];?\n?/g, '')
    .replace(/import.*from ['"]\.\/ui-.*['"];?\n?/g, '')
    .replace(/\/\/ Встроенный компонент: \w+\n?/g, '');
  
  // Replace AppRenderer class header with inlined components + class
  const classRegex = new RegExp(`class AppRenderer \\{`, 'g');
  if (classRegex.test(rendererContent)) {
    rendererContent = rendererContent.replace(classRegex, `// ===== EMBEDDED COMPONENTS =====\n\n${allComponents}// ===== MAIN CLASS =====\nclass AppRenderer {`);
  }
  
  // Remove component files after embedding (keep util modules)
  for (const componentFile of componentFiles) {
    const componentPath = path.join(DIST_UI_DIR, componentFile);
    if (fs.existsSync(componentPath)) {
      fs.rmSync(componentPath, { force: true });
      //console.log(`Deleted: ${componentFile}`);
    }
  }

  // Записываем обновленный ui.js
  fs.writeFileSync(DIST_UI_FILE, rendererContent, 'utf8');

  console.log('✅ Compilation complete!');
}

if (require.main === module) {
  inlineComponents();
}

module.exports = { inlineComponents };

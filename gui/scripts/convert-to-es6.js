const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const COMPONENTS_DIR = path.join(DIST_DIR, 'renderer', 'components');

function convertCommonJSToES6() {
  console.log('🔄 Конвертация CommonJS в ES6...');
  
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.warn('⚠️  Папка компонентов не найдена');
    return;
  }
  
  const files = fs.readdirSync(COMPONENTS_DIR);
  
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(COMPONENTS_DIR, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Простая конвертация CommonJS в ES6
      content = content
        // Удаляем "use strict"
        .replace(/"use strict";\n?/, '')
        // Удаляем Object.defineProperty
        .replace(/Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n/, '')
        // Заменяем exports.functionName = functionName; на export function functionName
        .replace(/exports\.(\w+) = (\w+);/g, 'export function $1() { return $2(); }');
      
      fs.writeFileSync(filePath, content);
      console.log(`✓ Конвертирован: ${file}`);
    }
  }
  
  console.log('✅ Конвертация завершена!');
}

if (require.main === module) {
  convertCommonJSToES6();
}

module.exports = { convertCommonJSToES6 };
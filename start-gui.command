#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=== Figma Export GUI Launcher ==="

# Удаление переменной окружения, если она установлена
unset ELECTRON_RUN_AS_NODE

echo "✅ Переменная ELECTRON_RUN_AS_NODE отключена"

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден!"
    exit 1
fi

# Проверка версии
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️ Требуется Node.js v18+. Пожалуйста обновите."
    exit 1
fi

echo "✅ Node.js v$(node --version) найден"

# Переход в директорию gui и запуск приложения
cd gui && npm start
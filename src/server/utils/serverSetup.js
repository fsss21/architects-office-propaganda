const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

/**
 * Конфигурация сервера — проект «Монументальная пропаганда»
 * (React + Vite, данные: catalogItems.json, progressPoints.json)
 */
const CONFIG = {
  // Порт сервера (не конфликтует с Vite dev 5173)
  port: 3001,

  // Режим kiosk (полноэкранный режим)
  kioskMode: false,

  // Автоматически открывать браузер при запуске
  openBrowser: true,

  // Отключить проверку CORS в браузере (только для локальной разработки)
  disableWebSecurity: true,

  // Задержка перед открытием браузера (мс)
  browserDelay: 1000,

  // Путь к index.html (сборка Vite → build/)
  indexHtmlPath: 'index.html',

  // Файлы данных проекта (относительно public/ или build/)
  gameItemsFile: path.join('data', 'catalogItems.json'),
  statisticsFile: path.join('data', 'progressPoints.json'),
};

/**
 * Класс для управления настройками и запуском сервера
 * Поддерживает как обычный запуск через node, так и сборку через pkg
 */
class ServerSetup {
  constructor() {
    try {
      // Определяем базовую директорию (корень проекта architects-office-propaganda)
      // __dirname = src/server/utils → вверх 3 уровня = корень проекта
      this.isPkg = typeof process.pkg !== 'undefined';
      this.baseDir = this.isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..', '..', '..');

      // Используем конфигурацию из CONFIG
      this.config = {
        port: CONFIG.port,
        kioskMode: CONFIG.kioskMode,
        openBrowser: CONFIG.openBrowser,
        disableWebSecurity: CONFIG.disableWebSecurity,
        browserDelay: CONFIG.browserDelay,
        indexHtmlPath: CONFIG.indexHtmlPath,
        gameItemsFile: CONFIG.gameItemsFile,
        statisticsFile: CONFIG.statisticsFile,
      };

      // Проверяем, что CONFIG правильно загружен
      if (!this.config.gameItemsFile || !this.config.statisticsFile) {
        throw new Error(`CONFIG не инициализирован правильно. gameItemsFile: ${this.config.gameItemsFile}, statisticsFile: ${this.config.statisticsFile}`);
      }

      // Директория со сборкой: Vite → build/ (vite.config.js outDir: 'build')
      if (this.isPkg) {
        this.buildDir = this.baseDir;
      } else {
        this.buildDir = path.join(this.baseDir, 'build');
      }

      // Пути к файлам данных (catalogItems.json, progressPoints.json)
      if (this.isPkg) {
        // В pkg режиме: данные в build/json/ (рядом с launch.exe)
        this.gameItemsFile = path.join(this.baseDir, this.config.gameItemsFile);
        this.statisticsFile = path.join(this.baseDir, this.config.statisticsFile);
        this.gameItemsFileFallback = null;
        this.statisticsFileFallback = null;
      } else {
        // В режиме разработки: сначала build/data/, затем public/data/
        const buildGameItemsPath = path.join(this.buildDir, this.config.gameItemsFile);
        const publicGameItemsPath = path.join(this.baseDir, 'public', this.config.gameItemsFile);
        const buildStatisticsPath = path.join(this.buildDir, this.config.statisticsFile);
        const publicStatisticsPath = path.join(this.baseDir, 'public', this.config.statisticsFile);
        
        this.gameItemsFile = buildGameItemsPath;
        this.gameItemsFileFallback = publicGameItemsPath;
        this.statisticsFile = buildStatisticsPath;
        this.statisticsFileFallback = publicStatisticsPath;
      }

      // Привязываем методы к контексту для pkg режима
      this.getGameItemsFile = this.getGameItemsFile.bind(this);
      this.getStatisticsFile = this.getStatisticsFile.bind(this);
    } catch (error) {
      console.error('❌ Ошибка в конструкторе ServerSetup:', error);
      throw error;
    }
  }

  /**
   * Получить базовую директорию
   */
  getBaseDir() {
    return this.baseDir;
  }

  /**
   * Получить директорию со статическими файлами
   */
  getBuildDir() {
    return this.buildDir;
  }

  /**
   * Получить путь к файлу gameItems.json
   * Проверяет существование файла и возвращает подходящий путь
   */
  async getGameItemsFile() {
    try {
      if (this.isPkg) {
        if (!this.gameItemsFile) {
          throw new Error('gameItemsFile не определен в pkg режиме');
        }
        return this.gameItemsFile;
      }
      
      if (!this.gameItemsFile) {
        throw new Error('gameItemsFile не определен');
      }
      
      // Проверяем существование файла в build/, если нет - используем public/
      if (typeof fs.pathExists !== 'function') {
        console.warn('⚠️  fs.pathExists не является функцией, используем прямой путь');
        return this.gameItemsFile;
      }
      
      const buildExists = await fs.pathExists(this.gameItemsFile);
      if (buildExists) {
        return this.gameItemsFile;
      }
      
      // Если файла нет в build/, проверяем public/
      if (this.gameItemsFileFallback) {
        const publicExists = await fs.pathExists(this.gameItemsFileFallback);
        if (publicExists) {
          return this.gameItemsFileFallback;
        }
      }
      
      // Если файла нет нигде, возвращаем путь к build/ (будет создан)
      return this.gameItemsFile;
    } catch (error) {
      console.error('❌ Ошибка в getGameItemsFile:', error);
      throw error;
    }
  }

  /**
   * Получить путь к файлу statistics.json
   * Проверяет существование файла и возвращает подходящий путь
   */
  async getStatisticsFile() {
    try {
      if (this.isPkg) {
        if (!this.statisticsFile) {
          throw new Error('statisticsFile не определен в pkg режиме');
        }
        return this.statisticsFile;
      }
      
      if (!this.statisticsFile) {
        throw new Error('statisticsFile не определен');
      }
      
      // Проверяем существование файла в build/, если нет - используем public/
      if (typeof fs.pathExists !== 'function') {
        console.warn('⚠️  fs.pathExists не является функцией, используем прямой путь');
        return this.statisticsFile;
      }
      
      const buildExists = await fs.pathExists(this.statisticsFile);
      if (buildExists) {
        return this.statisticsFile;
      }
      
      // Если файла нет в build/, проверяем public/
      if (this.statisticsFileFallback) {
        const publicExists = await fs.pathExists(this.statisticsFileFallback);
        if (publicExists) {
          return this.statisticsFileFallback;
        }
      }
      
      // Если файла нет нигде, возвращаем путь к build/ (будет создан)
      return this.statisticsFile;
    } catch (error) {
      console.error('❌ Ошибка в getStatisticsFile:', error);
      throw error;
    }
  }

  /**
   * Проверить, запущен ли через pkg
   */
  isPkgMode() {
    return this.isPkg;
  }

  /**
   * Получить URL приложения
   */
  getAppUrl() {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * Получить URL API
   */
  getApiUrl() {
    return `http://localhost:${this.config.port}/api`;
  }

  /**
   * Проверить существование index.html
   */
  async checkIndexHtml() {
    try {
      const indexHtmlPath = path.join(this.buildDir, this.config.indexHtmlPath);
      const exists = await fs.pathExists(indexHtmlPath);

      if (!exists) {
        console.error(`\n❌ ОШИБКА: файл ${this.config.indexHtmlPath} не найден по пути: ${indexHtmlPath}`);
        console.log(`\n📂 Информация о путях:`);
        console.log(`   BUILD_DIR: ${this.buildDir}`);
        console.log(`   baseDir: ${this.baseDir}`);
        console.log(`   isPkg: ${this.isPkg}`);
        console.log(`   process.execPath: ${process.execPath}`);
        console.log(`   process.cwd(): ${process.cwd()}`);
        
        // Пробуем найти index.html в других местах
        const possiblePaths = [
          path.join(this.baseDir, 'index.html'),
          path.join(process.cwd(), 'index.html'),
          path.join(process.cwd(), 'build', 'index.html'),
        ];
        
        console.log(`\n🔍 Поиск index.html в других местах...`);
        for (const possiblePath of possiblePaths) {
          try {
            const possibleExists = await fs.pathExists(possiblePath);
            console.log(`   ${possiblePath}: ${possibleExists ? '✅ найден' : '❌ не найден'}`);
          } catch (e) {
            console.log(`   ${possiblePath}: ❌ ошибка проверки`);
          }
        }
      } else {
        console.log(`✅ ${this.config.indexHtmlPath} найден: ${indexHtmlPath}`);
      }

      return exists;
    } catch (error) {
      console.error('❌ Ошибка при проверке index.html:', error);
      console.error('Stack:', error.stack);
      return false;
    }
  }

  /**
   * Открыть браузер в kiosk режиме (только для Windows)
   */
  async openBrowser() {
    if (!this.config.openBrowser) {
      return;
    }

    if (os.platform() !== 'win32') {
      console.log('⚠️  Автоматическое открытие браузера поддерживается только на Windows');
      console.log(`🌐 Откройте браузер вручную: ${this.getAppUrl()}`);
      return;
    }

    const url = this.getAppUrl();

    if (!this.config.kioskMode) {
      console.log('💡 Kiosk режим выключен - DevTools доступны (F12 для открытия)');
    }
    if (this.config.disableWebSecurity) {
      console.log('⚠️  ВНИМАНИЕ: Проверка CORS отключена в браузере! Это небезопасно для продакшена.');
    }
    const chromePath = process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe';
    const edgePath = process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe';

    // Проверяем наличие Chrome
    const chromeExists = await fs.pathExists(chromePath);

    if (chromeExists) {
      // Открываем Chrome в kiosk режиме или обычном режиме
      let chromeFlags = '';

      // Добавляем флаги для отключения CORS, если включено
      if (this.config.disableWebSecurity) {
        chromeFlags += `--disable-web-security --user-data-dir="${os.tmpdir()}\\ChromeTempProfile" `;
      }

      if (this.config.kioskMode) {
        chromeFlags += `--autoplay-policy=no-user-gesture-required --app="${url}" --start-fullscreen --kiosk --disable-features=Translate,ContextMenuSearchWebFor,ImageSearch`;
      } else {
        chromeFlags += `--app="${url}" --auto-open-devtools-for-tabs`;
      }

      exec(`"${chromePath}" ${chromeFlags}`, (error) => {
        if (error) {
          console.error('❌ Ошибка открытия Chrome:', error);
        }
      });

      // Убиваем explorer.exe через 12 секунд для чистого kiosk режима
      if (this.config.kioskMode) {
        setTimeout(() => {
          exec('taskkill /f /im explorer.exe', (error) => {
            if (error && !error.message.includes('не найден')) {
              console.error('⚠️  Не удалось закрыть explorer.exe:', error.message);
            }
          });
        }, 12000);
      }
    } else {
      // Проверяем наличие Edge
      const edgeExists = await fs.pathExists(edgePath);

      if (edgeExists) {
        // Настраиваем Edge политики
        if (this.config.kioskMode) {
          exec('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "TranslateEnabled" /t REG_DWORD /d 0 /f >nul 2>&1', () => {});
          exec('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ContextMenuSearchEnabled" /t REG_DWORD /d 0 /f >nul 2>&1', () => {});
          exec('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "VisualSearchEnabled" /t REG_DWORD /d 0 /f >nul 2>&1', () => {});
        }

        // Открываем Edge в kiosk режиме
        let edgeFlags = '';

        // Добавляем флаги для отключения CORS, если включено
        if (this.config.disableWebSecurity) {
          edgeFlags += `--disable-web-security --user-data-dir="${os.tmpdir()}\\EdgeTempProfile" `;
        }

        if (this.config.kioskMode) {
          edgeFlags += `--kiosk "${url}" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeSidebarV2,msHub,msWelcomePage,msTranslations,msContextMenuSearch,msVisualSearch --disable-component-update --disable-prompt-on-repost --kiosk-idle-timeout-minutes=0`;
        } else {
          edgeFlags += `"${url}"`;
        }

        exec(`"${edgePath}" ${edgeFlags}`, (error) => {
          if (error) {
            console.error('❌ Ошибка открытия Edge:', error);
          }
        });
      } else {
        console.error('❌ Не найден ни Chrome, ни Edge. Откройте браузер вручную:', url);
      }
    }
  }

  /**
   * Инициализировать директории для данных
   */
  async initializeDataDir() {
    try {
      // Получаем актуальные пути к файлам данных
      const gameItemsFile = await this.getGameItemsFile();
      const statisticsFile = await this.getStatisticsFile();
      
      // Проверяем, что пути валидны
      if (!gameItemsFile || !statisticsFile) {
        throw new Error(`Пути к файлам данных не определены. gameItemsFile: ${gameItemsFile}, statisticsFile: ${statisticsFile}`);
      }
      
      // Создаем директории если их нет
      await fs.ensureDir(path.dirname(gameItemsFile));
      await fs.ensureDir(path.dirname(statisticsFile));

      // Проверяем существование файлов
      const gameItemsExists = await fs.pathExists(gameItemsFile);
      const statisticsExists = await fs.pathExists(statisticsFile);
      
      console.log(`📂 Проверка файла catalogItems.json: ${gameItemsFile}`);
      console.log(`📂 Файл существует: ${gameItemsExists}`);
      console.log(`📂 Проверка файла progressPoints.json: ${statisticsFile}`);
      console.log(`📂 Файл существует: ${statisticsExists}`);

      if (!gameItemsExists || !statisticsExists) {
        console.log('✅ Директории для данных созданы');
      } else {
        console.log('✅ Файлы данных найдены');
      }

      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации директории данных:', error);
      return false;
    }
  }

  /**
   * Вывести информацию о конфигурации сервера
   */
  logServerInfo() {
    console.log(`🚀 Сервер запущен на порту ${this.config.port}`);
    console.log(`📁 catalogItems.json: ${this.gameItemsFile}`);
    console.log(`📁 progressPoints.json: ${this.statisticsFile}`);
    console.log(`📂 Статические файлы из: ${this.buildDir}`);
    console.log(`📂 Корень проекта: ${this.baseDir}`);
    console.log(`🌐 API доступно по адресу: ${this.getApiUrl()}`);
    console.log(`🎨 Приложение: ${this.getAppUrl()}`);
    console.log(`🔧 Kiosk режим: ${this.config.kioskMode ? '✅ включен' : '❌ выключен (DevTools доступны)'}`);
    console.log(`🔒 Отключение CORS в браузере: ${this.config.disableWebSecurity ? '✅ включено (⚠️  небезопасно!)' : '❌ выключено'}`);
    if (this.config.openBrowser) {
      console.log(`🌐 Автооткрытие браузера: ✅ включено`);
    }
  }

  /**
   * Настроить Express приложение для работы со статическими файлами
   * @param {Express} app - Express приложение
   * @param {Object} express - Express модуль (для express.static)
   */
  setupStaticFiles(app, express) {
    // Раздача статических файлов из build (CSS, JS, изображения и т.д.)
    // Размещено после API маршрутов, чтобы API запросы обрабатывались первыми
    app.use(express.static(this.buildDir));

    // Fallback для SPA роутинга - все не-API запросы возвращают index.html
    // Должен быть последним, чтобы обрабатывать все маршруты, не обработанные выше
    app.use((req, res, next) => {
      // Пропускаем API запросы
      if (req.path.startsWith('/api')) {
        return next();
      }
      // Для всех остальных запросов возвращаем index.html
      res.sendFile(path.join(this.buildDir, this.config.indexHtmlPath));
    });
  }

  /**
   * Запустить сервер с автоматическим открытием браузера
   * @param {Express} app - Express приложение
   * @param {Function} onReady - Callback функция, вызываемая когда сервер готов
   */
  async startServer(app, onReady) {
    try {
      // Проверяем существование index.html
      const indexExists = await this.checkIndexHtml();
      
      if (!indexExists) {
        throw new Error(`index.html не найден в ${this.buildDir}. Убедитесь, что сборка выполнена.`);
      }

      // Запускаем сервер
      app.listen(this.config.port, async () => {
        try {
          this.logServerInfo();

          // Вызываем callback если указан
          if (onReady) {
            await onReady();
          }

          // Открываем браузер через задержку
          if (this.config.openBrowser) {
            setTimeout(async () => {
              try {
                await this.openBrowser();
              } catch (error) {
                console.error('❌ Ошибка при открытии браузера:', error);
                console.log(`🌐 Откройте браузер вручную: ${this.getAppUrl()}`);
              }
            }, this.config.browserDelay);
          }
        } catch (error) {
          console.error('❌ Ошибка после запуска сервера:', error);
          throw error;
        }
      }).on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`\n❌ Порт ${this.config.port} уже занят!`);
          console.error(`   Закройте другое приложение, использующее этот порт, или измените порт в конфигурации.`);
        } else {
          console.error('\n❌ Ошибка запуска сервера:', error.message);
          console.error('Stack:', error.stack);
        }
        
        // Пауза перед закрытием
        console.log('\n⚠️  Окно закроется через 30 секунд...');
        setTimeout(() => {
          process.exit(1);
        }, 30000);
      });
    } catch (error) {
      console.error('❌ Ошибка в startServer:', error);
      throw error;
    }
  }
}

module.exports = ServerSetup;

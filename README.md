# [LikSite](https://likdev.ru/)

# 🔎 Domain Inspector

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green)](https://chromewebstore.google.com/detail/domain-inspector/eepidnajpldcmdfooaeiojhpcpaakjbf)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-orange)](https://addons.mozilla.org/ru/firefox/addon/domain-inspector/)
[![Issues](https://img.shields.io/github/issues/likDanil/Domain-Inspector)](https://github.com/likDanil/Domain-Inspector/issues)
[![License](https://img.shields.io/github/license/likDanil/Domain-Inspector)](LICENSE)

**Domain Inspector** — расширение для браузеров Chrome / Chromium и Mozilla Firefox, предназначенное для **глубокого анализа доменов**, используемых веб-страницей.

Расширение выявляет **все домены**, с которыми сайт взаимодействует напрямую или косвенно: через сетевые запросы, динамические подключения, ресурсы страницы и фоновые механизмы браузера.

---

## 🚀 Скачать и установить

### 📥 Магазины расширений (рекомендуется)

- 👉 **Chrome / Chromium**  
  https://chromewebstore.google.com/detail/domain-inspector/eepidnajpldcmdfooaeiojhpcpaakjbf

- 👉 **Mozilla Firefox**  
  https://addons.mozilla.org/ru/firefox/addon/domain-inspector/

После установки нажми на иконку расширения — **сканирование начнётся автоматически**.

---

## ✨ Основные возможности

### 🌐 Полный сбор доменов
Domain Inspector обнаруживает домены из следующих источников:

- HTTP / HTTPS запросы (fetch, XMLHttpRequest)
- WebSocket и EventSource (SSE)
- WebRTC (STUN / TURN серверы)
- Web Workers и Shared Workers
- Service Workers
- DOM-элементы (`img`, `script`, `iframe`, `link`, `form` и др.)
- CSS-ресурсы (`url()`, `@import`)
- `<link rel="dns-prefetch">` и `<link rel="preconnect">`
- Web App Manifest
- события нарушений Content Security Policy (CSP)

---

### 🧠 Несколько методов анализа
Используются независимые подходы:

- **Перехват JavaScript API** (реальное время)
- **Performance API** (загружаемые ресурсы)
- **Анализ DOM / CSS / Manifest**

Каждый метод можно включать и отключать отдельно в настройках.

---

### 👤 Профили настроек
- несколько профилей конфигурации
- быстрое переключение
- импорт и экспорт (base64 / ссылка)
- индивидуальные настройки формата и сжатия для каждого профиля

---

### ✂️ Сжатие и группировка доменов
Поддерживаются режимы:
- без сжатия
- автоматическое сжатие субдоменов (2+ → базовый домен)
- сжатие всех субдоменов

---

### 📤 Форматы вывода
Результат можно скопировать в форматах:
- **KeenDNS** — по строкам
- **AdGuard** — через запятую, без пробелов
- **3x-ui** — через запятую с пробелами

---

### 🔍 Фильтрация
- все домены
- только домены с ответами
- только домены без ответов (ошибки / блокировки)

---

### 🎨 Интерфейс
- современный и аккуратный UI
- тёмная и светлая темы
- всплывающие подсказки и описания параметров
- popup-окно + расширенная страница настроек

---

## ⚙️ Приватность и безопасность

- расширение не отправляет данные на внешние серверы
- вся обработка выполняется **локально**
- используется только стандартный API браузера

---

## 🧩 Для чего это полезно

- анализ трекеров и аналитики
- аудит сторонних подключений
- подготовка списков для DNS-блокировки
- исследование поведения сайтов
- повышение приватности

---

## 💬 Обратная связь

- 🐛 Issues: https://github.com/likDanil/Domain-Inspector/issues  
- 📢 Telegram-канал: https://t.me/LikDev  
- 💬 Telegram-чат: https://t.me/+cqUfnqAyuWI2MjNi  

---

## 💖 Поддержать проект

Если расширение оказалось полезным:

- 💰 ЮMoney: https://yoomoney.ru/to/410017075141979  
- 🏦 T-Банк: `5536 9139 8572 3523`

---

## 📌 Статус проекта

Проект активно развивается.  
Функциональность, методы анализа и интеграции будут расширяться.

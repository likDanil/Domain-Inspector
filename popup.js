document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scanBtn');
    const copyBtn = document.getElementById('copyBtn');
    const domainsPre = document.getElementById('domains');
    const themeBtn = document.getElementById('themeBtn');
    const body = document.body;
    const style = document.getElementById('theme-style');

    function sendMessage(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        setDarkTheme();
    }

    themeBtn.addEventListener('click', () => {
        const isDark = body.classList.contains('dark-theme');
        if (isDark) {
            setLightTheme();
        } else {
            setDarkTheme();
        }
    });

    function setDarkTheme() {
        body.classList.add('dark-theme');
        themeBtn.textContent = '🌙';
        body.style.opacity = 0.7;
        setTimeout(() => {
            style.textContent = getDarkThemeCSS();
            body.style.transition = 'opacity 0.4s ease';
            body.style.opacity = 1;
        }, 10);
        localStorage.setItem('theme', 'dark');
    }

    function setLightTheme() {
        body.classList.remove('dark-theme');
        themeBtn.textContent = '🌞';
        body.style.opacity = 0.7;
        setTimeout(() => {
            style.textContent = getLightThemeCSS();
            body.style.transition = 'opacity 0.4s ease';
            body.style.opacity = 1;
        }, 10);
        localStorage.setItem('theme', 'light');
    }

    function getLightThemeCSS() {
        return `
            body, pre, button:not(#themeBtn), .footer {
                transition: background-color 0.4s ease, color 0.4s ease;
            }
            body {
                width: 400px;
                font-family: Arial, sans-serif;
                padding: 10px;
                font-size: 14px;
                background: white;
                color: #222;
                position: relative;
                margin: 0;
            }
            button {
                display: block;
                width: 100%;
                padding: 10px;
                font-size: 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-bottom: 15px;
            }
            button#scanBtn {
                background-color: #0077cc;
                color: white;
            }
            button#scanBtn:hover {
                background-color: #005fa3;
            }
            button#copyBtn {
                background-color: #4CAF50;
                color: white;
            }
            button#copyBtn:hover {
                background-color: #388E3C;
            }
            button#themeBtn {
                position: absolute;
                top: 10px;
                right: 10px;
                width: auto;
                padding: 6px 10px;
                font-size: 14px;
                background: #f0f0f0;
                border: 1px solid #ccc;
                color: #333;
                border-radius: 4px;
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            button#themeBtn:hover {
                background: #e0e0e0;
            }
            pre {
                background: #f4f4f4;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
                white-space: pre-wrap;
                word-break: break-all;
                max-height: 400px;
                overflow-y: auto;
            }
            .footer {
                font-size: 12px;
                color: #666;
                text-align: center;
                margin-top: 20px;
            }
            #copyBtn {
                display: none;
            }
        `;
    }

    function getDarkThemeCSS() {
        return `
            body, pre, button:not(#themeBtn), .footer {
                transition: background-color 0.4s ease, color 0.4s ease;
            }
            body {
                width: 400px;
                font-family: Arial, sans-serif;
                padding: 10px;
                font-size: 14px;
                background: #1e1e1e;
                color: #eee;
                position: relative;
                margin: 0;
            }
            button {
                display: block;
                width: 100%;
                padding: 10px;
                font-size: 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-bottom: 15px;
            }
            button#scanBtn {
                background-color: #0066cc;
            }
            button#scanBtn:hover {
                background-color: #0055aa;
            }
            button#copyBtn {
                background-color: #45a049;
            }
            button#copyBtn:hover {
                background-color: #3a853a;
            }
            button#themeBtn {
                position: absolute;
                top: 10px;
                right: 10px;
                width: auto;
                padding: 6px 10px;
                font-size: 14px;
                background: #333;
                border: 1px solid #555;
                color: #ddd;
                border-radius: 4px;
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            button#themeBtn:hover {
                background: #444;
            }
            pre {
                background: #2d2d2d;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
                white-space: pre-wrap;
                word-break: break-all;
                max-height: 400px;
                overflow-y: auto;
                color: #e0e0e0;
            }
            .footer {
                font-size: 12px;
                color: #aaa;
                text-align: center;
                margin-top: 20px;
            }
            #copyBtn {
                display: none;
            }
        `;
    }

    copyBtn.style.display = 'none';

    scanBtn.addEventListener('click', async () => {
        domainsPre.textContent = '🔍 Идёт поиск...';
        copyBtn.style.display = 'none';

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await sendMessage(tabs[0].id, { action: "getDomains" });

            const domains = response.domains;
            if (domains.length === 0) {
                domainsPre.textContent = "Не найдено доменов. Попробуйте позже.";
            } else {
                domainsPre.textContent = domains.join('\n');
                copyBtn.style.display = 'block';
            }
        } catch (err) {
            domainsPre.textContent = "❌ Не удалось получить данные. Перезагрузите страницу и попробуйте снова.";
            copyBtn.style.display = 'none';
        }
    });

    copyBtn.addEventListener('click', () => {
        const domainsText = domainsPre.textContent;
        navigator.clipboard.writeText(domainsText).then(() => {
            copyBtn.textContent = '✅ Скопировано!';
            setTimeout(() => {
                copyBtn.textContent = '📋 Скопировать все домены';
            }, 2000);
        }).catch(err => {
            console.error('Не удалось скопировать:', err);
            copyBtn.textContent = '❌ Ошибка копирования';
            setTimeout(() => {
                copyBtn.textContent = '📋 Скопировать все домены';
            }, 2000);
        });
    });
});
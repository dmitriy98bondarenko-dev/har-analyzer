        const fileInput = document.getElementById('har-file-input');
        const missingEventList = document.getElementById('missing-event-list');
        const unknownEventList = document.getElementById('unknown-event-list');
        const deviceInfoDetails = document.getElementById('device-info-details');
        const fileNameSpan = document.getElementById('file-name');
        const statusMessage = document.getElementById('status-message');
        const sheetUrlInput = document.getElementById('sheet-url-input');
        const compareButton = document.getElementById('compare-button');

        let selectedHarFile = null;

        fileInput.addEventListener('change', handleFileSelect);
        sheetUrlInput.addEventListener('input', updateButtonState);
        compareButton.addEventListener('click', startComparison);
        
        function updateButtonState() {
            const urlEntered = sheetUrlInput.value.trim() !== '';
            const fileSelected = selectedHarFile !== null;
            compareButton.disabled = !(urlEntered && fileSelected);
        }

        function handleFileSelect(event) {
            selectedHarFile = event.target.files[0];
            if (selectedHarFile) {
                fileNameSpan.textContent = `Обрано файл: ${selectedHarFile.name}`;
            } else {
                fileNameSpan.textContent = 'Файл не обрано';
            }
            updateButtonState();
        }
        
        function convertGoogleSheetUrlToCsvUrl(url) {
            const idRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
            const idMatch = url.match(idRegex);

            if (!idMatch || !idMatch[1]) {
                return null;
            }
            const sheetId = idMatch[1];

            const gidRegex = /[#&]gid=(\d+)/;
            const gidMatch = url.match(gidRegex);
            
            let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

            if (gidMatch && gidMatch[1]) {
                const gid = gidMatch[1];
                csvUrl += `&gid=${gid}`;
            }
            
            return csvUrl;
        }

        async function fetchKnownEvents(userUrl) {
            const csvUrl = convertGoogleSheetUrlToCsvUrl(userUrl);
            if (!csvUrl) {
                throw new Error('Невірний URL Google Таблиці. Переконайтеся, що посилання коректне.');
            }
            
            statusMessage.textContent = 'Завантаження списку відомих подій з Google Sheets...';
            statusMessage.style.color = '#007aff';

            try {
                const response = await fetch(csvUrl);
                if (!response.ok) {
                    throw new Error(`Мережева помилка: ${response.statusText}`);
                }
                const csvText = await response.text();
                
                const knownEventsMap = new Map();
                const rows = csvText.split('\n');
                const startIndex = rows[0].toLowerCase().includes("event_type") ? 1 : 0;

                for (let i = startIndex; i < rows.length; i++) {
                    const row = rows[i].trim();
                    if (row.length === 0) continue;
                    
                    const cleanedRow = row.startsWith('"') && row.endsWith('"') ? row.slice(1, -1) : row;
                    const columns = cleanedRow.split('","');
                    
                   const eventType = columns[0];
                  const description = columns[1] || 'Опис не надано.';
                  const customPropsRaw = columns[2] || '';
                  
                  let customProps = null;
                  if (customPropsRaw) {
                    try {
                      const match = customPropsRaw.match(/{[\s\S]+}/);
                      if (match) {
                        customProps = JSON.parse(match[0]);
                      }
                    } catch (e) {
                      console.warn(`Не вдалося розпарсити custom_properties для ${eventType}:`, customPropsRaw);
                    }
                  }
                  if (eventType) {
                    knownEventsMap.set(eventType, { description, customProps });
                  }
                }
                
                statusMessage.textContent = 'Список відомих подій успішно завантажено.';
                statusMessage.style.color = '#34c759';
                return knownEventsMap;

            } catch (error) {
                statusMessage.textContent = `Помилка завантаження таблиці: ${error.message}`;
                statusMessage.style.color = '#d93025';
                console.error('Ошибка при загрузке Google Sheet:', error);
                throw error;
            }
        }

        async function startComparison() {
            const userUrl = sheetUrlInput.value.trim();
            missingEventList.innerHTML = '<li class="empty">...</li>';
            unknownEventList.innerHTML = '<li class="empty">...</li>';
            deviceInfoDetails.innerHTML = '<li class="empty">...</li>';

            try {
                const knownEventsMap = await fetchKnownEvents(userUrl);

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const harData = JSON.parse(e.target.result);
                        
                        const deviceInfo = findDeviceObject(harData);
                        const appVersion = findAppVersion(harData);
                        const userId = findUserId(harData);
                        displayDeviceInfo(deviceInfo, appVersion, userId);
                        
                        const harEventsArray = findEventTypesAdvanced(harData);

const missingEvents = [];
const invalidEvents = [];

// Перевіряємо кожен івент з таблиці
for (const [eventType, info] of knownEventsMap.entries()) {
    const match = harEventsArray.find(e => e.type === eventType);

    if (!match) {
            missingEvents.push(eventType);
    } else {
    // Якщо івент є і у таблиці очікувались customProps → перевіряємо
            if (info.customProps) {
                    const allMatch = Object.entries(info.customProps).every(
                            ([key, val]) => match.customProps && match.customProps[key] === val
                    );
                    if (!allMatch) {
                            invalidEvents.push({
                                    type: eventType,
                                    expected: info.customProps,
                                    actual: match.customProps
                            });
                    }
            }
    }
}

// Події з HAR, яких немає в таблиці
const unknownEvents = harEventsArray
    .map(e => e.type)
    .filter(eventType => !knownEventsMap.has(eventType));
                            displayMissingEvents(missingEvents, knownEventsMap);
                            displayUnknownEvents(unknownEvents);
                            displayInvalidEvents(invalidEvents);
                            displayHarCustomEvents(harEventsArray);


                        // После анализа отправляем отчет
                        sendEmailReport(missingEvents, unknownEvents, userUrl, deviceInfo, appVersion, userId, selectedHarFile, statusMessage);


                    } catch (error) {
                        displayError("Помилка! Не вдалося прочитати файл. Переконайтеся, що це коректний .har (JSON) файл.");
                        console.error("Ошибка парсинга HAR файла:", error);
                    }
                };
                reader.readAsText(selectedHarFile);

            } catch (error) {
                return;
            }
        }

        function findDeviceObject(harData) {
            let deviceObject = null;
            const requiredKeys = ['brand', 'model', 'os_version', 'os'];

            function recursiveDeviceSearch(obj) {
                if (deviceObject) return; // Stop if already found
                if (typeof obj !== 'object' || obj === null) return;

                if (obj.hasOwnProperty('device')) {
                    const potentialDevice = obj.device;
                    const hasAllKeys = requiredKeys.every(key => potentialDevice.hasOwnProperty(key));
                    if (hasAllKeys) {
                        deviceObject = potentialDevice;
                        return;
                    }
                }

                for (const k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        recursiveDeviceSearch(obj[k]);
                    }
                }
            }
            
            if (harData && harData.log && harData.log.entries) {
                for (const entry of harData.log.entries) {
                    if (deviceObject) break;
                    const textSources = [];
                    if (entry.request?.postData?.text) textSources.push(entry.request.postData.text);
                    if (entry.response?.content?.text) textSources.push(entry.response.content.text);
                    
                    for (const text of textSources) {
                        try {
                            recursiveDeviceSearch(JSON.parse(text));
                            if(deviceObject) break;
                        } catch (e) { /* ignore */ }
                    }
                }
            }
            return deviceObject;
        }

        function findAppVersion(harData) {
            let appVersion = null;

            function recursiveSearch(obj) {
                if (appVersion) return; // Stop if already found
                if (typeof obj !== 'object' || obj === null) return;

                if (obj.hasOwnProperty('app') && typeof obj.app === 'object' && obj.app !== null && obj.app.hasOwnProperty('version')) {
                    appVersion = obj.app.version;
                    return;
                }
                
                if (obj.hasOwnProperty('event_type') && obj.event_type === 'app' && obj.hasOwnProperty('version')) {
                    appVersion = obj.version;
                    return;
                }

                for (const k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        recursiveSearch(obj[k]);
                    }
                }
            }

            if (harData && harData.log && harData.log.entries) {
                for (const entry of harData.log.entries) {
                    if (appVersion) break;
                    const textSources = [];
                    if (entry.request?.postData?.text) textSources.push(entry.request.postData.text);
                    if (entry.response?.content?.text) textSources.push(entry.response.content.text);

                    for (const text of textSources) {
                        try {
                            recursiveSearch(JSON.parse(text));
                            if (appVersion) break;
                        } catch (e) { /* ignore */ }
                    }
                }
            }
            return appVersion;
        }
        
function findUserId(harData) {
  let userId = null;

  function recursiveSearch(obj) {
    if (userId) return;
    if (typeof obj !== 'object' || obj === null) return;

    if (obj.hasOwnProperty('user_id') && typeof obj.user_id === 'string') {
      userId = obj.user_id;
      return;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        recursiveSearch(obj[key]);
      }
    }
  }

  if (harData?.log?.entries) {
    for (const entry of harData.log.entries) {
      if (userId) break;

      const textSources = [];
      if (entry.request?.postData?.text) textSources.push(entry.request.postData.text);
      if (entry.response?.content?.text) textSources.push(entry.response.content.text);

      for (const text of textSources) {
        try {
          recursiveSearch(JSON.parse(text));
          if (userId) break;
        } catch (e) {}
      }
    }
  }

  return userId;
}

        function findEventTypesAdvanced(harData) {
                const foundEvents = [];
                const searchKey = 'event_type';
                
                function recursiveSearch(obj) {
                        if (typeof obj !== 'object' || obj === null) return;
                        
                        if (searchKey in obj) {
                                foundEvents.push({
                                        type: String(obj[searchKey]),
                                        customProps: obj.custom_properties || null,
                                        timestamp: obj.event_timestamp || null
                                });
                        }
                        for (const k in obj) {
                                if (obj.hasOwnProperty(k)) recursiveSearch(obj[k]);
                        }
                }
                
                function parseUrlEncoded(text) {
                        try {
                                const params = new URLSearchParams(text);
                                if (params.has(searchKey)) {
                                        foundEvents.push({
                                                type: params.get(searchKey),
                                                customProps: null,
                                                timestamp: null
                                        });
                                }
                        } catch(e) { /* ігноруємо */ }
                }
                if (harData?.log?.entries) {
                        for (const entry of harData.log.entries) {
                                if (entry.request?.url) {
                                        try {
                                                const url = new URL(entry.request.url);
                                                if (url.searchParams.has(searchKey)) {
                                                        foundEvents.push({
                                                                type: url.searchParams.get(searchKey),
                                                                customProps: null,
                                                                timestamp: null
                                                        });
                                                }
                                        } catch(e) {}
                                }
                                if (entry.request?.postData?.text) {
                                  const text = entry.request.postData.text;
                                  try {
                    recursiveSearch(JSON.parse(text));
                } catch (e) {
                    parseUrlEncoded(text);
                }
            }

            if (entry.response?.content?.text) {
                try {
                    recursiveSearch(JSON.parse(entry.response.content.text));
                } catch (e) {}
            }
        }
    }

    return foundEvents;
}


        function displayDeviceInfo(deviceInfo, appVersion, userId) {
            deviceInfoDetails.innerHTML = '';
            let infoFound = false;
            if (deviceInfo) {
                infoFound = true;
                for (const key in deviceInfo) {
                    if (deviceInfo.hasOwnProperty(key)) {
                        const li = document.createElement('li');
                        li.innerHTML = `<strong>${key}:</strong> ${deviceInfo[key]}`;
                        deviceInfoDetails.appendChild(li);
                    }
                }
            }
            if (appVersion) {
                infoFound = true;
                const li = document.createElement('li');
                li.innerHTML = `<strong>app version:</strong> ${appVersion}`;
                deviceInfoDetails.appendChild(li);
            }
            if (userId) {
                infoFound = true;
                const li = document.createElement('li');
                li.innerHTML = `<strong>User ID:</strong> ${userId}`;
                deviceInfoDetails.appendChild(li);
            }

            if (!infoFound) {
                const li = document.createElement('li');
                li.className = 'empty';
                li.textContent = 'Інформація про пристрій та версію не знайдена...';
                deviceInfoDetails.appendChild(li);
            }
        }

        function displayMissingEvents(events, knownEventsMap) {
    missingEventList.innerHTML = '';

    if (events.length > 0) {
        events.forEach(eventType => {
            const li = document.createElement('li');

            const eventNameSpan = document.createElement('span');
            eventNameSpan.textContent = eventType;
            li.appendChild(eventNameSpan);

            const info = knownEventsMap.get(eventType);
            const description = info?.description || 'Опис для цієї події не знайдено в таблиці.';

            const spoilerDiv = document.createElement('div');
            spoilerDiv.className = 'spoiler-content';

            // Основний опис
            let spoilerHtml = description;

            // Якщо є custom_properties у таблиці → додаємо форматований блок
            if (info?.customProps) {
                spoilerHtml += `\n\nОчікувані custom_properties:\n${JSON.stringify(info.customProps, null, 2)}`;
            }

            spoilerDiv.textContent = spoilerHtml;
            li.appendChild(spoilerDiv);

            li.addEventListener('click', () => {
                const isVisible = spoilerDiv.style.display === 'block';
                spoilerDiv.style.display = isVisible ? 'none' : 'block';
                li.classList.toggle('active', !isVisible);
            });

            missingEventList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'Пропущених подій немає. Всі події з таблиці були знайдені у файлі.';
        missingEventList.appendChild(li);
    }
}


        function displayUnknownEvents(events) {
            unknownEventList.innerHTML = '';

            if (events.length > 0) {
                 const uniqueUnknownEvents = [...new Set(events)];
                uniqueUnknownEvents.forEach(eventType => {
                    const li = document.createElement('li');
                    li.textContent = eventType;
                    unknownEventList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.className = 'empty';
                li.textContent = 'Нових/невідомих подій у файлі не знайдено.';
                unknownEventList.appendChild(li);
            }
        }

function displayInvalidEvents(events) {
    const container = document.getElementById('invalid-event-list');
    if (!container) {
        console.warn('invalid-event-list not found in DOM');
        return;
    }
    container.innerHTML = '';

    if (events.length > 0) {
        events.forEach(ev => {
            const li = document.createElement('li');

            const title = document.createElement('strong');
            title.textContent = ev.type;
            li.appendChild(title);

            const spoilerDiv = document.createElement('div');
            spoilerDiv.className = 'spoiler-content';
            spoilerDiv.textContent = 
                `Очікувалося: ${JSON.stringify(ev.expected, null, 2)}\n` +
                `Отримано: ${JSON.stringify(ev.actual, null, 2)}`;
            
            li.appendChild(spoilerDiv);

            li.addEventListener('click', () => {
                const isVisible = spoilerDiv.style.display === 'block';
                spoilerDiv.style.display = isVisible ? 'none' : 'block';
                li.classList.toggle('active', !isVisible);
            });

            container.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'Всі custom_properties співпали.';
        container.appendChild(li);
    }
}
function displayHarCustomEvents(harEventsArray) {
    const container = document.getElementById('har-custom-events');
    if (!container) return;
    container.innerHTML = '';

    const eventsWithCustom = harEventsArray.filter(e => e.customProps);

    if (eventsWithCustom.length > 0) {
        eventsWithCustom.forEach(ev => {
            const li = document.createElement('li');

            // Назва івента з часом
            const eventNameSpan = document.createElement('span');
            const date = new Date(ev.timestamp || 0);
            const timeStr = ev.timestamp ? ` (${date.toLocaleTimeString()})` : '';
            eventNameSpan.textContent = ev.type + timeStr;
            li.appendChild(eventNameSpan);

            // Спойлер з JSON
            const propsDiv = document.createElement('div');
            propsDiv.className = 'spoiler-content';

            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(ev.customProps, null, 2);
            propsDiv.appendChild(pre);

            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy JSON';
            copyBtn.className = 'copy-btn';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // щоб не згортати/розгортати спойлер
                navigator.clipboard.writeText(pre.textContent)
                  .then(() => {
                      copyBtn.textContent = 'Copied!';
                      setTimeout(() => copyBtn.textContent = 'Copy JSON', 1500);
                  });
            });
            propsDiv.appendChild(copyBtn);

            li.appendChild(propsDiv);

            li.addEventListener('click', () => {
                const isVisible = propsDiv.style.display === 'block';
                propsDiv.style.display = isVisible ? 'none' : 'block';
                li.classList.toggle('active', !isVisible);
            });

            container.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'У HAR-файлі немає івентів з custom_properties.';
        container.appendChild(li);
    }
}



        
        function displayError(message) {
            missingEventList.innerHTML = '';
            unknownEventList.innerHTML = '';
            deviceInfoDetails.innerHTML = '';

            const li = document.createElement('li');
            li.className = 'error';
            li.textContent = message;

            // Display error in all sections for visibility
            missingEventList.appendChild(li.cloneNode(true));
            unknownEventList.appendChild(li.cloneNode(true));
            deviceInfoDetails.appendChild(li);
        }

//app.js
import { showAlert } from './ui.js';
import { findEventTypesAdvanced, renderEventList, attachEventSpoiler } from './har-utils.js';
document.addEventListener('DOMContentLoaded', () => {
    const missingEventsSection = document.getElementById('missing-events-section');
    const unknownEventsSection = document.getElementById('unknown-events-section');
    const harCustomEventsSection = document.getElementById('har-custom-events-section');

    const fileInput = document.getElementById('har-file-input');
    const missingEventList = document.getElementById('missing-event-list');
    const unknownEventList = document.getElementById('unknown-event-list');
    const deviceInfoDetails = document.getElementById('device-info-details');
    const fileNameSpan = document.getElementById('file-name');
    const statusMessage = document.getElementById('status-message');
    const sheetUrlInput = document.getElementById('sheet-url-input');
    const compareButton = document.getElementById('compare-button');
    missingEventsSection.classList.add('hidden');
    unknownEventsSection.classList.add('hidden');
    harCustomEventsSection.classList.add('hidden');

    let selectedHarFile = null;
    let hideUnknownDuplicates = true;
    let hideDuplicates = true;

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
                    const headerRow = rows[0].toLowerCase();
                    const startIndex = (headerRow.includes("event_type") || headerRow.includes("назва івенту")) ? 1 : 0;

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
                        const foundEvents = [];

// Перевіряємо кожен івент з таблиці
                        for (const [eventType, info] of knownEventsMap.entries()) {
                            const match = harEventsArray.find(e => e.type === eventType);

                            if (!match) {
                                missingEvents.push(eventType);
                            } else {
                                foundEvents.push(match);

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
                        displayFoundEvents(foundEvents);
                        displayMissingEvents(missingEvents, knownEventsMap);
                        displayUnknownEvents(harEventsArray, knownEventsMap);
                        displayHarCustomEvents(harEventsArray);

                        missingEventsSection.classList.remove('hidden');
                        unknownEventsSection.classList.remove('hidden');
                        harCustomEventsSection.classList.remove('hidden');

                        showAlert(`Порівняння завершено. Знайдено ${foundEvents.length} івентів з таблиці.`, 'success');

                    } catch (error) {
                        showAlert('Помилка при читанні HAR файлу', 'error');
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

    function displayFoundEvents(foundEvents) {
        let container = document.getElementById('found-events-list');
        if (!container) {
            const section = document.createElement('section');
            section.id = 'found-events-section';
            section.className = 'results-section';
            section.innerHTML = `
      <h2>Івенти з таблиці, які знайдено у HAR файлі:</h2>
      <ul id="found-events-list"></ul>
    `;
            const deviceInfoContainer = document.getElementById('device-info-container');
            deviceInfoContainer.insertAdjacentElement('afterend', section);

            container = section.querySelector('ul');
        }

        renderEventList(container, foundEvents, `Івенти з таблиці, які знайдено у HAR файлі`);
    }

    function displayMissingEvents(events, knownEventsMap) {
    missingEventList.innerHTML = '';

    if (events.length > 0) {
        events.forEach(eventType => {
            const li = document.createElement('li');

            const eventNameSpan = document.createElement('span');
                const match = [...document.querySelectorAll("#har-custom-events li")]
                        .map(li => li.dataset)
                        .find(d => d.type === eventType);
                let timeStr = "";
                if (match && match.timestamp) {
                        const date = new Date(Number(match.timestamp));
                        timeStr = ` (${date.toLocaleTimeString()})`;
                }
                eventNameSpan.textContent = eventType + timeStr;
                li.appendChild(eventNameSpan);


            const info = knownEventsMap.get(eventType);
            const description = info?.description || 'Опис для цієї події не знайдено в таблиці.';

            attachEventSpoiler(li, eventNameSpan, info?.customProps);
            missingEventList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'Пропущених подій немає. Всі події з таблиці були знайдені у файлі.';
        missingEventList.appendChild(li);
    }
                // каунтер івентів
const titleMissing = document.querySelector('#results-container h2');
if (titleMissing) {
    titleMissing.textContent = `Івенти з таблиці, які не знайдено у файлі (${events.length}):`;
}

}

    function displayUnknownEvents(harEventsArray, knownEventsMap) {
        const unknownEvents = harEventsArray.filter(ev => !knownEventsMap.has(ev.type));
        renderEventList(unknownEventList, unknownEvents, 'Івенти, знайдені у файлі, але відсутні у таблиці');
    }

    function displayHarCustomEvents(harEventsArray) {
        const container = document.getElementById('har-custom-events');
        if (!container) return;

        const eventsWithCustom = harEventsArray.filter(e => e.customProps);
        renderEventList(container, eventsWithCustom, 'Івенти з HAR-файлу в котрих наявний custom_properties');
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


        document.addEventListener('click', (e) => {
            if (e.target.closest('.spoiler-content')) {
                e.stopPropagation();
            }
        });

});
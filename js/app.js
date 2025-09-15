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

// ...тут весь код з функціями handleFileSelect, fetchKnownEvents, findDeviceObject, findAppVersion, findUserId, findEventTypesAdvanced, displayMissingEvents, displayUnknownEvents, displayError

async function startComparison() {
  const userUrl = sheetUrlInput.value.trim();
  missingEventList.innerHTML = '<li class="empty">...</li>';
  unknownEventList.innerHTML = '<li class="empty">...</li>';
  deviceInfoDetails.innerHTML = '<li class="empty">...</li>';

  try {
    const knownEventsMap = await fetchKnownEvents(userUrl);
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const harData = JSON.parse(e.target.result);

        const deviceInfo = findDeviceObject(harData);
        const appVersion = findAppVersion(harData);
        const userId = findUserId(harData);
        displayDeviceInfo(deviceInfo, appVersion, userId);

        const harEventsArray = findEventTypesAdvanced(harData);
        const harEventsSet = new Set(harEventsArray);

        const missingEvents = Array.from(knownEventsMap.keys()).filter(event => !harEventsSet.has(event));
        const unknownEvents = harEventsArray.filter(event => !knownEventsMap.has(event));

        displayMissingEvents(missingEvents, knownEventsMap);
        displayUnknownEvents(unknownEvents);

        // Виклик з email.js
        sendEmailReport(missingEvents, unknownEvents, userUrl, deviceInfo, appVersion, userId, selectedHarFile, statusMessage);
      } catch (error) {
        displayError("Помилка! Не вдалося прочитати файл. Переконайтеся, що це коректний .har (JSON) файл.");
        console.error("Помилка парсингу HAR:", error);
      }
    };
    reader.readAsText(selectedHarFile);

  } catch (error) {
    return;
  }
}

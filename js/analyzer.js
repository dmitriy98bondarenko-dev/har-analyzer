import { findEventTypesAdvanced, renderEventList } from './har-utils.js';
import { showAlert } from './ui.js';

const compareButton = document.getElementById('compare-button');
const fileInput = document.getElementById('har-file-input');

let selectedHarFile = null;

// Кнопка анализа
const analyzeButton = document.createElement('button');
analyzeButton.id = 'analyze-button';
analyzeButton.textContent = 'Зробити аналіз HAR файлу';
analyzeButton.disabled = true;

if (!compareButton) {
    console.error('⚠️ compareButton не найден на странице');
    throw new Error('compareButton отсутствует в DOM');
}
compareButton.insertAdjacentElement('afterend', analyzeButton);

// Контейнер анализа
const analysisSection = document.createElement('div');
analysisSection.className = 'results-section';
analysisSection.innerHTML = `
  <h2>Повний список подій з HAR файлу:</h2>
  <ul id="analysis-event-list"><li class="empty">Ще не проводився аналіз...</li></ul>
`;
document.body.appendChild(analysisSection);

const analysisList = analysisSection.querySelector('#analysis-event-list');

fileInput.addEventListener('change', (e) => {
    selectedHarFile = e.target.files[0];
    analyzeButton.disabled = !selectedHarFile;
});

analyzeButton.addEventListener('click', () => {
    if (!selectedHarFile) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const harData = JSON.parse(e.target.result);
            const harEvents = findEventTypesAdvanced(harData)
                .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            renderEventList(analysisList, harEvents, 'Повний список івентів');
            showAlert(`Аналіз завершено. Знайдено ${harEvents.length} івентів`, 'success');
        } catch (err) {
            showAlert('Не вдалося проаналізувати файл. Переконайтеся, що це .har', 'error');
            console.error(err);
        }
    };
    reader.readAsText(selectedHarFile);
});

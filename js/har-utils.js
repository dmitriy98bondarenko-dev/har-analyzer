// har-utils.js
import { showAlert } from './ui.js';

export function findEventTypesAdvanced(harData) {
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
export function renderEventList(container, eventsArray, titleText = 'Івенти', toggleDuplicates = true) {
    container.innerHTML = '';

    // Кнопка переключения дубликатов
    let toggleBtn = container.parentNode.querySelector('.toggle-btn');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.textContent = 'Показати всі';
        container.parentNode.insertBefore(toggleBtn, container);
    }

    let hideDuplicates = toggleDuplicates;

    toggleBtn.onclick = () => {
        hideDuplicates = !hideDuplicates;
        toggleBtn.textContent = hideDuplicates ? 'Показати всі' : 'Приховати дублікати';
        renderList();
    };

    function renderList() {
        container.innerHTML = '';
        let list = [...eventsArray];

        if (hideDuplicates) {
            const latestMap = new Map();
            for (const ev of list) {
                if (!latestMap.has(ev.type) || (ev.timestamp || 0) > (latestMap.get(ev.type).timestamp || 0)) {
                    latestMap.set(ev.type, ev);
                }
            }
            list = [...latestMap.values()];
        }

        if (list.length === 0) {
            const li = document.createElement('li');
            li.className = 'empty';
            li.textContent = 'Івенти не знайдено';
            container.appendChild(li);
        } else {
            list.forEach(ev => {
                const li = document.createElement('li');
                const span = document.createElement('span');
                const date = ev.timestamp ? new Date(Number(ev.timestamp)) : null;
                const timeStr = date ? ` (${date.toLocaleTimeString()})` : '';
                span.textContent = ev.type + timeStr;
                li.appendChild(span);

                attachEventSpoiler(li, ev.customProps);
                container.appendChild(li);
            });
        }

        const title = container.parentNode.querySelector('h2');
        if (title) {
            title.textContent = `${titleText} (${list.length})`;
        }
    }

    renderList();
}


export function attachEventSpoiler(li, customProps) {
    const propsDiv = document.createElement('div');
    propsDiv.className = 'spoiler-content';

    const pre = document.createElement('pre');
    pre.textContent = customProps ? JSON.stringify(customProps, null, 2) : 'Немає custom properties';
    propsDiv.appendChild(pre);

    if (customProps) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn-bottom';
        copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
                 stroke-width="1.5" stroke="currentColor" class="icon-copy">
              <path stroke-linecap="round" stroke-linejoin="round" 
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 
                0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 
                9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 
                1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 
                9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 
                1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 
                1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 
                0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 
                1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
            </svg>
        `;

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(JSON.stringify(customProps, null, 2)).then(() => {
                showAlert('Скопійовано', 'success');
            });
        });

        propsDiv.appendChild(copyBtn);
    }

    li.appendChild(propsDiv);

    li.addEventListener('click', (e) => {
        if (e.target.closest('.copy-btn-bottom') || e.target.closest('pre')) return;
        const isVisible = propsDiv.style.display === 'block';
        propsDiv.style.display = isVisible ? 'none' : 'block';
        li.classList.toggle('active', !isVisible);
    });
}
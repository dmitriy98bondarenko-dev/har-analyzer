const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Перевірити localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
body.classList.add(savedTheme + '-theme');

// Перемикач
themeToggle.addEventListener('click', () => {
  if (body.classList.contains('light-theme')) {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  }
});


export function showAlert(message, type = 'info', duration = 5000) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;

    // SVG иконки по типу
    const icons = {
        info: `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="alert-icon-svg">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        `,
        success: `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="alert-icon-svg">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
        `,
        error: `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="alert-icon-svg">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM12 3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
        `
    };

    // SVG кнопка закрытия (крестик)
    const closeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="close-icon-svg">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'alert-icon';
    iconWrapper.innerHTML = icons[type] || icons.info;

    const text = document.createElement('span');
    text.className = 'alert-text';
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'alert-close';
    closeBtn.innerHTML = closeSvg;
    closeBtn.addEventListener('click', () => removeAlert(alert));

    alert.appendChild(iconWrapper);
    alert.appendChild(text);
    alert.appendChild(closeBtn);

    container.appendChild(alert);

    // анимация появления
    setTimeout(() => alert.classList.add('show'), 10);

    const timer = setTimeout(() => removeAlert(alert), duration);

    function removeAlert(el) {
        clearTimeout(timer);
        el.classList.remove('show');
        el.classList.add('hide');
        setTimeout(() => el.remove(), 300);
    }
}

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

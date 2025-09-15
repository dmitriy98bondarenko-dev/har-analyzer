// --- EmailJS setup ---
const EMAILJS_SERVICE_ID = 'service_p5bvh7e';
const EMAILJS_TEMPLATE_ID = 'template_k28v8y8';
const EMAILJS_USER_ID = 'HZBtYKdBCpFPC-zG8';

(function () {
  emailjs.init(EMAILJS_USER_ID);
})();

function sendEmailReport(
  missingEvents,
  unknownEvents,
  sheetUrl,
  deviceInfo,
  appVersion,
  userId,
  selectedHarFile,
  statusMessage
) {
  const reportDate = new Date().toLocaleString('uk-UA');

  // ✅ захист від undefined
  const fileName = selectedHarFile ? selectedHarFile.name : 'Невідомий файл';
  const subject = `Звіт від ${reportDate} для файлу: ${fileName}`;

  // Формуємо HTML для email
  let deviceInfoHtml = '<h3>Інформація про пристрій та версію:</h3>';
  if (deviceInfo || appVersion || userId) {
    deviceInfoHtml += '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; border-color: #ddd;"><tbody>';
    if (deviceInfo) {
      for (const key in deviceInfo) {
        deviceInfoHtml += `<tr><td><b>${key}</b></td><td>${deviceInfo[key]}</td></tr>`;
      }
    }
    if (appVersion) {
      deviceInfoHtml += `<tr><td><b>version</b></td><td>${appVersion}</td></tr>`;
    }
    if (userId) {
      deviceInfoHtml += `<tr><td><b>User ID</b></td><td>${userId}</td></tr>`;
    }
    deviceInfoHtml += '</tbody></table>';
  } else {
    deviceInfoHtml += '<p>Інформація про пристрій та версію не знайдена.</p>';
  }

  // Missing events
  let missingEventsHtml = '<h3>Події з таблиці, які не знайдено у файлі:</h3>';
  missingEventsHtml += missingEvents.length > 0
    ? `<ul>${missingEvents.map(e => `<li>${e}</li>`).join('')}</ul>`
    : '<p>Пропущених подій немає.</p>';

  // Unknown events
  let unknownEventsHtml = '<h3>Події, знайдені у файлі, але відсутні у таблиці:</h3>';
  unknownEventsHtml += unknownEvents.length > 0
    ? `<ul>${[...new Set(unknownEvents)].map(e => `<li>${e}</li>`).join('')}</ul>`
    : '<p>Нових/невідомих подій немає.</p>';

  const templateParams = {
    subject: subject,
    har_file_name: fileName, // ✅ тут тепер теж безпечна змінна
    sheet_url: sheetUrl,
    email_body_html: deviceInfoHtml + missingEventsHtml + unknownEventsHtml,
    to_email: 'dmitriy98bondarenko@gmail.com'
  };

  statusMessage.textContent = 'Відправка звіту на пошту...';
  statusMessage.style.color = '#007aff';

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => {
      statusMessage.textContent = 'Порівняння завершено. Звіт успішно відправлено!';
      statusMessage.style.color = '#34c759';
    })
    .catch(() => {
      statusMessage.textContent = 'Порівняння завершено, але сталася помилка відправки звіту.';
      statusMessage.style.color = '#d93025';
    });
}

require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const path = require('path');

// Путь к файлу с учетными данными
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Проверяем наличие файла с учетными данными
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('Ошибка: Файл credentials.json не найден.');
  console.error('Пожалуйста, создайте проект в Google Cloud Console,');
  console.error(
    'включите Google Sheets API и скачайте учетные данные OAuth 2.0.'
  );
  console.error(
    'Сохраните файл как credentials.json в корневой папке проекта.'
  );
  process.exit(1);
}

// Чтение данных из файла credentials.json
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Определение необходимых разрешений
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Создание URL для авторизации
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Для авторизации перейдите по следующей ссылке:');
console.log(authUrl);
console.log(
  '\nПосле авторизации вы будете перенаправлены на страницу с кодом.'
);
console.log('Скопируйте этот код и вставьте его ниже:');

// Создание интерфейса для чтения ввода пользователя
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Получение кода авторизации от пользователя
rl.question('Код: ', async (code) => {
  rl.close();

  try {
    // Обмен кода на токен
    const { tokens } = await oAuth2Client.getToken(code);

    // Сохранение токена в файл
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    console.log('Токен успешно получен и сохранен в файл token.json');
    console.log('Теперь вы можете запустить бота командой: node index.js');
  } catch (error) {
    console.error('Ошибка при получении токена:', error.message);
    console.error('Пожалуйста, попробуйте еще раз.');
  }
});

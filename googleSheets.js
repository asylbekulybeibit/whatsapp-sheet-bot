const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Путь к файлу с учетными данными
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

/**
 * Получение авторизованного клиента Google Sheets API
 */
async function getAuthClient() {
  try {
    // Проверяем наличие файла с учетными данными
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(
        'Файл credentials.json не найден. Создайте его в Google Cloud Console'
      );
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } =
      credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Проверяем наличие токена
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      throw new Error(
        'Токен не найден. Запустите скрипт getToken.js для его получения:\n' +
          'node getToken.js'
      );
    }
  } catch (error) {
    console.error('Ошибка при получении авторизации:', error);
    throw error;
  }
}

/**
 * Получение нового токена авторизации
 * Эта функция для справки, используйте getToken.js для получения токена
 */
async function getNewToken(oAuth2Client) {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Для получения токена авторизации запустите скрипт getToken.js:');
  console.log('node getToken.js');

  throw new Error('Требуется авторизация. Запустите скрипт getToken.js');
}

/**
 * Чтение данных из Google Sheets
 */
async function readSheetData(spreadsheetId, range) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values;
  } catch (error) {
    console.error('Ошибка при чтении данных из таблицы:', error);
    throw error;
  }
}

/**
 * Запись данных в Google Sheets
 */
async function writeSheetData(spreadsheetId, range, values) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при записи данных в таблицу:', error);
    throw error;
  }
}

/**
 * Добавление новой строки в Google Sheets
 */
async function appendSheetData(spreadsheetId, range, values) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка при добавлении данных в таблицу:', error);
    throw error;
  }
}

module.exports = {
  readSheetData,
  writeSheetData,
  appendSheetData,
  getAuthClient,
  getNewToken,
};

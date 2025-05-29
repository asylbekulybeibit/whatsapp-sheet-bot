// Загружаем переменные окружения из .env файла
require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { handleMessage } = require('./botHandlers');

// Настройка Express сервера
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Инициализация WhatsApp клиента
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox'],
  },
});

// Обработка события создания QR-кода
client.on('qr', (qr) => {
  console.log('QR КОД ПОЛУЧЕН, отсканируйте его в приложении WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Обработка события готовности клиента
client.on('ready', () => {
  console.log('WhatsApp бот запущен и готов к работе!');
});

// Обработка входящих сообщений
client.on('message', async (message) => {
  console.log(`Сообщение от ${message.from}: ${message.body}`);

  // Используем обработчик из botHandlers.js
  try {
    await handleMessage(message);
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
    message.reply(
      'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.'
    );
  }
});

// Добавляем базовые маршруты для API
app.get('/', (req, res) => {
  res.send('WhatsApp Bot Server работает!');
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
  });
});

// Запуск WhatsApp клиента
client.initialize();

// Запуск Express сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

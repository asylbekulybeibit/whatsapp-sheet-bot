// Загружаем переменные окружения из .env файла
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { handleWebhookMessage } = require('./cloudApiHandlers');

// Получаем токен для верификации вебхуков
const WEBHOOK_VERIFY_TOKEN =
  process.env.WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

// Настройка Express сервера
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Обработка GET запросов на вебхук (для верификации от Facebook)
app.get('/webhook', (req, res) => {
  // Параметр hub.verify_token проверяется с токеном, указанным при настройке вебхука
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Проверяем, что режим и токен верны
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    // Отвечаем подтверждением
    console.log('Вебхук подтвержден!');
    res.status(200).send(challenge);
  } else {
    // Неверный токен
    console.error('Ошибка верификации вебхука');
    res.sendStatus(403);
  }
});

// Обработка POST запросов на вебхук (входящие сообщения)
app.post('/webhook', express.json(), async (req, res) => {
  try {
    // Проверяем, что запрос содержит данные WhatsApp
    if (req.body.object === 'whatsapp_business_account') {
      // Обрабатываем сообщение
      await handleWebhookMessage(req.body);

      // Всегда отвечаем успешным статусом, чтобы Facebook не пытался отправить сообщение повторно
      res.sendStatus(200);
    } else {
      // Получен не WhatsApp запрос
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Ошибка при обработке вебхука:', error);
    // Все равно отвечаем успехом, чтобы Facebook не пытался отправить повторно
    res.sendStatus(200);
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

// Запуск Express сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Webhook URL: http://your-domain.com/webhook`);
  console.log('Для использования WhatsApp Cloud API необходимо:');
  console.log('1. Создать бизнес-аккаунт в Meta Business Suite');
  console.log('2. Подключить номер телефона к WhatsApp Business API');
  console.log(
    '3. Настроить вебхук в Meta for Developers, указав URL и токен верификации'
  );
  console.log(
    '4. Установить токен доступа в переменную окружения WHATSAPP_TOKEN'
  );
});

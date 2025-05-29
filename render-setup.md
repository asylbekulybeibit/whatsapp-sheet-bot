# Настройка WhatsApp бота на Render.com

Эта инструкция поможет вам развернуть WhatsApp бота с использованием WhatsApp Cloud API на платформе Render.com.

## Подготовка репозитория

1. Создайте репозиторий на GitHub с вашим кодом
2. Убедитесь, что в репозитории есть следующие файлы:
   - `package.json` с зависимостями
   - `index.js` - основной файл приложения
   - `.gitignore` - для исключения конфиденциальных данных

## Настройка WhatsApp Cloud API

1. Создайте аккаунт на [Meta for Developers](https://developers.facebook.com/)
2. Создайте приложение типа "Business"
3. Добавьте продукт WhatsApp в ваше приложение
4. Получите и сохраните:
   - Токен доступа (Permanent Access Token)
   - ID номера телефона WhatsApp

## Настройка на Render.com

1. Создайте аккаунт на [Render.com](https://render.com/)
2. Выберите "New" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Настройте сервис:

   - **Name**: `whatsapp-sheet-bot` (или любое другое имя)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: выберите "Free" для бесплатного плана

5. Добавьте переменные окружения в разделе "Environment":

   - `SPREADSHEET_ID`: ID вашей Google таблицы
   - `PORT`: 10000 (или другой порт, Render автоматически установит свой порт)
   - `WHATSAPP_PHONE_ID`: ваш ID номера телефона WhatsApp
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`: ID вашего бизнес-аккаунта WhatsApp
   - `WHATSAPP_TOKEN`: ваш токен доступа WhatsApp API
   - `WEBHOOK_VERIFY_TOKEN`: любая случайная строка, которую вы создадите для верификации вебхука

6. Нажмите "Create Web Service"

## Настройка Google Sheets API

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Включите Google Sheets API
4. Создайте учетные данные (Service Account)
5. Скачайте ключ JSON
6. В Render.com добавьте содержимое файла ключа как переменную окружения `GOOGLE_APPLICATION_CREDENTIALS_JSON`
7. Создайте файл для работы с этими учетными данными:

```javascript
// Добавьте в начало googleSheets.js
const GOOGLE_CREDENTIALS = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'
);

// Измените функцию getAuthClient для использования Service Account
async function getAuthClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth;
  } catch (error) {
    console.error('Ошибка при получении авторизации:', error);
    throw error;
  }
}
```

## Настройка вебхука WhatsApp

1. После успешного деплоя на Render.com, скопируйте URL вашего сервиса (например, `https://whatsapp-sheet-bot.onrender.com`)
2. Перейдите в Meta for Developers → Ваше приложение → WhatsApp → Configuration
3. В разделе "Webhooks" нажмите "Configure"
4. Введите:
   - **Callback URL**: `https://whatsapp-sheet-bot.onrender.com/webhook`
   - **Verify Token**: значение, которое вы указали в переменной окружения `WEBHOOK_VERIFY_TOKEN`
5. Выберите подписки для вебхука:
   - `messages`
   - `message_status_updates`

## Тестирование бота

1. Отправьте сообщение "привет" на ваш номер WhatsApp Business
2. Бот должен ответить приветственным сообщением
3. Проверьте логи в Render.com, чтобы увидеть, что сообщение было получено и обработано

## Устранение неполадок

Если бот не отвечает:

1. Проверьте логи на Render.com
2. Убедитесь, что все переменные окружения установлены правильно
3. Проверьте настройки вебхука в Meta for Developers
4. Убедитесь, что ваш номер WhatsApp Business API активен

## Дополнительные настройки

### Настройка постоянного хранилища (необязательно)

Если вам нужно хранить данные между перезапусками:

1. Используйте базу данных (например, MongoDB Atlas с бесплатным уровнем)
2. Установите пакет mongoose: `npm install mongoose`
3. Подключитесь к базе данных в вашем коде

### Настройка персонализированных шаблонов сообщений

Для отправки сообщений по инициативе бота (например, уведомлений):

1. Перейдите в Meta Business Suite → WhatsApp → Tools → Message Templates
2. Создайте и отправьте на проверку шаблоны сообщений
3. После одобрения используйте функцию `sendTemplateMessage` для их отправки

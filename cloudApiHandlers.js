const {
  readSheetData,
  writeSheetData,
  appendSheetData,
} = require('./googleSheets');
const { sendTextMessage, formatPhoneNumber } = require('./whatsappAPI');

// Конфигурация для Google Sheets
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
if (!SPREADSHEET_ID || SPREADSHEET_ID === 'ваш_идентификатор_таблицы') {
  console.warn(
    'ВНИМАНИЕ: Переменная окружения SPREADSHEET_ID не установлена или имеет значение по умолчанию.'
  );
  console.warn('Пожалуйста, укажите правильный ID таблицы в файле .env');
}

const CLIENTS_SHEET = 'Клиенты';
const ORDERS_SHEET = 'Заказы';

/**
 * Обработчик входящих сообщений из webhook
 * @param {Object} data - Данные сообщения от webhook
 */
async function handleWebhookMessage(data) {
  try {
    // Проверяем, есть ли сообщение в данных
    if (
      !data.entry ||
      !data.entry[0].changes ||
      !data.entry[0].changes[0].value.messages ||
      !data.entry[0].changes[0].value.messages[0]
    ) {
      console.log('Получены данные webhook без сообщения');
      return;
    }

    const message = data.entry[0].changes[0].value.messages[0];
    const sender = message.from; // Номер телефона отправителя

    // Обрабатываем только текстовые сообщения
    if (message.type !== 'text' || !message.text || !message.text.body) {
      console.log(`Получено нетекстовое сообщение от ${sender}`);
      return;
    }

    const text = message.text.body;
    console.log(`Сообщение от ${sender}: ${text}`);

    // Обрабатываем сообщение
    await handleIncomingMessage(sender, text);
  } catch (error) {
    console.error('Ошибка при обработке webhook сообщения:', error);
  }
}

/**
 * Обработчик входящих сообщений
 * @param {string} sender - Номер телефона отправителя
 * @param {string} text - Текст сообщения
 */
async function handleIncomingMessage(sender, text) {
  const messageText = text.toLowerCase().trim();

  // Обработка команд
  if (
    messageText === 'привет' ||
    messageText === 'начать' ||
    messageText === 'старт'
  ) {
    await handleGreeting(sender);
  } else if (messageText.startsWith('заказ')) {
    await handleOrder(sender, text);
  } else if (messageText === 'помощь' || messageText === 'help') {
    await handleHelp(sender);
  } else if (messageText === 'статус') {
    await handleStatus(sender);
  } else if (messageText.startsWith('регистрация')) {
    await handleRegistration(sender, text);
  } else {
    // Если команда не распознана
    await sendTextMessage(
      sender,
      'Извините, я не понимаю эту команду. Отправьте "помощь" для получения списка доступных команд.'
    );
  }
}

/**
 * Обработчик приветствия
 */
async function handleGreeting(sender) {
  try {
    // Проверяем, зарегистрирован ли клиент
    const clients = await readSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`);
    const clientRow = clients?.find((row) => row[0] === sender);

    if (clientRow) {
      // Клиент уже зарегистрирован
      await sendTextMessage(
        sender,
        `Здравствуйте, ${clientRow[1]}! Рады видеть вас снова.\n\n` +
          'Чем я могу помочь сегодня?\n' +
          '- Напишите "заказ" для оформления нового заказа\n' +
          '- Напишите "статус" для проверки статуса ваших заказов\n' +
          '- Напишите "помощь" для получения дополнительной информации'
      );
    } else {
      // Новый клиент
      await sendTextMessage(
        sender,
        'Здравствуйте! Я бот-помощник для вашего бизнеса.\n\n' +
          'Похоже, вы обращаетесь к нам впервые. Для регистрации, пожалуйста, отправьте сообщение в формате:\n' +
          '"регистрация Имя Компания"\n\n' +
          'Например: "регистрация Иван Ресторан Вкусно"'
      );
    }
  } catch (error) {
    console.error('Ошибка при обработке приветствия:', error);
    await sendTextMessage(
      sender,
      'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.'
    );
  }
}

/**
 * Обработчик команды помощи
 */
async function handleHelp(sender) {
  await sendTextMessage(
    sender,
    'Доступные команды:\n\n' +
      '- "привет" или "начать" - начало работы с ботом\n' +
      '- "заказ" - оформление нового заказа\n' +
      '- "статус" - проверка статуса ваших заказов\n' +
      '- "регистрация Имя Компания" - регистрация нового клиента\n' +
      '- "помощь" - вывод этой справки'
  );
}

/**
 * Обработчик команды заказа
 */
async function handleOrder(sender, text) {
  try {
    // Проверяем, зарегистрирован ли клиент
    const clients = await readSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`);
    const clientRow = clients?.find((row) => row[0] === sender);

    if (!clientRow) {
      await sendTextMessage(
        sender,
        'Для оформления заказа необходимо зарегистрироваться. Отправьте сообщение в формате:\n' +
          '"регистрация Имя Компания"'
      );
      return;
    }

    // Парсим команду заказа
    const orderText = text.substring('заказ'.length).trim();

    if (!orderText) {
      await sendTextMessage(
        sender,
        'Для оформления заказа укажите детали после слова "заказ".\n' +
          'Например: "заказ 2 пиццы, доставка в 18:00"'
      );
      return;
    }

    // Добавляем заказ в таблицу
    const orderDate = new Date().toISOString();
    await appendSheetData(SPREADSHEET_ID, `${ORDERS_SHEET}!A:D`, [
      [sender, clientRow[1], orderText, orderDate, 'Новый'],
    ]);

    await sendTextMessage(
      sender,
      'Ваш заказ успешно принят! Мы свяжемся с вами для подтверждения деталей.\n' +
        'Вы можете проверить статус заказа, отправив команду "статус".'
    );
  } catch (error) {
    console.error('Ошибка при обработке заказа:', error);
    await sendTextMessage(
      sender,
      'Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте позже.'
    );
  }
}

/**
 * Обработчик команды статуса
 */
async function handleStatus(sender) {
  try {
    // Получаем заказы клиента
    const orders = await readSheetData(SPREADSHEET_ID, `${ORDERS_SHEET}!A:E`);
    const clientOrders = orders?.filter((row) => row[0] === sender) || [];

    if (clientOrders.length === 0) {
      await sendTextMessage(sender, 'У вас пока нет активных заказов.');
      return;
    }

    // Формируем сообщение со статусами заказов
    let response = 'Ваши заказы:\n\n';

    clientOrders.forEach((order, index) => {
      const orderDate = new Date(order[3]).toLocaleDateString('ru-RU');
      response += `${index + 1}. Дата: ${orderDate}\n`;
      response += `   Заказ: ${order[2]}\n`;
      response += `   Статус: ${order[4] || 'В обработке'}\n\n`;
    });

    await sendTextMessage(sender, response);
  } catch (error) {
    console.error('Ошибка при получении статуса заказов:', error);
    await sendTextMessage(
      sender,
      'Произошла ошибка при получении статуса заказов. Пожалуйста, попробуйте позже.'
    );
  }
}

/**
 * Обработчик команды регистрации
 */
async function handleRegistration(sender, text) {
  try {
    // Проверяем, зарегистрирован ли уже клиент
    const clients = await readSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`);
    const existingClient = clients?.find((row) => row[0] === sender);

    if (existingClient) {
      await sendTextMessage(
        sender,
        `Вы уже зарегистрированы как ${existingClient[1]} (${existingClient[2]}).\n` +
          'Если вам нужно изменить данные, пожалуйста, свяжитесь с администратором.'
      );
      return;
    }

    // Парсим команду регистрации
    const registrationText = text.substring('регистрация'.length).trim();

    if (!registrationText) {
      await sendTextMessage(
        sender,
        'Для регистрации укажите ваше имя и название компании после слова "регистрация".\n' +
          'Например: "регистрация Иван Ресторан Вкусно"'
      );
      return;
    }

    // Разделяем имя и компанию
    const parts = registrationText.split(' ');
    if (parts.length < 2) {
      await sendTextMessage(
        sender,
        'Пожалуйста, укажите и ваше имя, и название компании.\n' +
          'Например: "регистрация Иван Ресторан Вкусно"'
      );
      return;
    }

    const name = parts[0];
    const company = parts.slice(1).join(' ');

    // Добавляем клиента в таблицу
    await appendSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`, [
      [sender, name, company],
    ]);

    await sendTextMessage(
      sender,
      `Спасибо, ${name}! Вы успешно зарегистрированы как представитель компании "${company}".\n\n` +
        'Теперь вы можете оформлять заказы, отправив сообщение, начинающееся со слова "заказ".\n' +
        'Например: "заказ 2 пиццы, доставка в 18:00"'
    );
  } catch (error) {
    console.error('Ошибка при регистрации клиента:', error);
    await sendTextMessage(
      sender,
      'Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.'
    );
  }
}

module.exports = {
  handleWebhookMessage,
  handleIncomingMessage,
};

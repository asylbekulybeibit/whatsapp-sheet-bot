const {
  readSheetData,
  writeSheetData,
  appendSheetData,
} = require('./googleSheets');

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
 * Обработчик входящих сообщений
 */
async function handleMessage(message) {
  const text = message.body.toLowerCase().trim();
  const sender = message.from;

  // Обработка команд
  if (text === 'привет' || text === 'начать' || text === 'старт') {
    return handleGreeting(message);
  } else if (text.startsWith('заказ')) {
    return handleOrder(message);
  } else if (text === 'помощь' || text === 'help') {
    return handleHelp(message);
  } else if (text === 'статус') {
    return handleStatus(message);
  } else if (text.startsWith('регистрация')) {
    return handleRegistration(message);
  } else {
    // Если команда не распознана
    return message.reply(
      'Извините, я не понимаю эту команду. Отправьте "помощь" для получения списка доступных команд.'
    );
  }
}

/**
 * Обработчик приветствия
 */
async function handleGreeting(message) {
  const sender = message.from;

  try {
    // Проверяем, зарегистрирован ли клиент
    const clients = await readSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`);
    const clientRow = clients?.find((row) => row[0] === sender);

    if (clientRow) {
      // Клиент уже зарегистрирован
      return message.reply(
        `Здравствуйте, ${clientRow[1]}! Рады видеть вас снова.\n\n` +
          'Чем я могу помочь сегодня?\n' +
          '- Напишите "заказ" для оформления нового заказа\n' +
          '- Напишите "статус" для проверки статуса ваших заказов\n' +
          '- Напишите "помощь" для получения дополнительной информации'
      );
    } else {
      // Новый клиент
      return message.reply(
        'Здравствуйте! Я бот-помощник для вашего бизнеса.\n\n' +
          'Похоже, вы обращаетесь к нам впервые. Для регистрации, пожалуйста, отправьте сообщение в формате:\n' +
          '"регистрация Имя Компания"\n\n' +
          'Например: "регистрация Иван Ресторан Вкусно"'
      );
    }
  } catch (error) {
    console.error('Ошибка при обработке приветствия:', error);
    return message.reply(
      'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.'
    );
  }
}

/**
 * Обработчик команды помощи
 */
async function handleHelp(message) {
  return message.reply(
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
async function handleOrder(message) {
  const sender = message.from;

  try {
    // Проверяем, зарегистрирован ли клиент
    const clients = await readSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`);
    const clientRow = clients?.find((row) => row[0] === sender);

    if (!clientRow) {
      return message.reply(
        'Для оформления заказа необходимо зарегистрироваться. Отправьте сообщение в формате:\n' +
          '"регистрация Имя Компания"'
      );
    }

    // Парсим команду заказа
    const orderText = message.body.substring('заказ'.length).trim();

    if (!orderText) {
      return message.reply(
        'Для оформления заказа укажите детали после слова "заказ".\n' +
          'Например: "заказ 2 пиццы, доставка в 18:00"'
      );
    }

    // Добавляем заказ в таблицу
    const orderDate = new Date().toISOString();
    await appendSheetData(SPREADSHEET_ID, `${ORDERS_SHEET}!A:D`, [
      [sender, clientRow[1], orderText, orderDate, 'Новый'],
    ]);

    return message.reply(
      'Ваш заказ успешно принят! Мы свяжемся с вами для подтверждения деталей.\n' +
        'Вы можете проверить статус заказа, отправив команду "статус".'
    );
  } catch (error) {
    console.error('Ошибка при обработке заказа:', error);
    return message.reply(
      'Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте позже.'
    );
  }
}

/**
 * Обработчик команды статуса
 */
async function handleStatus(message) {
  const sender = message.from;

  try {
    // Получаем заказы клиента
    const orders = await readSheetData(SPREADSHEET_ID, `${ORDERS_SHEET}!A:E`);
    const clientOrders = orders?.filter((row) => row[0] === sender) || [];

    if (clientOrders.length === 0) {
      return message.reply('У вас пока нет активных заказов.');
    }

    // Формируем сообщение со статусами заказов
    let response = 'Ваши заказы:\n\n';

    clientOrders.forEach((order, index) => {
      const orderDate = new Date(order[3]).toLocaleDateString('ru-RU');
      response += `${index + 1}. Дата: ${orderDate}\n`;
      response += `   Заказ: ${order[2]}\n`;
      response += `   Статус: ${order[4] || 'В обработке'}\n\n`;
    });

    return message.reply(response);
  } catch (error) {
    console.error('Ошибка при получении статуса заказов:', error);
    return message.reply(
      'Произошла ошибка при получении статуса заказов. Пожалуйста, попробуйте позже.'
    );
  }
}

/**
 * Обработчик команды регистрации
 */
async function handleRegistration(message) {
  const sender = message.from;

  try {
    // Проверяем, зарегистрирован ли уже клиент
    const clients = await readSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`);
    const existingClient = clients?.find((row) => row[0] === sender);

    if (existingClient) {
      return message.reply(
        `Вы уже зарегистрированы как ${existingClient[1]} (${existingClient[2]}).\n` +
          'Если вам нужно изменить данные, пожалуйста, свяжитесь с администратором.'
      );
    }

    // Парсим команду регистрации
    const registrationText = message.body
      .substring('регистрация'.length)
      .trim();

    if (!registrationText) {
      return message.reply(
        'Для регистрации укажите ваше имя и название компании после слова "регистрация".\n' +
          'Например: "регистрация Иван Ресторан Вкусно"'
      );
    }

    // Разделяем имя и компанию
    const parts = registrationText.split(' ');
    if (parts.length < 2) {
      return message.reply(
        'Пожалуйста, укажите и ваше имя, и название компании.\n' +
          'Например: "регистрация Иван Ресторан Вкусно"'
      );
    }

    const name = parts[0];
    const company = parts.slice(1).join(' ');

    // Добавляем клиента в таблицу
    await appendSheetData(SPREADSHEET_ID, `${CLIENTS_SHEET}!A:C`, [
      [sender, name, company],
    ]);

    return message.reply(
      `Спасибо, ${name}! Вы успешно зарегистрированы как представитель компании "${company}".\n\n` +
        'Теперь вы можете оформлять заказы, отправив сообщение, начинающееся со слова "заказ".\n' +
        'Например: "заказ 2 пиццы, доставка в 18:00"'
    );
  } catch (error) {
    console.error('Ошибка при регистрации клиента:', error);
    return message.reply(
      'Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.'
    );
  }
}

module.exports = {
  handleMessage,
};

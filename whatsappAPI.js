const axios = require('axios');

// Получаем данные из переменных окружения
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

/**
 * Отправляет текстовое сообщение через WhatsApp Cloud API
 * @param {string} to - Номер телефона получателя в формате 7XXXXXXXXXX
 * @param {string} message - Текст сообщения
 * @returns {Promise<Object>} - Ответ от API
 */
async function sendTextMessage(to, message) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          body: message,
        },
      },
    });

    console.log('Сообщение отправлено успешно:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Ошибка при отправке сообщения:',
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Отправляет шаблонное сообщение через WhatsApp Cloud API
 * @param {string} to - Номер телефона получателя в формате 7XXXXXXXXXX
 * @param {string} templateName - Имя шаблона
 * @param {string} language - Код языка (например, 'ru')
 * @param {Array} components - Компоненты шаблона (параметры)
 * @returns {Promise<Object>} - Ответ от API
 */
async function sendTemplateMessage(
  to,
  templateName,
  language = 'ru',
  components = []
) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language,
          },
          components: components,
        },
      },
    });

    console.log('Шаблонное сообщение отправлено успешно:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Ошибка при отправке шаблонного сообщения:',
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Проверяет формат номера телефона и форматирует его для WhatsApp
 * @param {string} phoneNumber - Номер телефона (может содержать + или другие символы)
 * @returns {string} - Отформатированный номер телефона
 */
function formatPhoneNumber(phoneNumber) {
  // Удаляем все нецифровые символы
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Если номер начинается с 8, меняем на 7 (для России)
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.substring(1);
  }

  // Если номер не содержит код страны, добавляем 7 (для России)
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }

  return cleaned;
}

/**
 * Извлекает номер телефона из идентификатора WhatsApp
 * @param {string} whatsappId - Идентификатор WhatsApp (например, 7XXXXXXXXXX@c.us)
 * @returns {string} - Номер телефона
 */
function extractPhoneNumber(whatsappId) {
  // Удаляем суффикс @c.us если он есть
  return whatsappId.split('@')[0];
}

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  formatPhoneNumber,
  extractPhoneNumber,
};

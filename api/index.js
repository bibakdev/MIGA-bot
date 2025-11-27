const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path'); // اضافه کردن ماژول path
require('dotenv').config();

const bot = new Telegraf(process.env.KEY);

// --- اصلاح ۱: مسیردهی صحیح برای Vercel ---
// فرض بر این است که فایل quiz.json در ریشه پروژه (کنار package.json) قرار دارد
const quizPath = path.join(process.cwd(), 'quiz.json');
let questionsList = [];

try {
  const rawData = fs.readFileSync(quizPath, 'utf8');
  questionsList = JSON.parse(rawData);
} catch (err) {
  console.error('Error reading quiz.json:', err);
  // اگر فایل خوانده نشد، یک آرایه خالی قرار می‌دهیم تا برنامه کرش نکند
  questionsList = [];
}

// نکته مهم: در Vercel متغیرهای زیر بعد از هر بار اجرا پاک می‌شوند
// const activePolls = new Map(); // این خط در ورسل کارایی ندارد

bot.command('quiz', async (ctx) => {
  if (!questionsList || questionsList.length === 0) {
    return ctx.reply('❌ لیست سوالات خالی است یا فایل خوانده نشد.');
  }

  // --- اصلاح ۲: انتخاب سوال تصادفی ---
  // چون در ورسل متغیرها ریست می‌شوند، شمارنده ترتیبی کار نمی‌کند.
  const randomIndex = Math.floor(Math.random() * questionsList.length);
  const currentQ = questionsList[randomIndex];

  // دکمه شیشه‌ای بهترین روش برای ربات‌های سرورلس (Vercel) است
  let msgText = `❓ **سوال:**\n\n${currentQ.question}\n\n〰〰〰〰〰\n`;
  currentQ.options.forEach((opt, i) => {
    msgText += `${i + 1}️⃣ ${opt}\n\n`;
  });
  msgText += `👇 **گزینه صحیح را انتخاب کنید:**`;

  // ساخت دکمه‌ها: ما ID سوال و ایندکس جواب را در callback_data قرار می‌دهیم
  // فرمت: ans_شناسه-سوال_شماره-گزینه
  const buttons = currentQ.options.map((_, i) =>
    Markup.button.callback(`${i + 1}️⃣`, `ans_${currentQ.id}_${i}`)
  );

  try {
    await ctx.reply(
      msgText,
      Markup.inlineKeyboard(
        [
          // دکمه‌ها را دو تا دو تا یا تک‌تک نمایش بده (اختیاری)
          buttons
        ],
        { columns: 2 }
      )
    );
  } catch (error) {
    console.error('Error sending quiz:', error);
    ctx.reply('❌ خطایی رخ داد.');
  }
});

// ---------------------------------------------------------
// هندلر پاسخ به دکمه شیشه‌ای
// ---------------------------------------------------------
bot.action(/ans_(.+)_(\d+)/, async (ctx) => {
  const qId = ctx.match[1];
  const userAns = parseInt(ctx.match[2]);
  const userId = ctx.from.id;

  // پیدا کردن سوال از لیست اصلی (چون حافظه موقت نداریم، دوباره از لیست اصلی می‌خوانیم)
  const question = questionsList.find((q) => String(q.id) === qId);

  if (!question) return ctx.answerCbQuery('❌ سوال یافت نشد یا منقضی شده.');

  const isCorrect = userAns === question.correctIndex;

  if (isCorrect) {
    await ctx.answerCbQuery('✅ آفرین! صحیح بود.', { show_alert: false });
  } else {
    await ctx.answerCbQuery('❌ اشتباه بود!', { show_alert: false });
  }

  await sendResultToPV(ctx, userId, isCorrect, question);
});

// ---------------------------------------------------------
// تابع مشترک ارسال به PV
// ---------------------------------------------------------
async function sendResultToPV(ctx, userId, isCorrect, question) {
  let pmText = '';

  if (isCorrect) {
    pmText = `✅ **آفرین! پاسخ شما به سوال زیر صحیح بود:**\n"${question.question}"\n\n`;
  } else {
    const correctOptText = question.options[question.correctIndex];
    pmText =
      `❌ **پاسخ شما به سوال زیر اشتباه بود:**\n"${question.question}"\n\n` +
      `✅ گزینه صحیح: **${correctOptText}**\n\n`;
  }

  if (question.explanation) {
    pmText += `📚 **توضیحات تکمیلی:**\n${question.explanation}`;
  }

  if (question.source) {
    pmText += `\n\n📌 منبع: ${question.source}`;
  }

  // حذف بخش "حذف خودکار پیام"
  // در Vercel تایمرهای طولانی (مثل ۱ ساعت) کار نمی‌کنند چون سرور خاموش می‌شود.
  // فقط پیام را ارسال می‌کنیم.

  try {
    await ctx.telegram.sendMessage(userId, pmText);
  } catch (error) {
    console.log(`User ${userId} blocked the bot or chat not found.`);
  }
}

// خروجی تابع برای Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send('Bot is running on Vercel!');
    }
  } catch (e) {
    console.error('Error handling update:', e);
    res.status(500).send('Error');
  }
};

// const { Telegraf, Markup } = require('telegraf');
// const fs = require('fs');
// require('dotenv').config();

// const bot = new Telegraf(process.env.KEY);

// // 1. خواندن فایل JSON
// const rawData = fs.readFileSync('./quiz.json', 'utf8');
// const questionsList = JSON.parse(rawData);

// // برای ذخیره Pollهای فعال
// const activePolls = new Map();

// let quizIndex = 0;

// bot.command('quiz', async (ctx) => {
//   if (!questionsList || questionsList.length === 0) {
//     return ctx.reply('❌ لیست سوالات خالی است.');
//   }

//   const currentQ = questionsList[quizIndex];

//   const isSuitableForPoll =
//     currentQ.question.length <= 255 &&
//     currentQ.options.every((opt) => opt.length <= 100);

//   try {
//     if (isSuitableForPoll) {
//       // ------------------------------------------
//       // روش اول: POLL
//       // ------------------------------------------
//       await ctx.reply(`❓ **سوال:**\n\n${currentQ.question}`);

//       const pollMessage = await ctx.replyWithQuiz(
//         '👇 گزینه صحیح را انتخاب کنید:',
//         currentQ.options,
//         {
//           correct_option_id: currentQ.correctIndex,
//           is_anonymous: false,
//           explanation: '📬 توضیحات کامل و نتیجه به پی‌وی (PV) شما ارسال شد.'
//         }
//       );

//       activePolls.set(pollMessage.poll.id, currentQ);
//     } else {
//       // ------------------------------------------
//       // روش دوم: دکمه شیشه‌ای
//       // ------------------------------------------
//       let msgText = `❓ **سوال:**\n\n${currentQ.question}\n\n〰〰〰〰〰\n`;
//       currentQ.options.forEach((opt, i) => {
//         msgText += `${i + 1}️⃣ ${opt}\n\n`;
//       });
//       msgText += `👇 **گزینه صحیح را انتخاب کنید:**`;

//       const buttons = currentQ.options.map((_, i) =>
//         Markup.button.callback(`${i + 1}️⃣`, `ans_${currentQ.id}_${i}`)
//       );

//       await ctx.reply(msgText, Markup.inlineKeyboard([buttons]));
//     }
//   } catch (error) {
//     console.error('Error sending quiz:', error);
//     ctx.reply('❌ خطایی رخ داد.');
//   }

//   quizIndex = (quizIndex + 1) % questionsList.length;
// });

// // ---------------------------------------------------------
// // هندلر ۱: پاسخ به POLL
// // ---------------------------------------------------------
// bot.on('poll_answer', async (ctx) => {
//   const pollId = ctx.pollAnswer.poll_id;
//   const userId = ctx.pollAnswer.user.id;
//   const userOptionId = ctx.pollAnswer.option_ids[0];

//   const question = activePolls.get(pollId);
//   if (!question) return;

//   const isCorrect = userOptionId === question.correctIndex;
//   await sendResultToPV(ctx, userId, isCorrect, question);
// });

// // ---------------------------------------------------------
// // هندلر ۲: پاسخ به دکمه شیشه‌ای
// // ---------------------------------------------------------
// bot.action(/ans_(.+)_(\d+)/, async (ctx) => {
//   const qId = ctx.match[1];
//   const userAns = parseInt(ctx.match[2]);
//   const userId = ctx.from.id;

//   const question = questionsList.find((q) => String(q.id) === qId);

//   if (!question) return ctx.answerCbQuery('❌ سوال یافت نشد.');

//   const isCorrect = userAns === question.correctIndex;

//   if (isCorrect) {
//     await ctx.answerCbQuery('✅ آفرین! توضیحات به PV ارسال شد.', {
//       show_alert: false
//     });
//   } else {
//     await ctx.answerCbQuery('❌ اشتباه بود! توضیحات به PV ارسال شد.', {
//       show_alert: false
//     });
//   }

//   await sendResultToPV(ctx, userId, isCorrect, question);
// });

// // ---------------------------------------------------------
// // تابع مشترک ارسال به PV (با قابلیت حذف خودکار)
// // ---------------------------------------------------------
// async function sendResultToPV(ctx, userId, isCorrect, question) {
//   let pmText = '';

//   if (isCorrect) {
//     pmText = `✅ **آفرین! پاسخ شما صحیح بود.**\n\n`;
//   } else {
//     const correctOptText = question.options[question.correctIndex];
//     pmText =
//       `❌ **پاسخ شما اشتباه بود!**\n\n` +
//       `✅ گزینه صحیح: **${correctOptText}**\n\n`;
//   }

//   pmText += `📚 **توضیحات تکمیلی:**\n${question.explanation}`;

//   if (question.source) {
//     pmText += `\n\n📌 منبع: ${question.source}`;
//   }

//   pmText += `\n\n⏳ __این پیام تا ۱ ساعت دیگر حذف می‌شود.__`;

//   try {
//     // ۱. ارسال پیام و ذخیره آبجکت پیام ارسالی در متغیر
//     const sentMsg = await ctx.telegram.sendMessage(userId, pmText);

//     // ۲. تنظیم تایمر برای حذف پیام بعد از ۱۰ ثانیه
//     setTimeout(async () => {
//       try {
//         await ctx.telegram.deleteMessage(userId, sentMsg.message_id);
//       } catch (delErr) {
//         // ممکن است کاربر خودش پیام را زودتر پاک کرده باشد یا ربات بلاک شده باشد
//         console.log(
//           `Could not auto-delete message for user ${userId}:`,
//           delErr.message
//         );
//       }
//     }, 3600000); // 10000 میلی‌ثانیه = 10 ثانیه
//   } catch (error) {
//     console.log(`User ${userId} blocked the bot or chat not found.`);
//   }
// }

// // bot.launch();
// // console.log('Bot started...');

// module.exports = async (req, res) => {
//   try {
//     // بررسی میکنیم که درخواست از طرف تلگرام باشد (POST)
//     if (req.method === 'POST') {
//       await bot.handleUpdate(req.body);
//       res.status(200).send('OK');
//     } else {
//       // برای تست اینکه ببینیم سرور بالا آمده یا نه
//       res.status(200).send('Bot is running on Vercel!');
//     }
//   } catch (e) {
//     console.error('Error handling update:', e);
//     res.status(500).send('Error');
//   }
// };

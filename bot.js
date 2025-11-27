// const { Telegraf, Markup } = require('telegraf');
// const fs = require('fs');
// require('dotenv').config();

// const bot = new Telegraf(process.env.KEY);

// // 1. خواندن فایل JSON (بدون تغییر و دستکاری IDها)
// // فرض بر این است که در فایل جیسون هر آبجکت یک فیلد "id" دارد
// const rawData = fs.readFileSync('./quiz.json', 'utf8');
// const questionsList = JSON.parse(rawData);

// // برای ذخیره Pollهای فعال (روش اول)
// const activePolls = new Map();

// let quizIndex = 0;

// bot.command('quiz', async (ctx) => {
//   if (!questionsList || questionsList.length === 0) {
//     return ctx.reply('❌ لیست سوالات خالی است.');
//   }

//   const currentQ = questionsList[quizIndex];

//   // شرط تصمیم‌گیری (Poll یا دکمه شیشه‌ای)
//   const isSuitableForPoll =
//     currentQ.question.length <= 255 &&
//     currentQ.options.every((opt) => opt.length <= 100);

//   try {
//     if (isSuitableForPoll) {
//       // ------------------------------------------
//       // روش اول: POLL (سوالات کوتاه)
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

//       // ذخیره سوال با کلید poll_id
//       activePolls.set(pollMessage.poll.id, currentQ);
//     } else {
//       // ------------------------------------------
//       // روش دوم: دکمه شیشه‌ای (سوالات طولانی)
//       // ------------------------------------------
//       let msgText = `❓ **سوال:**\n\n${currentQ.question}\n\n〰〰〰〰〰\n`;
//       currentQ.options.forEach((opt, i) => {
//         msgText += `${i + 1}️⃣ ${opt}\n\n`;
//       });
//       msgText += `👇 **گزینه صحیح را انتخاب کنید:**`;

//       // ساخت دکمه‌ها با استفاده از ID موجود در JSON
//       const buttons = currentQ.options.map((_, i) =>
//         Markup.button.callback(`${i + 1}️⃣`, `ans_${currentQ.id}_${i}`)
//       );

//       await ctx.reply(msgText, Markup.inlineKeyboard([buttons]));
//     }
//   } catch (error) {
//     console.error('Error sending quiz:', error);
//     ctx.reply('❌ خطایی رخ داد.');
//   }

//   // رفتن به سوال بعدی (بر اساس ترتیب آرایه)
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
// // نکته مهم: اینجا regex را کمی تغییر دادیم تا هر نوع ID (عدد یا متن) را قبول کند
// // (.+) یعنی هر چیزی بین ans_ و _ بعدی
// bot.action(/ans_(.+)_(\d+)/, async (ctx) => {
//   const qId = ctx.match[1]; // آیدی را فعلا به صورت رشته می‌گیریم
//   const userAns = parseInt(ctx.match[2]);
//   const userId = ctx.from.id;

//   // پیدا کردن سوال:
//   // چون ID ممکن است در جیسون عدد باشد و اینجا رشته، تبدیل به String می‌کنیم تا مقایسه درست باشد
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
// // تابع مشترک ارسال به PV
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

//   try {
//     await ctx.telegram.sendMessage(userId, pmText);
//   } catch (error) {
//     console.log(`User ${userId} blocked the bot.`);
//   }
// }

// bot.launch();
// console.log('Bot started...');

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
require('dotenv').config();

const bot = new Telegraf(process.env.KEY);

// 1. خواندن فایل JSON
const rawData = fs.readFileSync('./quiz.json', 'utf8');
const questionsList = JSON.parse(rawData);

// برای ذخیره Pollهای فعال
const activePolls = new Map();

let quizIndex = 0;

bot.command('quiz', async (ctx) => {
  if (!questionsList || questionsList.length === 0) {
    return ctx.reply('❌ لیست سوالات خالی است.');
  }

  const currentQ = questionsList[quizIndex];

  const isSuitableForPoll =
    currentQ.question.length <= 255 &&
    currentQ.options.every((opt) => opt.length <= 100);

  try {
    if (isSuitableForPoll) {
      // ------------------------------------------
      // روش اول: POLL
      // ------------------------------------------
      await ctx.reply(`❓ **سوال:**\n\n${currentQ.question}`);

      const pollMessage = await ctx.replyWithQuiz(
        '👇 گزینه صحیح را انتخاب کنید:',
        currentQ.options,
        {
          correct_option_id: currentQ.correctIndex,
          is_anonymous: false,
          explanation: '📬 توضیحات کامل و نتیجه به پی‌وی (PV) شما ارسال شد.'
        }
      );

      activePolls.set(pollMessage.poll.id, currentQ);
    } else {
      // ------------------------------------------
      // روش دوم: دکمه شیشه‌ای
      // ------------------------------------------
      let msgText = `❓ **سوال:**\n\n${currentQ.question}\n\n〰〰〰〰〰\n`;
      currentQ.options.forEach((opt, i) => {
        msgText += `${i + 1}️⃣ ${opt}\n\n`;
      });
      msgText += `👇 **گزینه صحیح را انتخاب کنید:**`;

      const buttons = currentQ.options.map((_, i) =>
        Markup.button.callback(`${i + 1}️⃣`, `ans_${currentQ.id}_${i}`)
      );

      await ctx.reply(msgText, Markup.inlineKeyboard([buttons]));
    }
  } catch (error) {
    console.error('Error sending quiz:', error);
    ctx.reply('❌ خطایی رخ داد.');
  }

  quizIndex = (quizIndex + 1) % questionsList.length;
});

// ---------------------------------------------------------
// هندلر ۱: پاسخ به POLL
// ---------------------------------------------------------
bot.on('poll_answer', async (ctx) => {
  const pollId = ctx.pollAnswer.poll_id;
  const userId = ctx.pollAnswer.user.id;
  const userOptionId = ctx.pollAnswer.option_ids[0];

  const question = activePolls.get(pollId);
  if (!question) return;

  const isCorrect = userOptionId === question.correctIndex;
  await sendResultToPV(ctx, userId, isCorrect, question);
});

// ---------------------------------------------------------
// هندلر ۲: پاسخ به دکمه شیشه‌ای
// ---------------------------------------------------------
bot.action(/ans_(.+)_(\d+)/, async (ctx) => {
  const qId = ctx.match[1];
  const userAns = parseInt(ctx.match[2]);
  const userId = ctx.from.id;

  const question = questionsList.find((q) => String(q.id) === qId);

  if (!question) return ctx.answerCbQuery('❌ سوال یافت نشد.');

  const isCorrect = userAns === question.correctIndex;

  if (isCorrect) {
    await ctx.answerCbQuery('✅ آفرین! توضیحات به PV ارسال شد.', {
      show_alert: false
    });
  } else {
    await ctx.answerCbQuery('❌ اشتباه بود! توضیحات به PV ارسال شد.', {
      show_alert: false
    });
  }

  await sendResultToPV(ctx, userId, isCorrect, question);
});

// ---------------------------------------------------------
// تابع مشترک ارسال به PV (با قابلیت حذف خودکار)
// ---------------------------------------------------------
async function sendResultToPV(ctx, userId, isCorrect, question) {
  let pmText = '';

  if (isCorrect) {
    pmText = `✅ **آفرین! پاسخ شما صحیح بود.**\n\n`;
  } else {
    const correctOptText = question.options[question.correctIndex];
    pmText =
      `❌ **پاسخ شما اشتباه بود!**\n\n` +
      `✅ گزینه صحیح: **${correctOptText}**\n\n`;
  }

  pmText += `📚 **توضیحات تکمیلی:**\n${question.explanation}`;

  if (question.source) {
    pmText += `\n\n📌 منبع: ${question.source}`;
  }

  pmText += `\n\n⏳ __این پیام تا ۱ ساعت دیگر حذف می‌شود.__`;

  try {
    // ۱. ارسال پیام و ذخیره آبجکت پیام ارسالی در متغیر
    const sentMsg = await ctx.telegram.sendMessage(userId, pmText);

    // ۲. تنظیم تایمر برای حذف پیام بعد از ۱۰ ثانیه
    setTimeout(async () => {
      try {
        await ctx.telegram.deleteMessage(userId, sentMsg.message_id);
      } catch (delErr) {
        // ممکن است کاربر خودش پیام را زودتر پاک کرده باشد یا ربات بلاک شده باشد
        console.log(
          `Could not auto-delete message for user ${userId}:`,
          delErr.message
        );
      }
    }, 3600000); // 10000 میلی‌ثانیه = 10 ثانیه
  } catch (error) {
    console.log(`User ${userId} blocked the bot or chat not found.`);
  }
}

bot.launch();
console.log('Bot started...');

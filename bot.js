import 'dotenv/config';
import { Markup, Telegraf, session } from 'telegraf';

import { setupExpensesHandlers, handleTextInput } from './handlers/expenses.js';
import { setupStatsHandlers } from './handlers/stats.js';
import { setupHistoryHandlers } from './handlers/history.js';
import { setupBudgetHandlers, handleBudgetInput } from './handlers/budget.js';
import { deleteLastExpense } from './storage.js';
import { getCategoryLabel } from './utils/categories.js';
import { formatAmount } from './utils/format.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session({
  defaultSession: () => ({
    state: null,
    category: null,
    amount: null,
    note: null,
    statsPeriod: 'month',
  }),
}));

const MAIN_KEYBOARD = Markup.keyboard([
  ['➕ Додати', '📊 Статистика'],
  ['📋 Історія', '💰 Бюджет'],
]).resize();

bot.start((ctx) => {
  const name = ctx.from.first_name || 'друже';
  return ctx.reply(
    `Привіт, ${name}! Це твій трекер витрат.\n\n` +
    `Просто натисни "➕ Додати" або одразу введи суму — наприклад \`150\` або \`200 кава\`.`,
    { parse_mode: 'Markdown', ...MAIN_KEYBOARD }
  );
});

bot.help((ctx) => {
  return ctx.reply(
    `*Як користуватись*\n\n` +
    `Введи суму щоб додати витрату — \`150\` або \`150 кава\` одразу з нотаткою.\n\n` +
    `В меню: статистика за різні періоди, історія з видаленням, місячний бюджет.\n\n` +
    `/undo — відмінити останню витрату`,
    { parse_mode: 'Markdown', ...MAIN_KEYBOARD }
  );
});

bot.command('undo', async (ctx) => {
  const userId = String(ctx.chat.id);
  const removed = await deleteLastExpense(userId);
  if (!removed) return ctx.reply('Нема що видаляти 📭');
  const note = removed.note ? ` — ${removed.note}` : '';
  return ctx.reply(
    `↩️ Видалено: ${getCategoryLabel(removed.category)}${note} — *${formatAmount(removed.amount)}*`,
    { parse_mode: 'Markdown' }
  );
});

setupExpensesHandlers(bot);
setupStatsHandlers(bot);
setupHistoryHandlers(bot);
setupBudgetHandlers(bot);

bot.on('text', async (ctx) => {
  if (ctx.session.state === 'waiting_budget') {
    return handleBudgetInput(ctx);
  }
  return handleTextInput(ctx);
});

bot.catch((err, ctx) => {
  console.error(`[${ctx.updateType}]`, err.message);
});

bot.launch();
console.log('bot started');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

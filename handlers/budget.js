import { Markup } from 'telegraf';
import { getBudget, setBudget, getExpenses } from '../storage.js';
import { formatAmount, parseAmount, currentMonth, progressBar, monthName } from '../utils/format.js';

export function setupBudgetHandlers(bot) {
  bot.hears('💰 Бюджет', async (ctx) => {
    await showBudget(ctx);
  });

  bot.command('budget', async (ctx) => {
    await showBudget(ctx);
  });

  bot.action('budget:set', (ctx) => {
    ctx.session.state = 'waiting_budget';
    ctx.answerCbQuery();
    return ctx.reply(
      'Введіть місячний бюджет (наприклад: <code>10000</code>):',
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Скасувати', 'budget:cancel')]]) }
    );
  });

  bot.action('budget:reset', async (ctx) => {
    const userId = String(ctx.chat?.id ?? ctx.from.id);
    await setBudget(userId, null);
    await ctx.answerCbQuery('Бюджет скинуто');
    return ctx.editMessageText('Бюджет скинуто.');
  });

  bot.action('budget:cancel', (ctx) => {
    ctx.session.state = null;
    ctx.answerCbQuery();
    return ctx.editMessageText('Скасовано.');
  });
}

export async function handleBudgetInput(ctx) {
  const amount = parseAmount(ctx.message.text.trim());

  if (!amount) {
    return ctx.reply(
      'Невалідна сума. Введіть число, наприклад <code>10000</code>',
      { parse_mode: 'HTML' }
    );
  }

  const userId = String(ctx.chat.id);
  await setBudget(userId, amount);
  ctx.session.state = null;

  return ctx.reply(
    `✅ Бюджет на місяць: *${formatAmount(amount)}*`,
    { parse_mode: 'Markdown' }
  );
}

async function showBudget(ctx) {
  const userId = String(ctx.chat.id);
  const [budget, expenses] = await Promise.all([getBudget(userId), getExpenses(userId)]);

  const m = currentMonth();
  const spent = expenses
    .filter(e => e.date.startsWith(m))
    .reduce((s, e) => s + e.amount, 0);

  let msg = `💰 *Бюджет на ${monthName(m)}*\n\n`;

  if (!budget) {
    msg += `Бюджет не встановлено.\nВитрачено цього місяця: *${formatAmount(spent)}*`;
    return ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('Встановити бюджет', 'budget:set')]]),
    });
  }

  const remaining = budget - spent;
  const pct = Math.min(Math.round((spent / budget) * 100), 100);
  const bar = progressBar(spent, budget, 10);
  const isOver = remaining < 0;

  msg += `Ліміт: *${formatAmount(budget)}*\n`;
  msg += `Витрачено: *${formatAmount(spent)}*\n`;
  msg += isOver
    ? `Перевищено: *${formatAmount(-remaining)}* ⚠️\n\n`
    : `Залишилось: *${formatAmount(remaining)}*\n\n`;
  msg += `\`${bar}\` ${pct}%`;

  if (isOver) msg += `\n\n_Бюджет перевищено_`;

  return ctx.reply(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Змінити', 'budget:set'), Markup.button.callback('🗑️ Скинути', 'budget:reset')],
    ]),
  });
}

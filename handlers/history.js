import { Markup } from 'telegraf';
import { getExpenses, deleteExpenseById } from '../storage.js';
import { getCategoryLabel } from '../utils/categories.js';
import { formatAmount, formatDateShort } from '../utils/format.js';

const PAGE_SIZE = 8;

export function setupHistoryHandlers(bot) {
  bot.hears('📋 Історія', async (ctx) => {
    await sendHistory(ctx, 0);
  });

  bot.command('history', async (ctx) => {
    await sendHistory(ctx, 0);
  });

  bot.action(/^hist:page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await ctx.answerCbQuery();
    await ctx.editMessageText('...');
    await sendHistory(ctx, page, true);
  });

  bot.action(/^hist:del:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const userId = String(ctx.chat?.id ?? ctx.from.id);
    const removed = await deleteExpenseById(userId, id);
    if (!removed) return ctx.answerCbQuery('Не знайдено', { show_alert: true });
    await ctx.answerCbQuery('✅ Видалено');
    await sendHistory(ctx, 0, true);
  });
}

async function sendHistory(ctx, page, edit = false) {
  const userId = String(ctx.chat?.id ?? ctx.from.id);
  const all = await getExpenses(userId);

  if (!all.length) {
    const text = 'Витрат ще немає.';
    return edit ? ctx.editMessageText(text) : ctx.reply(text);
  }

  const sorted = [...all].reverse();
  const total = sorted.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  let msg = `📋 *Останні витрати* (${total})\n\n`;
  const rows = [];

  for (const expense of slice) {
    const label = getCategoryLabel(expense.category);
    const note = expense.note ? ` — ${expense.note}` : '';
    const date = formatDateShort(expense.date);
    msg += `${label}${note}\n*${formatAmount(expense.amount)}* · ${date}\n\n`;

    rows.push([
      Markup.button.callback(
        `🗑️ ${label} ${formatAmount(expense.amount)}`,
        `hist:del:${expense.id}`
      ),
    ]);
  }

  const navRow = [];
  if (page > 0) navRow.push(Markup.button.callback('⬅️', `hist:page:${page - 1}`));
  if (page < pages - 1) navRow.push(Markup.button.callback('➡️', `hist:page:${page + 1}`));
  if (navRow.length) rows.push(navRow);

  const keyboard = Markup.inlineKeyboard(rows);

  if (edit) return ctx.editMessageText(msg, { parse_mode: 'Markdown', ...keyboard });
  return ctx.reply(msg, { parse_mode: 'Markdown', ...keyboard });
}

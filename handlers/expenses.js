import { Markup } from 'telegraf';
import { addExpense, deleteLastExpense } from '../storage.js';
import { CATEGORIES, getCategoryLabel } from '../utils/categories.js';
import { formatAmount, parseAmount, today } from '../utils/format.js';

export function categoryKeyboard() {
  const cats = Object.values(CATEGORIES);
  const rows = [];
  for (let i = 0; i < cats.length; i += 2) {
    rows.push(
      cats.slice(i, i + 2).map(c =>
        Markup.button.callback(`${c.emoji} ${c.name}`, `cat:${c.id}`)
      )
    );
  }
  rows.push([Markup.button.callback('❌ Скасувати', 'cancel')]);
  return Markup.inlineKeyboard(rows);
}

function savedKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Ще одну', 'add_more'),
      Markup.button.callback('📊 Статистика', 'show_stats'),
    ],
    [Markup.button.callback('↩️ Видалити останню', 'undo_last')],
  ]);
}

export function setupExpensesHandlers(bot) {
  bot.hears('➕ Додати', (ctx) => {
    ctx.session.state = 'choosing_category';
    ctx.session.amount = null;
    ctx.session.category = null;
    ctx.session.note = null;
    return ctx.reply('Оберіть категорію:', categoryKeyboard());
  });

  bot.action(/^cat:(.+)$/, (ctx) => {
    const category = ctx.match[1];
    ctx.session.category = category;

    if (ctx.session.amount) {
      ctx.session.state = 'waiting_note';
      return ctx.editMessageText(
        `${getCategoryLabel(category)} — ${formatAmount(ctx.session.amount)}\n\nДодати нотатку?`,
        Markup.inlineKeyboard([
          [Markup.button.callback('Пропустити', 'skip_note')],
          [Markup.button.callback('❌ Скасувати', 'cancel')],
        ])
      );
    }

    ctx.session.state = 'waiting_amount';
    return ctx.editMessageText(
      `${getCategoryLabel(category)}\n\nВведіть суму (або <code>150 кава</code>):`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Скасувати', 'cancel')]]) }
    );
  });

  bot.action('skip_note', async (ctx) => {
    await saveExpense(ctx);
  });

  bot.action('add_more', (ctx) => {
    ctx.session.state = 'choosing_category';
    ctx.session.amount = null;
    ctx.session.category = null;
    ctx.session.note = null;
    return ctx.reply('Оберіть категорію:', categoryKeyboard());
  });

  bot.action('undo_last', async (ctx) => {
    const userId = String(ctx.chat?.id ?? ctx.from.id);
    const removed = await deleteLastExpense(userId);
    if (!removed) {
      return ctx.answerCbQuery('Нема що видаляти', { show_alert: true });
    }
    await ctx.answerCbQuery('Видалено ✅');
    return ctx.reply(
      `↩️ Скасовано: ${getCategoryLabel(removed.category)}${removed.note ? ` — ${removed.note}` : ''} — *${formatAmount(removed.amount)}*`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('cancel', (ctx) => {
    ctx.session.state = null;
    ctx.session.amount = null;
    ctx.session.category = null;
    ctx.session.note = null;
    ctx.answerCbQuery();
    return ctx.editMessageText('Скасовано.');
  });
}

export async function handleTextInput(ctx) {
  const { state, category } = ctx.session;
  const text = ctx.message.text.trim();

  if (!state || state === 'idle') {
    const parts = text.split(/\s+/);
    const amount = parseAmount(parts[0]);
    if (amount) {
      ctx.session.amount = amount;
      ctx.session.note = parts.slice(1).join(' ') || null;
      ctx.session.state = 'choosing_category';
      return ctx.reply(
        `*${formatAmount(amount)}*${ctx.session.note ? ` — ${ctx.session.note}` : ''}\n\nОберіть категорію:`,
        { parse_mode: 'Markdown', ...categoryKeyboard() }
      );
    }
    return;
  }

  if (state === 'waiting_amount') {
    const parts = text.split(/\s+/);
    const amount = parseAmount(parts[0]);

    if (!amount) {
      return ctx.reply(
        'Невалідна сума. Введіть число, наприклад <code>150</code> або <code>99.50 кава</code>',
        { parse_mode: 'HTML' }
      );
    }

    ctx.session.amount = amount;
    if (parts.length > 1) ctx.session.note = parts.slice(1).join(' ');
    ctx.session.state = 'waiting_note';

    if (ctx.session.note) return saveExpense(ctx);

    return ctx.reply(
      `${getCategoryLabel(category)} — ${formatAmount(amount)}\n\nДодайте нотатку або пропустіть:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('Пропустити', 'skip_note')],
        [Markup.button.callback('❌ Скасувати', 'cancel')],
      ])
    );
  }

  if (state === 'waiting_note') {
    ctx.session.note = text;
    return saveExpense(ctx);
  }
}

async function saveExpense(ctx) {
  const { category, amount, note } = ctx.session;
  const userId = String(ctx.chat?.id ?? ctx.from.id);

  const expense = await addExpense(userId, { category, amount, note, date: today() });

  ctx.session.state = null;
  ctx.session.amount = null;
  ctx.session.category = null;
  ctx.session.note = null;

  const label = getCategoryLabel(expense.category);
  const noteStr = expense.note ? ` — _${expense.note}_` : '';
  const message = `✅ *Збережено!*\n\n${label}${noteStr}\n*${formatAmount(expense.amount)}*`;

  try {
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...savedKeyboard() });
  } catch {
    await ctx.reply(message, { parse_mode: 'Markdown', ...savedKeyboard() });
  }
}

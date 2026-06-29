import { Markup } from 'telegraf';
import { getExpenses, getBudget } from '../storage.js';
import { getCategoryLabel } from '../utils/categories.js';
import { formatAmount, progressBar, monthName, today, weekStart, currentMonth } from '../utils/format.js';

const PERIODS = {
  today: { label: '📅 Сьогодні', key: 'today' },
  week:  { label: '📆 Тиждень',  key: 'week' },
  month: { label: '🗓️ Місяць',   key: 'month' },
  all:   { label: '📂 Весь час', key: 'all' },
};

function periodKeyboard(active) {
  return Markup.inlineKeyboard([
    Object.values(PERIODS).map(p =>
      Markup.button.callback(
        active === p.key ? `· ${p.label} ·` : p.label,
        `stats:${p.key}`
      )
    ),
  ]);
}

function filterByPeriod(expenses, period) {
  const t = today();
  const w = weekStart();
  const m = currentMonth();
  switch (period) {
    case 'today': return expenses.filter(e => e.date === t);
    case 'week':  return expenses.filter(e => e.date >= w);
    case 'month': return expenses.filter(e => e.date.startsWith(m));
    default:      return expenses;
  }
}

function periodTitle(period) {
  switch (period) {
    case 'today': return `📅 Статистика за сьогодні`;
    case 'week':  return `📆 Статистика за тиждень`;
    case 'month': return `🗓️ Статистика за ${monthName(currentMonth())}`;
    default:      return `📂 Статистика за весь час`;
  }
}

async function buildStats(userId, period = 'month') {
  const [expenses, budget] = await Promise.all([
    getExpenses(userId),
    getBudget(userId),
  ]);

  const filtered = filterByPeriod(expenses, period);
  if (!filtered.length) {
    return `${periodTitle(period)}\n\nВитрат за цей період ще немає 📭`;
  }

  const totals = {};
  for (const e of filtered) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  let msg = `*${periodTitle(period)}*\n\n`;

  for (const [cat, amount] of sorted) {
    const pct = Math.round((amount / total) * 100);
    const bar = progressBar(amount, total, 8);
    msg += `${getCategoryLabel(cat)}\n\`${bar}\` *${formatAmount(amount)}* (${pct}%)\n\n`;
  }

  msg += `━━━━━━━━━━━━━━━\n💰 *Всього: ${formatAmount(total)}*`;

  if (budget && period === 'month') {
    const pct = Math.round((total / budget) * 100);
    const bar = progressBar(total, budget, 10);
    const remaining = budget - total;
    const status = remaining >= 0
      ? `залишилось *${formatAmount(remaining)}*`
      : `*перевищено на ${formatAmount(-remaining)}* ⚠️`;
    msg += `\n\n📈 *Бюджет: ${formatAmount(budget)}*\n\`${bar}\` ${pct}% — ${status}`;
  }

  return msg;
}

export function setupStatsHandlers(bot) {
  bot.hears('📊 Статистика', async (ctx) => {
    const userId = String(ctx.chat.id);
    const period = ctx.session.statsPeriod || 'month';
    const msg = await buildStats(userId, period);
    return ctx.reply(msg, { parse_mode: 'Markdown', ...periodKeyboard(period) });
  });

  bot.action('show_stats', async (ctx) => {
    const userId = String(ctx.chat?.id ?? ctx.from.id);
    const period = ctx.session.statsPeriod || 'month';
    const msg = await buildStats(userId, period);
    await ctx.answerCbQuery();
    return ctx.reply(msg, { parse_mode: 'Markdown', ...periodKeyboard(period) });
  });

  bot.action(/^stats:(.+)$/, async (ctx) => {
    const period = ctx.match[1];
    ctx.session.statsPeriod = period;
    const userId = String(ctx.chat?.id ?? ctx.from.id);
    const msg = await buildStats(userId, period);
    await ctx.answerCbQuery();
    return ctx.editMessageText(msg, { parse_mode: 'Markdown', ...periodKeyboard(period) });
  });
}

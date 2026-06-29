export function formatAmount(amount) {
  return amount.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₴';
}

export function progressBar(filled, total, length = 10) {
  const f = Math.min(Math.round((filled / total) * length), length);
  return '█'.repeat(f) + '░'.repeat(length - f);
}

const MONTHS_GEN = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const MONTHS_NOM = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];

export function monthName(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return `${MONTHS_NOM[month - 1]} ${year}`;
}

export function formatDateShort(dateStr) {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTHS_GEN[month - 1]}`;
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function weekStart() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split('T')[0];
}

export function currentMonth() {
  return new Date().toISOString().split('T')[0].slice(0, 7);
}

export function parseAmount(text) {
  const num = parseFloat(text.replace(',', '.').trim());
  return (!isNaN(num) && num > 0) ? num : null;
}

export const CATEGORIES = {
  food:          { id: 'food',          emoji: '🍔', name: 'Їжа' },
  cafe:          { id: 'cafe',          emoji: '☕', name: 'Кафе' },
  transport:     { id: 'transport',     emoji: '🚌', name: 'Транспорт' },
  shopping:      { id: 'shopping',      emoji: '🛍️', name: 'Покупки' },
  health:        { id: 'health',        emoji: '💊', name: 'Здоров\'я' },
  entertainment: { id: 'entertainment', emoji: '🎮', name: 'Розваги' },
  housing:       { id: 'housing',       emoji: '🏠', name: 'Житло' },
  other:         { id: 'other',         emoji: '📦', name: 'Інше' },
};

export function normalizeCategoryId(raw) {
  if (!raw) return 'other';
  const id = raw.replace(/^category_/, '');
  return CATEGORIES[id] ? id : 'other';
}

export function getCategoryLabel(id) {
  const cat = CATEGORIES[normalizeCategoryId(id)];
  return cat ? `${cat.emoji} ${cat.name}` : '📦 Інше';
}

export function getCategoryEmoji(id) {
  return CATEGORIES[normalizeCategoryId(id)]?.emoji ?? '📦';
}

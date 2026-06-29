import { readFile, writeFile } from 'fs/promises';
import { normalizeCategoryId } from './utils/categories.js';

const FILE = './data.json';

async function readData() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeData(data) {
  await writeFile(FILE, JSON.stringify(data, null, 2));
}

function userRecord(data, userId) {
  if (!data[userId]) data[userId] = { expenses: [], budget: null };
  if (!data[userId].expenses) data[userId].expenses = [];
  return data[userId];
}

// --- Expenses ---

export async function getExpenses(userId) {
  const data = await readData();
  const record = data[userId];
  if (!record) return [];
  return (record.expenses || []).map(e => ({
    ...e,
    category: normalizeCategoryId(e.category),
  }));
}

export async function addExpense(userId, { category, amount, note, date }) {
  const data = await readData();
  const user = userRecord(data, userId);
  const expense = {
    id: Date.now(),
    category: normalizeCategoryId(category),
    amount,
    note: note || null,
    date,
  };
  user.expenses.push(expense);
  await writeData(data);
  return expense;
}

export async function deleteLastExpense(userId) {
  const data = await readData();
  const user = userRecord(data, userId);
  if (!user.expenses.length) return null;
  const removed = user.expenses.pop();
  await writeData(data);
  return { ...removed, category: normalizeCategoryId(removed.category) };
}

export async function deleteExpenseById(userId, id) {
  const data = await readData();
  const user = userRecord(data, userId);
  const idx = user.expenses.findIndex(e => String(e.id) === String(id));
  if (idx === -1) return null;
  const [removed] = user.expenses.splice(idx, 1);
  await writeData(data);
  return { ...removed, category: normalizeCategoryId(removed.category) };
}

// --- Budget ---

export async function getBudget(userId) {
  const data = await readData();
  return data[userId]?.budget ?? null;
}

export async function setBudget(userId, amount) {
  const data = await readData();
  userRecord(data, userId).budget = amount;
  await writeData(data);
}

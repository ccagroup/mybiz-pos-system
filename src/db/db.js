import Dexie from 'dexie';

export const db = new Dexie('mybizDB');

db.version(2).stores({
  products: '++id, name, category, createdAt',
  variants: '++id, productId, color, size, stockQuantity',
  customers: '++id, name, phone, isBlocked, createdAt, outstandingDebt',
  transactions: '++id, date, customerId, totalAmount, profit, cogs, paymentMethod, type, customerName, supplierName',
  expenses: '++id, date, amount, description',
  supplierDebts: '++id, supplierName, amountOwed, createdAt, description',
  supplierPayments: '++id, debtId, amount, date',
  settings: 'key, value'
});

export const initializeSettings = async () => {
  const existingTheme = await db.settings.get('theme');
  if (!existingTheme) {
    await db.settings.bulkPut([
      { key: 'theme', value: 'light' },
      { key: 'accentColor', value: 'blue' },
      { key: 'language', value: 'en' },
      { key: 'lastBackup', value: null }
    ]);
  }
};

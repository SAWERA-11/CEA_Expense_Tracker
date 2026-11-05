const test = require('node:test');
const assert = require('node:assert');
const { validateExpense } = require('./server');

const valid = { title: 'Bus ticket', amount: 5, category: 'Transport', spent_on: '2026-11-05' };

test('accepts a valid expense', () => {
  assert.strictEqual(validateExpense(valid), null);
});

test('rejects an empty title', () => {
  assert.ok(validateExpense({ ...valid, title: '' }));
});

test('rejects a negative amount', () => {
  assert.ok(validateExpense({ ...valid, amount: -5 }));
});

test('rejects an unknown category', () => {
  assert.ok(validateExpense({ ...valid, category: 'Games' }));
});

test('rejects a badly formatted date', () => {
  assert.ok(validateExpense({ ...valid, spent_on: '05/11/2026' }));
});

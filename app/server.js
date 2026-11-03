const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// Database settings come from ENVIRONMENT VARIABLES, never hardcoded.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'expenses_db',
  connectionLimit: 10,
  dateStrings: true,
});

const CATEGORIES = ['Food', 'Transport', 'Books', 'Bills', 'Other'];

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(30) NOT NULL,
      spent_on DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Returns an error message, or null if the input is valid.
function validateExpense(body) {
  const { title, amount, category, spent_on } = body || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 100)
    return 'title is required (max 100 characters)';
  if (!(Number(amount) > 0)) return 'amount must be a positive number';
  if (!CATEGORIES.includes(category))
    return `category must be one of: ${CATEGORIES.join(', ')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spent_on || ''))
    return 'spent_on must be a date like 2026-11-03';
  return null;
}

// Health check: the load balancer will call this to see if the server is alive.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/expenses', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM expenses ORDER BY spent_on DESC, id DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/expenses', async (req, res, next) => {
  try {
    const error = validateExpense(req.body);
    if (error) return res.status(400).json({ error });

    const { title, amount, category, spent_on } = req.body;
    const [result] = await pool.query(
      'INSERT INTO expenses (title, amount, category, spent_on) VALUES (?, ?, ?, ?)',
      [title.trim(), Number(amount), category, spent_on]
    );
    res.status(201).json({ id: result.insertId, title: title.trim(), amount: Number(amount), category, spent_on });
  } catch (err) { next(err); }
});

app.delete('/api/expenses/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

// Catch-all error handler: log the details, but don't leak them to the user.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  initDb()
    .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
    .catch((err) => { console.error('Could not connect to database:', err.message); process.exit(1); });
}

module.exports = { app, validateExpense };
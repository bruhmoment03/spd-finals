const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // top secret nigga
  database: 'crypto_trading'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database.');
});

// 獲取所有持倉 Holdings
app.get('/api/holdings', (req, res) => {
  db.query('SELECT * FROM holdings', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// 獲取餘額
app.get('/api/balance', (req, res) => {
  db.query('SELECT * FROM balance ORDER BY updated_at DESC LIMIT 1', (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

// 更新持倉
app.post('/api/holdings', (req, res) => {
  const { symbol, amount, value } = req.body;
  db.query('INSERT INTO holdings (symbol, amount, value) VALUES (?, ?, ?)', [symbol, amount, value], (err, results) => {
    if (err) throw err;
    res.json({ id: results.insertId });
  });
});

// 更新餘額
app.post('/api/balance', (req, res) => {
  const { amount } = req.body;
  db.query('UPDATE balance SET amount = ? WHERE id = 1', [amount], (err, results) => {
    if (err) throw err;
    res.json({ message: 'Balance updated successfully' });
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

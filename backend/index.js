const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pool = require('./db');
const customerRoutes = require('./customerRoutes');
const loanRoutes = require('./loanRoutes');
const paymentRoutes = require('./paymentRoutes');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const requireAuth = require('./requireAuth');

const app = express();
const PORT = 3001;

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
  },
}));

app.use('/uploads', express.static('uploads'));

app.use('/api', authRoutes);
app.use('/api', requireAuth, customerRoutes);
app.use('/api', requireAuth, loanRoutes);
app.use('/api', requireAuth, paymentRoutes);
app.use('/api', requireAuth, dashboardRoutes);

app.get('/', (req, res) => {
  res.send('Girvi app backend is running');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`Database connected. Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
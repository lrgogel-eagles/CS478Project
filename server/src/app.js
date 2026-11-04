const express = require('express');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const { requireUser } = require('./auth/require-user');
const { handleUnknownRoute, handleError } = require('./http/errors');

const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authRoutes);
app.use('/api/campaigns', requireUser, campaignRoutes);
app.use(handleUnknownRoute);
app.use(handleError);

module.exports = app;

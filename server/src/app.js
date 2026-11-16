const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const auctionRoutes = require('./routes/auction.routes');
const sellerRoutes = require('./routes/seller.routes');
const bidRoutes = require('./routes/bid.routes');


const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api', bidRoutes); 
// Extend later: /api/auctions, /api/bids, /api/seller, /api/admin

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
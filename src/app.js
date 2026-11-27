import express from 'express';
import lostRoutes from './routes/lostRoutes.js';
import foundRoutes from './routes/foundRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// Middleware untuk parsing request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Melayani file statis dari folder uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/lost', lostRoutes);
app.use('/api/found', foundRoutes);

// Centralized error handler (harus berada setelah seluruh route)
app.use(errorHandler);

export default app;

import express from 'express';
import lostRoutes from './routes/lostRoutes.js';
import foundRoutes from './routes/foundRoutes.js';

const app = express();

// Middleware untuk parsing request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Melayani file statis dari folder uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/lost', lostRoutes);
app.use('/api/found', foundRoutes);

export default app;

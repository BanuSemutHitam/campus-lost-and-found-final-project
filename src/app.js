import express from 'express';

const app = express();

// Middleware untuk parsing request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Melayani file statis dari folder uploads
app.use('/uploads', express.static('uploads'));

// Routes akan ditambahkan pada Stage 3

export default app;

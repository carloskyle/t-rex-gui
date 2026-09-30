import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './server/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const distPath = path.resolve(__dirname, 'dist');

// Serve static frontend in production
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Cisco TRex Production Server] listening on http://0.0.0.0:${PORT}`);
});

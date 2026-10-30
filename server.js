import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.resolve(__dirname, 'dist');

// Middleware para servir los archivos estáticos generados por vite build (dist)
app.use(express.static(distPath));

// Ruta comodín para SPA (Single Page Application): redirige todas las rutas a index.html
app.get('*', (req, res) => {
  const indexPath = path.resolve(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Error: Carpeta dist no encontrada. Ejecuta "npm run build" antes de iniciar el servidor.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de Geckop´s Voleibol corriendo en el puerto ${PORT}`);
});

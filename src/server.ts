import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import openAIRoutes from './routes/openAI';

dotenv.config();

const app = express();
const port = process.env.PORT || 4200;

app.use(express.static(path.join(__dirname, 'public')));

app.use('/openai', openAIRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
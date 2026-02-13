import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import scoreRouter from './routes/score.js';
import streamRouter from './routes/stream.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', healthRouter);
app.use('/api', modelsRouter);
app.use('/api', chatRouter);
app.use('/api', streamRouter);
app.use('/api', scoreRouter);

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log('Configured providers:');
  console.log(`  Blackbox AI: ${config.blackboxApiKey ? 'YES' : 'NO'}`);
  console.log(`  Gemini:      ${config.geminiApiKey ? 'YES' : 'NO'}`);
  console.log(`  Claude:      ${config.claudeApiKey ? 'YES' : 'NO'}`);
});

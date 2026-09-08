import app from '../server/server.js';
import { connectDB } from '../server/config/dbMongo.js';

// Pre-connect database for serverless cold starts
connectDB().catch(err => {
  console.warn('[Vercel Serverless] DB connection warning:', err.message);
});

export default app;

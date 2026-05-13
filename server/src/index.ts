import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🏗️  Construction Tracker API`);
  console.log(`📡  Server running on port ${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📄  API docs: http://localhost:${PORT}/api/health\n`);
});

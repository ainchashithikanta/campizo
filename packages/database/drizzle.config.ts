import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://collegehub_user:collegehub_password@localhost:5432/collegehub_db'
  },
  verbose: true,
  strict: true
});

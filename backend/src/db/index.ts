import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({ 
  connectionString: process.env.POSTGRES_URL,
  // Limit connection pool size in serverless environments to prevent exhaustion
  max: isProd ? 2 : 10, 
  idleTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false // Tells Node.js to accept Supabase's proxy certificate OR download SUPABASE_DB_CA
  }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
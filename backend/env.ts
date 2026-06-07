if (process.env.NODE_ENV !== 'production') {
  const localDbUrl = "postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public";
  process.env.POSTGRES_URL = process.env.POSTGRES_URL || localDbUrl;
  process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL_NON_POOLING || localDbUrl;
}


const env = {
  PORT: process.env.PORT || 3000,
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL || "postgresql://user:password@localhost:5432/mydb",
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || "postgresql://user:password@localhost:5432/mydb",
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
  MCP_ENABLED: (process.env.MCP_ENABLED ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) === 'true',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'your-secret-key',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
};

export default env;


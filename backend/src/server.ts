import app from './index.js';

export const PORT = process.env.PORT || 3000;

// ==================== Start server ====================
const globalBun = (globalThis as any).Bun; // for Node & Bun inter-compatibility
if (import.meta.main && globalBun) {
  const server = globalBun.serve({
    port: Number(PORT),
    fetch: app.fetch,
  });
  console.log(`🚀 Backend server running on port ${server.port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.stop();
    console.log('HTTP server closed');
    process.exit(0);
  });
}
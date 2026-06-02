import app from '../backend/src/index';

// Export the fetch handler natively for Vercel's Node environment
export const RequestHandler = app.fetch;
export default RequestHandler;
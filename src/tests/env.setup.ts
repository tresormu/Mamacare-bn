// Sets required env vars before any module is imported in tests
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
process.env.MAMACARE_AI_KEY = process.env.MAMACARE_AI_KEY || 'test-ai-key';
process.env.FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY || 'test-public';
process.env.FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'test-secret';
process.env.FLW_SECRET_HASH = process.env.FLW_SECRET_HASH || 'test-hash';
process.env.FLW_REDIRECT_URL = process.env.FLW_REDIRECT_URL || 'http://localhost/callback';

import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "690322d4278b9ec835ac6014", 
  requiresAuth: true // Ensure authentication is required for all operations
});

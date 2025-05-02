import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
// These should be prefixed with VITE_ to be accessible in the browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create the Supabase client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true, // Store session in localStorage
      autoRefreshToken: true, // Refresh token automatically when expired
    }
  }
);

// Use the Provider type from Supabase's auth-js library
import type { Provider } from '@supabase/auth-js';

// Helper function to sign in with OAuth provider
export const signInWithProvider = async (provider: Provider) => {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};

// Helper function to sign out
export const signOut = async () => {
  return supabase.auth.signOut();
};

// Helper function to get the current session
export const getSession = async () => {
  return supabase.auth.getSession();
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user;
};
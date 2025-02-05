import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const signInAnonymously = async () => {
  try {
    // First check if we already have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }

    // Try to sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'anonymous@example.com',
      password: 'anonymous123'
    });

    if (error && error.status !== 400) {
      throw error;
    }

    // If sign in fails, create a new account
    if (!data.user) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'anonymous@example.com',
        password: 'anonymous123'
      });

      if (signUpError) {
        throw signUpError;
      }

      return signUpData.user;
    }

    return data.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return null;
  }
};
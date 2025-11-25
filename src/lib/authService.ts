import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

// =========================================================================
// TYPES
// =========================================================================

export interface AuthUser {
  id: string;
  email: string;
}

// =========================================================================
// SIGN UP
// =========================================================================

export async function signUp(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign up failed - no user returned');
  }

  return {
    id: data.user.id,
    email: data.user.email!,
  };
}

// =========================================================================
// SIGN IN
// =========================================================================

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign in failed - no user returned');
  }

  return {
    id: data.user.id,
    email: data.user.email!,
  };
}

// =========================================================================
// SIGN OUT
// =========================================================================

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

// =========================================================================
// GET CURRENT USER
// =========================================================================

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
  };
}

// =========================================================================
// GET CURRENT SESSION
// =========================================================================

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// =========================================================================
// AUTH STATE CHANGE LISTENER
// =========================================================================

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email!,
      });
    } else {
      callback(null);
    }
  });

  return subscription;
}

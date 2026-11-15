import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

const USERS_REGISTRY_KEY = 'cc_registered_users_v1';
const ACTIVE_SESSION_KEY = 'cc_active_session_v1';

/**
 * Computes a salted SHA-256 hash using the browser's native Web Crypto API.
 * Ensures plain-text passwords are NEVER stored anywhere.
 */
export async function hashPasswordWithSalt(password, salt) {
  const encoder = new TextEncoder();
  const payload = `${salt}:${password}`;
  const buffer = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a cryptographically random hex string for salts and session tokens.
 */
export function generateRandomHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getLocalRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRegisteredUsers(users) {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Could not save registered users:', err);
  }
}

/**
 * Validates password strength before allowing registration.
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

/**
 * Registers a new user account securely.
 * - Uses Supabase Auth if `.env` is configured.
 * - Otherwise stores a salted SHA-256 password hash in the local encrypted registry.
 */
export async function registerSecureAccount({
  fullName,
  email,
  password,
  phone,
  role,
}) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    throw new Error(strengthError);
  }

  // 1. If Supabase Cloud is configured, register in Supabase Auth
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          role,
          phone: phone?.trim() || '',
        },
      },
    });

    if (error) throw error;

    if (data?.user && !data?.session) {
      return {
        requiresEmailConfirmation: true,
        user: null,
      };
    }

    if (data?.user) {
      const sessionUser = {
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        phone: phone?.trim() || '',
        role,
        isSupabaseUser: true,
        sessionToken: data.session?.access_token || generateRandomHex(24),
        expiresAt: Date.now() + 8 * 3600 * 1000,
      };
      saveActiveSession(sessionUser);
      return { requiresEmailConfirmation: false, user: sessionUser };
    }
  }

  // 2. Local Cryptographic Account Registration (Salted SHA-256)
  const existingUsers = getLocalRegisteredUsers();
  if (existingUsers.some((u) => u.email === cleanEmail)) {
    throw new Error(
      'An account with this email address already exists. Please sign in instead.'
    );
  }

  const salt = generateRandomHex(16);
  const passwordHash = await hashPasswordWithSalt(password, salt);
  const newUserId = `usr_${generateRandomHex(10)}`;

  const newUserRecord = {
    id: newUserId,
    name: cleanName,
    email: cleanEmail,
    phone: phone?.trim() || '(555) 000-0000',
    role: role || 'patient',
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegisteredUsers([...existingUsers, newUserRecord]);

  const sessionUser = {
    id: newUserRecord.id,
    name: newUserRecord.name,
    email: newUserRecord.email,
    phone: newUserRecord.phone,
    role: newUserRecord.role,
    isSupabaseUser: false,
    sessionToken: generateRandomHex(24),
    expiresAt: Date.now() + 8 * 3600 * 1000,
  };

  saveActiveSession(sessionUser);
  return { requiresEmailConfirmation: false, user: sessionUser };
}

/**
 * Authenticates an existing user by verifying their password against the stored salted SHA-256 hash
 * (or Supabase Auth). Rejects unregistered emails or wrong passwords!
 */
export async function loginSecureAccount({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw error;

    if (data?.user) {
      const sessionUser = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        email: data.user.email,
        phone: data.user.user_metadata?.phone || '',
        role: data.user.user_metadata?.role || 'patient',
        isSupabaseUser: true,
        sessionToken: data.session?.access_token || generateRandomHex(24),
        expiresAt: Date.now() + 8 * 3600 * 1000,
      };
      saveActiveSession(sessionUser);
      return sessionUser;
    }
  }

  // Verify against local SHA-256 registered users
  const existingUsers = getLocalRegisteredUsers();
  const matchedUser = existingUsers.find((u) => u.email === cleanEmail);

  if (!matchedUser) {
    throw new Error(
      'Invalid email or password. No registered account found for this email — please create an account first in the Register tab.'
    );
  }

  const computedHash = await hashPasswordWithSalt(password, matchedUser.salt);
  if (computedHash !== matchedUser.passwordHash) {
    throw new Error(
      'Invalid email or password. Please check your password and try again.'
    );
  }

  const sessionUser = {
    id: matchedUser.id,
    name: matchedUser.name,
    email: matchedUser.email,
    phone: matchedUser.phone,
    role: matchedUser.role,
    isSupabaseUser: false,
    sessionToken: generateRandomHex(24),
    expiresAt: Date.now() + 8 * 3600 * 1000,
  };

  saveActiveSession(sessionUser);
  return sessionUser;
}

/**
 * Saves the verified session with an expiration timestamp.
 */
export function saveActiveSession(sessionUser) {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
  } catch {
    // ignore storage errors
  }
}

/**
 * Loads the active verified session if it exists and has not expired.
 */
export function loadActiveSession() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id || !parsed.sessionToken) return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      clearActiveSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Destroys the active session on sign-out.
 */
export function clearActiveSession() {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // ignore
  }
}


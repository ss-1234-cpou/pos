import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure persistent local browser auth state
setPersistence(auth, browserLocalPersistence).catch(() => {});

const EMAIL_HINT_KEY = 'pos_google_email_hint';

function createProvider(loginHint?: string | null, forceAccountPicker = false): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  const customParams: Record<string, string> = {};
  if (forceAccountPicker) {
    customParams.prompt = 'select_account';
  } else if (loginHint) {
    // Skip account chooser when returning user already has a known Google email
    customParams.login_hint = loginHint;
  }
  if (Object.keys(customParams).length > 0) {
    provider.setCustomParameters(customParams);
  }
  return provider;
}

// In-memory only access token cache (never store tokens in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

// Deduplicate concurrent sign-in requests so rapid clicks don't trigger auth/cancelled-popup-request
let inFlightSignIn: Promise<{ user: User; accessToken: string } | null> | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      try {
        if (user.email) {
          localStorage.setItem(EMAIL_HINT_KEY, user.email);
        }
      } catch {
        // Ignore storage errors
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, getValidCachedToken() || '');
      }
    } else {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

function getValidCachedToken(): string | null {
  if (!cachedAccessToken) return null;
  if (Date.now() >= cachedTokenExpiry) {
    cachedAccessToken = null;
    cachedTokenExpiry = 0;
    return null;
  }
  return cachedAccessToken;
}

export const hasCachedAccessToken = (): boolean => {
  return !!getValidCachedToken();
};

export interface GoogleSignInOptions {
  forceAccountPicker?: boolean;
}

// Must be called from a user button click / direct gesture
export const googleSignIn = async (
  options?: GoogleSignInOptions
): Promise<{ user: User; accessToken: string } | null> => {
  if (inFlightSignIn) {
    return inFlightSignIn;
  }

  inFlightSignIn = (async () => {
    try {
      let emailHint = auth.currentUser?.email || null;
      if (!emailHint) {
        try {
          emailHint = localStorage.getItem(EMAIL_HINT_KEY);
        } catch {
          emailHint = null;
        }
      }

      const provider = createProvider(
        options?.forceAccountPicker ? null : emailHint,
        Boolean(options?.forceAccountPicker)
      );

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Gagal mendapatkan token akses dari Google Auth.');
      }

      cachedAccessToken = credential.accessToken;
      // Google OAuth access tokens typically last 60 minutes; refresh proactively after 50 minutes
      cachedTokenExpiry = Date.now() + 50 * 60 * 1000;

      try {
        if (result.user.email) {
          localStorage.setItem(EMAIL_HINT_KEY, result.user.email);
        }
      } catch {
        // Ignore storage errors
      }

      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      const code = error?.code;

      // Closing the popup or cancelling a duplicate popup is a normal user action, not an app crash
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return null;
      }

      if (code === 'auth/popup-blocked') {
        throw new Error(
          'Pop-up login Google diblokir peramban. Izinkan pop-up di bilah alamat browser lalu coba lagi.'
        );
      }

      if (code === 'auth/unauthorized-domain') {
        throw new Error(
          'Domain web ini belum diizinkan di Firebase Console. Anda tetap dapat menggunakan POS secara lokal.'
        );
      }

      if (code === 'auth/network-request-failed') {
        throw new Error('Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.');
      }

      throw new Error(error?.message || 'Gagal masuk dengan akun Google.');
    } finally {
      inFlightSignIn = null;
    }
  })();

  return inFlightSignIn;
};

export const getAccessToken = async (): Promise<string | null> => {
  return getValidCachedToken();
};

export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  try {
    localStorage.removeItem(EMAIL_HINT_KEY);
  } catch {
    // Ignore
  }
};

export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

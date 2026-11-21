import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, Delete, ArrowRight, Store, KeyRound, Loader2, Check } from 'lucide-react';
import { StoreSettings } from '../types';
import { googleSignIn } from '../services/googleAuth';
import type { User } from 'firebase/auth';

interface AppLockScreenProps {
  settings: StoreSettings;
  onUnlock: (rememberDevice?: boolean) => void;
  onGoogleLoginSuccess?: (user: User, accessToken: string) => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  settings,
  onUnlock,
  onGoogleLoginSuccess,
}) => {
  const targetPin = settings.appLockPin || settings.ownerPin || '1234';
  const pinLength = targetPin.length;

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_remember_device') === 'true';
    } catch {
      return false;
    }
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const pinRef = useRef('');
  const errorTimerRef = useRef<number | null>(null);
  const rememberRef = useRef(rememberDevice);
  rememberRef.current = rememberDevice;

  const clearErrorTimer = () => {
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  };

  const verifyPin = useCallback(
    (code: string) => {
      if (code === targetPin) {
        clearErrorTimer();
        setError(false);
        setErrorMessage('');
        onUnlock(rememberRef.current);
      } else {
        setError(true);
        setErrorMessage('PIN tidak sesuai. Silakan coba lagi.');
        clearErrorTimer();
        errorTimerRef.current = window.setTimeout(() => {
          pinRef.current = '';
          setPin('');
          setError(false);
        }, 550);
      }
    },
    [targetPin, onUnlock]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      // If currently showing an error state, start fresh immediately on next keypress
      if (errorTimerRef.current !== null) {
        clearErrorTimer();
        setError(false);
        setErrorMessage('');
        pinRef.current = '';
      }

      if (pinRef.current.length >= 6) return;

      const nextPin = pinRef.current + digit;
      pinRef.current = nextPin;
      setPin(nextPin);
      setError(false);
      setGoogleNotice(null);

      if (nextPin.length === pinLength) {
        verifyPin(nextPin);
      }
    },
    [pinLength, verifyPin]
  );

  const handleDelete = useCallback(() => {
    clearErrorTimer();
    setError(false);
    const nextPin = pinRef.current.slice(0, -1);
    pinRef.current = nextPin;
    setPin(nextPin);
  }, []);

  const handleClear = useCallback(() => {
    clearErrorTimer();
    pinRef.current = '';
    setPin('');
    setError(false);
    setErrorMessage('');
  }, []);

  // Zero-lag keyboard listener (never re-binds on each digit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        if (pinRef.current.length > 0) {
          e.preventDefault();
          verifyPin(pinRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearErrorTimer();
    };
  }, [handleDigit, handleDelete, handleClear, verifyPin]);

  const handleGoogleUnlock = async () => {
    setIsGoogleLoading(true);
    setGoogleNotice(null);
    setError(false);
    try {
      const result = await googleSignIn();
      if (result) {
        if (onGoogleLoginSuccess) {
          onGoogleLoginSuccess(result.user, result.accessToken);
        }
        onUnlock(rememberRef.current);
      } else {
        setGoogleNotice('Login Google dibatalkan. Silakan masukkan PIN kasir atau coba lagi.');
      }
    } catch (err: any) {
      setGoogleNotice(err?.message || 'Tidak dapat membuka jendela login Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF7F2]/95 backdrop-blur-md p-4 select-none animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-sm bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-stone-900/10 flex flex-col items-center my-auto">
        
        {/* Store Logo / Icon */}
        <div className="mb-3 relative">
          {settings.logoUrl ? (
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-orange-500 shadow-md overflow-hidden flex items-center justify-center p-1">
              <img src={settings.logoUrl} alt={settings.storeName} className="w-full h-full object-cover rounded-xl" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-lg shadow-orange-600/20 flex items-center justify-center text-white">
              <Store className="w-8 h-8" />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Title */}
        <h1 className="text-lg font-black tracking-tight text-stone-900 text-center">
          {settings.storeName || 'Subur Sayur'}
        </h1>
        <p className="text-xs text-stone-500 mt-1 mb-5 text-center flex items-center gap-1.5 font-medium">
          <KeyRound className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span>Masukkan {pinLength} Digit PIN Kasir</span>
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3.5 mb-2 h-7">
          {Array.from({ length: pinLength }).map((_, i) => {
            const isFilled = pin.length > i;
            return (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  error
                    ? 'bg-rose-500 ring-4 ring-rose-500/20 scale-110'
                    : isFilled
                    ? 'bg-orange-600 ring-4 ring-orange-500/20 scale-115'
                    : 'bg-stone-100 border-2 border-stone-300'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Google notice */}
        <div className="min-h-[22px] mb-2 text-center px-2">
          {error && (
            <p className="text-xs font-bold text-rose-600">
              {errorMessage}
            </p>
          )}
          {!error && googleNotice && (
            <p className="text-[11px] font-semibold text-amber-700 leading-snug">
              {googleNotice}
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[264px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-12 rounded-2xl bg-stone-50 hover:bg-orange-50 active:bg-orange-600 active:text-white text-stone-900 font-extrabold text-lg border border-stone-200/90 hover:border-orange-300 transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-stone-50 hover:bg-rose-50 text-stone-500 hover:text-rose-600 text-xs font-bold border border-stone-200/70 transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-stone-50 hover:bg-orange-50 active:bg-orange-600 active:text-white text-stone-900 font-extrabold text-lg border border-stone-200/90 hover:border-orange-300 transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Hapus satu digit"
            className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/70 transition-all duration-100 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Manual submit button if pin has digits */}
        {pin.length > 0 && pin.length !== pinLength && (
          <button
            type="button"
            onClick={() => verifyPin(pin)}
            className="w-full max-w-[264px] py-2.5 px-4 mb-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
          >
            <span>Buka Kunci</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Remember Device Toggle */}
        <button
          type="button"
          onClick={() => setRememberDevice(prev => !prev)}
          className="flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900 font-medium mb-4 cursor-pointer"
        >
          <span
            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
              rememberDevice
                ? 'bg-orange-600 border-orange-600 text-white'
                : 'bg-white border-stone-300'
            }`}
          >
            {rememberDevice && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>Ingat perangkat ini (otomatis masuk)</span>
        </button>

        {/* Divider & Google Sign-In Alternative */}
        <div className="w-full max-w-[264px] pt-3 border-t border-stone-100 space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleUnlock}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-2.5 border border-stone-300 hover:border-orange-300 shadow-2xs transition-all active:scale-98 cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            )}
            <span>{isGoogleLoading ? 'Membuka Akun Google...' : 'Masuk dengan Akun Google'}</span>
          </button>
          <p className="text-[10px] text-stone-400 text-center">
            Gunakan keyboard angka atau tap tombol di layar
          </p>
        </div>
      </div>
    </div>
  );
};

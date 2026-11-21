import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../types';
import { 
  Camera, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Flashlight, 
  Volume2, 
  VolumeX, 
  ShoppingBag,
  Sparkles,
  Barcode
} from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product, quantity?: number) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<{
    type: 'success' | 'not_found';
    message: string;
    productName?: string;
    price?: number;
    barcode: string;
  } | null>(null);
  const [sessionScannedCount, setSessionScannedCount] = useState<number>(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const viewportId = 'camera-barcode-scanner-viewport';

  // Audio Beep
  const playBeep = () => {
    if (!isSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const playErrorTone = () => {
    if (!isSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  // Handle scanned barcode text
  const handleDecodedBarcode = (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    const now = Date.now();
    // Prevent duplicate scan of the same code within 1.8 seconds
    if (
      lastScannedTimeRef.current.code === cleanCode &&
      now - lastScannedTimeRef.current.time < 1800
    ) {
      return;
    }

    lastScannedTimeRef.current = { code: cleanCode, time: now };

    // Search product in list
    const matchedProduct = products.find(
      p =>
        p.barcode.toLowerCase() === cleanCode.toLowerCase() ||
        p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedProduct) {
      playBeep();
      onProductScanned(matchedProduct, 1);
      setSessionScannedCount(prev => prev + 1);
      setScannedFeedback({
        type: 'success',
        message: `+1 ${matchedProduct.name} berhasil masuk keranjang!`,
        productName: matchedProduct.name,
        price: matchedProduct.sellingPrice,
        barcode: cleanCode,
      });
    } else {
      playErrorTone();
      setScannedFeedback({
        type: 'not_found',
        message: `Barcode "${cleanCode}" belum terdaftar di produk toko`,
        barcode: cleanCode,
      });
    }

    // Auto clear feedback after 3.5s
    setTimeout(() => {
      setScannedFeedback(prev => (prev?.barcode === cleanCode ? null : prev));
    }, 3500);
  };

  // Start Scanner
  const startScanner = async (cameraIdToUse?: string) => {
    try {
      setIsInitializing(true);
      setScannerError(null);

      // Stop previous instance if running
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (cleanupErr) {
          console.warn('Cleanup error:', cleanupErr);
        }
      }

      const html5QrCode = new Html5Qrcode(viewportId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
      });

      scannerRef.current = html5QrCode;

      // Camera config: Prefer back camera (environment)
      const cameraConfig = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.75);
            return {
              width: Math.min(edge, 320),
              height: Math.min(Math.floor(edge * 0.65), 200),
            };
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          handleDecodedBarcode(decodedText);
        },
        () => {
          // Frame error callback - normal when barcode not in frame
        }
      );

      setIsScanning(true);
      setIsInitializing(false);

      // Check torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setIsTorchSupported(true);
        } else {
          setIsTorchSupported(false);
        }
      } catch {
        setIsTorchSupported(false);
      }
    } catch (err: any) {
      console.error('Camera Scanner start error:', err);
      setIsInitializing(false);
      setIsScanning(false);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission denied')) {
        setScannerError('Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan peramban (browser) Anda.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('no camera')) {
        setScannerError('Tidak ditemukan kamera aktif pada perangkat ini.');
      } else {
        setScannerError(`Gagal membuka kamera: ${errMsg}`);
      }
    }
  };

  // Toggle Torch/Flash
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setIsTorchOn(nextTorch);
    } catch (torchErr) {
      console.warn('Torch toggle error:', torchErr);
    }
  };

  // Initialize and get cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const init = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted) {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Default to back camera if available
            const backCam = devices.find(
              d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('belakang')
            );
            const chosenId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(chosenId);
            startScanner(chosenId);
          } else {
            // Direct attempt with facingMode
            startScanner();
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('getCameras error, fallback to facingMode:', err);
          startScanner();
        }
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(init, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.warn);
        }
        try {
          scannerRef.current.clear();
        } catch (clearErr) {
          console.warn('Clear error:', clearErr);
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle camera switch
  const handleCameraChange = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    startScanner(cameraId);
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 tracking-tight">
                  Pemindai Barcode Kamera
                </h3>
                {sessionScannedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {sessionScannedCount} Masuk
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Arahkan barcode atau SKU produk ke dalam kotak bidik
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer border border-stone-200"
            title="Tutup Pemindai (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-stone-950 flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] overflow-hidden">
          
          {/* HTML5 QR Code Container */}
          <div 
            id={viewportId} 
            className="w-full h-full max-w-[460px] overflow-hidden rounded-xl [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Scanner Overlay Frame */}
          {isScanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Scan box targeting corners */}
              <div className="relative w-[240px] sm:w-[280px] h-[160px] sm:h-[180px] border-2 border-orange-500/50 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
                
                {/* Red Laser Scanning Beam Animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Initializing / Loading Indicator */}
          {isInitializing && (
            <div className="absolute inset-0 bg-stone-950/90 flex flex-col items-center justify-center gap-3 text-white z-20">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-stone-200">Menghubungkan Kamera...</p>
                <p className="text-xs text-stone-400 mt-0.5">Mohon izinkan akses kamera jika diminta browser</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {scannerError && (
            <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center p-6 text-center text-white z-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-bold text-rose-300">Akses Kamera Terkendala</h4>
                <p className="text-xs text-stone-300 leading-relaxed">{scannerError}</p>
              </div>
              <button
                type="button"
                onClick={() => startScanner(selectedCameraId)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Hubungkan Ulang</span>
              </button>
            </div>
          )}

          {/* Viewfinder Controls Bar (Sound & Torch) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {isTorchSupported && (
              <button
                type="button"
                onClick={handleToggleTorch}
                title={isTorchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                className={`p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer border ${
                  isTorchOn 
                    ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md' 
                    : 'bg-stone-900/70 text-white border-white/20 hover:bg-stone-800/80'
                }`}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              title={isSoundEnabled ? 'Suara Bunyi Aktif' : 'Suara Bunyi Senyap'}
              className="p-2 rounded-xl bg-stone-900/70 text-white border border-white/20 hover:bg-stone-800/80 backdrop-blur-md transition-all cursor-pointer"
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            </button>
          </div>
        </div>

        {/* Live Scanned Feedback Card */}
        {scannedFeedback && (
          <div className={`p-3.5 border-t transition-all ${
            scannedFeedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {scannedFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {scannedFeedback.productName || scannedFeedback.message}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono-num truncate flex items-center gap-1.5">
                    <span>Barcode: {scannedFeedback.barcode}</span>
                    {scannedFeedback.price && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-emerald-700">{formatRp(scannedFeedback.price)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {scannedFeedback.type === 'success' && (
                <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                  Ditambahkan
                </span>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Camera Selection Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-stone-600 shrink-0 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-stone-500" />
              <span>Kamera:</span>
            </label>
            {cameras.length > 1 ? (
              <select
                value={selectedCameraId}
                onChange={e => handleCameraChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-medium text-stone-800 focus:outline-none focus:border-orange-500 cursor-pointer flex-1 sm:max-w-[200px]"
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Kamera ${cam.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-medium text-stone-700">
                {cameras[0]?.label || 'Kamera Utama Perangkat'}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs w-full sm:w-auto text-center"
            >
              Selesai Memindai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

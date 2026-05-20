import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { parseQrPayload } from "../lib/qr";
import { Button } from "./ui/Button";

interface QrScannerProps {
  onScan: (payload: { sid: string; tok: string }) => void;
  onInvalidScan?: (raw: string) => void;
  paused?: boolean;
}

async function pickCameraId(): Promise<string | { facingMode: string }> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length === 0) return { facingMode: "environment" };

    const back = cameras.find((c) =>
      /back|rear|environment|wide/i.test(c.label),
    );
    if (back) return back.id;

    const front = cameras.find((c) => /front|user|facetime/i.test(c.label));
    if (front) return front.id;

    return cameras[0]!.id;
  } catch {
    return { facingMode: "environment" };
  }
}

export function QrScanner({ onScan, onInvalidScan, paused }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef("");
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!paused) {
      lastScanRef.current = "";
    }
  }, [paused]);

  const handleDecoded = useCallback(
    (decoded: string) => {
      if (pausedRef.current) return;

      const text = decoded.trim();
      if (!text || text === lastScanRef.current) return;

      const payload = parseQrPayload(text);
      if (!payload) {
        onInvalidScan?.(text);
        return;
      }

      lastScanRef.current = text;
      onScan({ sid: payload.sid, tok: payload.tok });
    },
    [onScan, onInvalidScan],
  );

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        await scanner.clear();
      } catch {
        /* ignore */
      }
    }
    setActive(false);
    setStarting(false);
  }, []);

  const start = async () => {
    setError(null);
    setStarting(true);
    lastScanRef.current = "";

    const el = containerRef.current;
    if (!el) {
      setError("Scanner could not start. Refresh the page.");
      setStarting(false);
      return;
    }

    el.innerHTML = "";
    setActive(true);

    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const elementId = el.id || "qr-reader";
    if (!el.id) el.id = elementId;

    try {
      const scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      scannerRef.current = scanner;

      const cameras = [await pickCameraId(), { facingMode: "user" as const }];
      let started = false;
      let lastErr: unknown;

      for (const camera of cameras) {
        try {
          await scanner.start(
            camera,
            {
              fps: 15,
              qrbox: (w, h) => {
                const edge = Math.min(w, h);
                const size = Math.max(200, Math.floor(edge * 0.85));
                return { width: size, height: size };
              },
              aspectRatio: 1,
              disableFlip: false,
            },
            handleDecoded,
            () => {},
          );
          started = true;
          break;
        } catch (e) {
          lastErr = e;
          try {
            if (scanner.isScanning) await scanner.stop();
            await scanner.clear();
          } catch {
            /* ignore */
          }
        }
      }

      if (!started) {
        console.error("QR scanner start failed:", lastErr);
        setActive(false);
        setError(
          "Could not open camera. Allow camera permission in the browser, then try again.",
        );
      }
    } catch (e) {
      console.error("QR scanner error:", e);
      setActive(false);
      setError("Scanner failed to start. Use manual entry below.");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded border border-mist/40 bg-black">
        <div
          ref={containerRef}
          id="qr-reader"
          className={`qr-scanner-viewport w-full ${active ? "min-h-[280px]" : "min-h-[200px]"}`}
        />
        {!active && !starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-page">
            <p className="px-4 text-center text-sm text-mist">
              Tap &quot;Start camera&quot; then point at the student QR code
            </p>
          </div>
        )}
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
            <p className="text-sm text-mist">Starting camera…</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!active ? (
        <Button onClick={start} disabled={starting} className="w-full">
          Start camera
        </Button>
      ) : (
        <Button variant="secondary" onClick={stop} className="w-full">
          Stop camera
        </Button>
      )}

      <p className="text-center text-xs text-mist">
        Hold the QR steady inside the box. Works best in good light.
      </p>
    </div>
  );
}

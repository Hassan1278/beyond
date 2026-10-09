/** A QR code for the live app, so judges can open it on their own phone. */
import { useEffect, useState, type ReactElement } from 'react';
import QRCode from 'qrcode';

export function QrPanel({ onClose }: { onClose: () => void }): ReactElement {
  const [src, setSrc] = useState<string | null>(null);
  const url = `${window.location.origin}${window.location.pathname}?mode=app#/app`;

  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(url, {
      width: 464,
      margin: 0,
      color: { dark: '#0b0c0eff', light: '#f4f3eeff' },
    }).then((d) => {
      if (live) setSrc(d);
    });
    return () => {
      live = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="qr-bg"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="qr" role="dialog" aria-label="Open Beyond on a phone">
        {src ? <img src={src} alt={`QR code for ${url}`} /> : <div className="qr-ph" />}
        <h3>Open it on your phone</h3>
        <p>
          Scan this and Beyond opens full-screen, as the app. Add it to your home screen and it
          launches without browser chrome.
        </p>
        <code>{url}</code>
        <button type="button" className="pb ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

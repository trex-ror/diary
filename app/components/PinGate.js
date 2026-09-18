'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './PinGate.module.css';

/**
 * PinGate — layar PIN dengan kotak digit terpisah (OTP style)
 * Props:
 *  - pinLength : jumlah digit (default 6)
 *  - correctPin: string PIN yang benar
 *  - storageKey : sessionStorage key agar tidak perlu ulang input setiap refresh
 *  - onUnlock  : callback saat PIN benar
 *  - title     : judul yang ditampilkan
 */
export default function PinGate({ pinLength = 6, correctPin, storageKey, onUnlock, title = 'Diary With You' }) {
  const [digits, setDigits] = useState(Array(pinLength).fill(''));
  const [error,  setError]  = useState(false);
  const [shake,  setShake]  = useState(false);
  const inputRefs = useRef([]);

  // Cek session storage — jika sudah pernah unlock di sesi ini, langsung buka
  useEffect(() => {
    if (storageKey && sessionStorage.getItem(storageKey) === 'unlocked') {
      onUnlock();
    }
  }, []);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return; // hanya angka

    const next = [...digits];
    next[idx] = val.slice(-1); // ambil 1 digit terakhir
    setDigits(next);
    setError(false);

    // Auto-focus ke kotak berikutnya
    if (val && idx < pinLength - 1) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Cek otomatis saat semua terisi
    const full = next.join('');
    if (full.length === pinLength) {
      checkPin(full, next);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      // Hapus digit sebelumnya dan fokus ke sana
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, pinLength);
    if (!paste) return;
    const next = Array(pinLength).fill('');
    paste.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    e.preventDefault();
    if (paste.length === pinLength) checkPin(paste, next);
  };

  const checkPin = (full, next) => {
    if (full === correctPin) {
      if (storageKey) sessionStorage.setItem(storageKey, 'unlocked');
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits(Array(pinLength).fill(''));
        inputRefs.current[0]?.focus();
      }, 600);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.box} ${shake ? styles.shake : ''}`}>
        <div className={styles.icon}>📔</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>Masukkan PIN untuk membuka</p>

        <div className={styles.pinRow} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              className={`${styles.digitBox} ${error ? styles.errorBox : ''}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        {error && <p className={styles.errorMsg}>PIN salah, coba lagi</p>}
      </div>
    </div>
  );
}

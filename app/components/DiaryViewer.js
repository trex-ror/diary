'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './DiaryViewer.module.css';
import DiaryCover from './DiaryCover';
import DiaryPage from './DiaryPage';
import DiaryBackCover from './DiaryBackCover';
import PinGate from './PinGate';

const VIEWER_PIN = process.env.NEXT_PUBLIC_VIEWER_PIN || '170508';

// StPageFlip is loaded via CDN script tag
export default function DiaryViewer({ pages }) {
  const containerRef = useRef(null);
  const pageFlipRef  = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded]       = useState(false);
  const [unlocked, setUnlocked]       = useState(false);
  const totalPages = pages.length + 2;

  // Load StPageFlip from CDN — only after user unlocks (viewer DOM must exist)
  useEffect(() => {
    if (!unlocked) return;   // ← jangan init sebelum PIN benar

    if (document.getElementById('stf-script')) {
      initFlipbook();
      return;
    }
    const script = document.createElement('script');
    script.id  = 'stf-script';
    script.src = 'https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js';
    script.onload = initFlipbook;
    document.head.appendChild(script);
  }, [unlocked]);   // ← re-run saat unlocked berubah menjadi true

  function initFlipbook() {
    if (!containerRef.current || pageFlipRef.current) return;
    const St = window.St;
    if (!St) return;

    const wrapper    = document.getElementById('diary-pages-wrapper');
    const allPages   = wrapper.querySelectorAll('.flip-page');
    const container  = containerRef.current;
    const h          = container.offsetHeight;
    const pageW      = Math.floor(h * 0.68); // portrait ratio

    pageFlipRef.current = new St.PageFlip(container, {
      width:  pageW,
      height: h,
      size:   'fixed',
      minWidth: pageW, maxWidth: pageW,
      minHeight: h,   maxHeight: h,
      showCover:          true,
      drawShadow:         true,
      flippingTime:       700,
      usePortrait:        false,
      startZIndex:        0,
      autoSize:           false,
      maxShadowOpacity:   0.5,
      showPageCorners:    true,
      useMouseEvents:     true,
      swipeDistance:      30,
    });

    pageFlipRef.current.loadFromHTML(allPages);

    pageFlipRef.current.on('flip', (e) => {
      setCurrentPage(e.data);
    });

    setIsLoaded(true);
  }

  const flipNext = () => pageFlipRef.current?.flipNext();
  const flipPrev = () => pageFlipRef.current?.flipPrev();

  // Tampilkan PIN gate sampai user unlock
  if (!unlocked) {
    return (
      <PinGate
        pinLength={VIEWER_PIN.length}
        correctPin={VIEWER_PIN}
        storageKey="diary-viewer-unlocked"
        onUnlock={() => setUnlocked(true)}
        title="Diary With You"
      />
    );
  }

  return (
    <div className={styles.root}>
      {/* Hidden wrapper that StPageFlip reads from */}
      <div id="diary-pages-wrapper" style={{ display: 'none' }}>
        {/* Front Cover */}
        <div className="flip-page" data-density="hard">
          <DiaryCover />
        </div>

        {/* Content Pages */}
        {pages.map((pg) => (
          <div key={pg.id} className="flip-page">
            <DiaryPage page={pg} />
          </div>
        ))}

        {/* If odd number of content pages, add a blank */}
        {pages.length % 2 !== 0 && (
          <div className="flip-page">
            <div className="diary-page has-grid" />
          </div>
        )}

        {/* Back Cover */}
        <div className="flip-page" data-density="hard">
          <DiaryBackCover />
        </div>
      </div>

      {/* Book frame */}
      <div className={styles.bookFrame}>
        {/* Left page stack */}
        <div
          className={styles.stackLeft}
          style={{ width: `${Math.round(2 + 20 * (currentPage / Math.max(totalPages - 1, 1)))}px` }}
        />

        {/* Flipbook container */}
        <div ref={containerRef} className={styles.flipContainer} />

        {/* Right page stack */}
        <div
          className={styles.stackRight}
          style={{ width: `${Math.round(2 + 20 * (1 - currentPage / Math.max(totalPages - 1, 1)))}px` }}
        />
      </div>

      {/* Nav arrows */}
      <button className={`${styles.navBtn} ${styles.navLeft}`}  onClick={flipPrev} aria-label="Halaman sebelumnya">‹</button>
      <button className={`${styles.navBtn} ${styles.navRight}`} onClick={flipNext} aria-label="Halaman berikutnya">›</button>

      {/* Page counter */}
      <div className={styles.pageCounter}>
        {currentPage + 1} / {totalPages}
      </div>

      {/* Link ke editor */}
      <a href="/editor" className={styles.editorLink} title="Tambah kenangan">✏️</a>
    </div>
  );
}

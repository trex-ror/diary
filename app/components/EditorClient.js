'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import styles from './EditorClient.module.css';
import PinGate from './PinGate';

const EDITOR_PIN = process.env.NEXT_PUBLIC_EDITOR_PIN || '1234';

// ── Photo item with draggable/rotatable state ──────────────────────
function DraggableItem({ item, onUpdate, onRemove, containerRef }) {
  const itemRef   = useRef(null);
  const dragging  = useRef(false);
  const startData = useRef({});

  const onMouseDown = (e) => {
    if (e.target.classList.contains('rotate-handle')) return;
    dragging.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    startData.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX:  item.x,
      origY:  item.y,
      cW: rect.width,
      cH: rect.height,
    };
    e.preventDefault();
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const d = startData.current;
    const dx = ((e.clientX - d.startX) / d.cW) * 100;
    const dy = ((e.clientY - d.startY) / d.cH) * 100;
    onUpdate({ x: Math.max(0, Math.min(90, d.origX + dx)), y: Math.max(0, Math.min(90, d.origY + dy)) });
  }, [onUpdate]);

  const onMouseUp = () => { dragging.current = false; };

  // Rotate handle drag
  const onRotateMouseDown = (e) => {
    e.stopPropagation();
    const rect = itemRef.current.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;

    const move = (ev) => {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
      onUpdate({ rotation: Math.round(angle) });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const style = {
    position: 'absolute',
    left:      `${item.x}%`,
    top:       `${item.y}%`,
    width:     `${item.width}%`,
    transform: `rotate(${item.rotation}deg)`,
    zIndex:    10,
    cursor:    'move',
  };

  const templateClass = item.type === 'note'
    ? 'mem-note'
    : item.type === 'video'
      ? 'mem-video mem-photo'
      : `mem-photo photo-${item.template}`;

  return (
    <div
      ref={itemRef}
      className={`${styles.draggableItem} ${templateClass}`}
      style={style}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {item.type === 'note' && <span>{item.note_text || '(catatan kosong)'}</span>}
      {item.type === 'photo' && (
        <img className="mem-img" src={item.previewUrl} alt="" />
      )}
      {item.type === 'video' && (
        <video src={item.previewUrl} autoPlay loop muted playsInline />
      )}
      {item.type === 'polaroid' && item.caption && (
        <div className="mem-caption">{item.caption}</div>
      )}

      {/* Controls overlay */}
      <div className={styles.itemControls}>
        <button className="rotate-handle" onMouseDown={onRotateMouseDown} title="Putar">↻</button>
        <button onClick={() => onUpdate({ width: Math.max(15, item.width - 5) })} title="Kecilkan">−</button>
        <button onClick={() => onUpdate({ width: Math.min(90, item.width + 5) })} title="Besarkan">+</button>
        <button onClick={onRemove} title="Hapus">✕</button>
      </div>
    </div>
  );
}

// ── Main Editor Component ──────────────────────────────────────────
export default function EditorClient() {
  const [pin,       setPin]       = useState('');
  const [unlocked,  setUnlocked]  = useState(false);
  const [pinError,  setPinError]  = useState('');

  const [items,       setItems]       = useState([]);     // items on current draft page
  const [noteText,    setNoteText]    = useState('');
  const [caption,     setCaption]     = useState('');
  const [template,    setTemplate]    = useState('polaroid');
  const [isSaving,    setIsSaving]    = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');

  const pageCanvasRef = useRef(null);
  const fileInputRef  = useRef(null);

  // ── PIN check ──
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === EDITOR_PIN) {
      setUnlocked(true);
    } else {
      setPinError('PIN salah. Coba lagi.');
      setPin('');
    }
  };

  // ── Add file (photo or video) ──
  const handleFileAdd = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const previewUrl = URL.createObjectURL(file);

    setItems(prev => [...prev, {
      id:         Date.now(),
      type:       isVideo ? 'video' : 'photo',
      template,
      file,
      previewUrl,
      x:          15,
      y:          15,
      rotation:   Math.round((Math.random() - 0.5) * 12), // slight random tilt
      width:      42,
      caption,
    }]);
    setCaption('');
    e.target.value = '';
  };

  // ── Add note ──
  const handleNoteAdd = () => {
    if (!noteText.trim()) return;
    setItems(prev => [...prev, {
      id:       Date.now(),
      type:     'note',
      note_text: noteText,
      x:        20,
      y:        20,
      rotation: Math.round((Math.random() - 0.5) * 6),
      width:    45,
    }]);
    setNoteText('');
  };

  // ── Update item property ──
  const updateItem = (id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  // ── Remove item ──
  const removeItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // ── Save page to Supabase ──
  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    setSaveMsg('');

    try {
      // 1. Get next page number
      const { data: existing } = await supabase
        .from('pages')
        .select('page_number')
        .order('page_number', { ascending: false })
        .limit(1);
      const nextNum = (existing?.[0]?.page_number ?? 0) + 1;

      // 2. Insert new page
      const { data: newPage, error: pageErr } = await supabase
        .from('pages')
        .insert({ page_number: nextNum })
        .select()
        .single();
      if (pageErr) throw pageErr;

      // 3. Upload files + insert items
      for (const item of items) {
        let file_url = null;

        if (item.file) {
          const ext    = item.file.name.split('.').pop();
          const path   = `${newPage.id}/${item.id}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('diary-media')
            .upload(path, item.file, { cacheControl: '3600', upsert: false });
          if (upErr) throw upErr;

          const { data: urlData } = supabase.storage
            .from('diary-media')
            .getPublicUrl(path);
          file_url = urlData.publicUrl;
        }

        const { error: itemErr } = await supabase
          .from('items')
          .insert({
            page_id:   newPage.id,
            type:      item.type,
            file_url,
            template:  item.template || 'polaroid',
            x:         item.x,
            y:         item.y,
            rotation:  item.rotation,
            width:     item.width,
            caption:   item.caption || '',
            note_text: item.note_text || '',
          });
        if (itemErr) throw itemErr;
      }

      setSaveMsg(`✅ Halaman ${nextNum} berhasil disimpan!`);
      setItems([]);
    } catch (err) {
      console.error(err);
      setSaveMsg('❌ Gagal menyimpan. Cek koneksi Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── PIN Gate ──
  if (!unlocked) {
    return (
      <PinGate
        pinLength={EDITOR_PIN.length}
        correctPin={EDITOR_PIN}
        storageKey="diary-editor-unlocked"
        onUnlock={() => setUnlocked(true)}
        title="Editor — Diary With You"
      />
    );
  }


  // ── Editor UI ──
  return (
    <div className={styles.editorRoot}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>📔 Tambah Kenangan</div>

        {/* Template selector */}
        <section className={styles.section}>
          <label className={styles.label}>Style Foto</label>
          <div className={styles.templateBtns}>
            {['polaroid', 'vintage', 'taped', 'plain'].map(t => (
              <button
                key={t}
                className={`${styles.templateBtn} ${template === t ? styles.active : ''}`}
                onClick={() => setTemplate(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Caption input (for polaroid) */}
        {template === 'polaroid' && (
          <section className={styles.section}>
            <label className={styles.label}>Caption (opsional)</label>
            <input
              className={styles.textInput}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. our first date ♡"
            />
          </section>
        )}

        {/* File upload */}
        <section className={styles.section}>
          <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
            📷 Upload Foto / Video
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            style={{ display: 'none' }}
            onChange={handleFileAdd}
          />
          <p className={styles.hint}>Video max 5 detik, ukuran kecil</p>
        </section>

        {/* Note input */}
        <section className={styles.section}>
          <label className={styles.label}>Tambah Catatan</label>
          <textarea
            className={styles.textArea}
            rows={4}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Tulis sesuatu yang kamu rasakan..."
          />
          <button className={styles.noteBtn} onClick={handleNoteAdd}>+ Tambahkan Catatan</button>
        </section>

        {/* Save */}
        <section className={styles.section}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
          >
            {isSaving ? 'Menyimpan...' : '💾 Simpan Halaman'}
          </button>
          {saveMsg && <p className={styles.saveMsg}>{saveMsg}</p>}
        </section>

        <a href="/" className={styles.viewerLink}>← Lihat Diary</a>
      </aside>

      {/* Page canvas */}
      <main className={styles.canvas}>
        <div ref={pageCanvasRef} className={`${styles.pagePreview} diary-page has-grid`}>
          {items.length === 0 && (
            <div className={styles.emptyHint}>
              Upload foto, video, atau tambah catatan →
            </div>
          )}
          {items.map(item => (
            <DraggableItem
              key={item.id}
              item={item}
              containerRef={pageCanvasRef}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

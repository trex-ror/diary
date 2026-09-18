'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import styles from './EditorClient.module.css';
import PinGate from './PinGate';

const EDITOR_PIN = process.env.NEXT_PUBLIC_EDITOR_PIN || '1234';

// ── Photo item with draggable/rotatable state ──────────────────────
function DraggableItem({ item, isSelected, onSelect, onUpdate, onRemove, containerRef }) {
  const itemRef    = useRef(null);
  const dragging   = useRef(false);
  const startData  = useRef({});
  const [editing, setEditing] = useState(false); // for notes

  // ── Drag (move) ──
  const onMouseDown = (e) => {
    // Select this item on click
    onSelect();
    // Don't start drag when clicking control buttons or textarea
    if (e.target.closest(`.${styles.itemControls}`) || e.target.tagName === 'TEXTAREA') return;
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

  // ── Rotate handle ──
  const onRotateMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
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

  // ── Resize ──
  const onShrink = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdate({ width: Math.max(15, (item.width || 42) - 5) });
  };
  const onGrow = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdate({ width: Math.min(95, (item.width || 42) + 5) });
  };
  const onRemoveClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove();
  };

  const style = {
    position:  'absolute',
    left:      `${item.x}%`,
    top:       `${item.y}%`,
    width:     `${item.width || 42}%`,
    transform: `rotate(${item.rotation || 0}deg)`,
    zIndex:    10,
    cursor:    'move',
    // Notes: natural height from content; photos: fixed aspect ratio
    ...(item.type === 'note'
      ? { minHeight: '80px' }
      : { aspectRatio: item.template === 'polaroid' ? '3/4' : '4/3' }
    ),
  };

  const templateClass = item.type === 'note'
    ? 'mem-note'
    : item.type === 'video'
      ? 'mem-video mem-photo'
      : `mem-photo photo-${item.template || 'polaroid'}`;

  return (
    <div
      ref={itemRef}
      className={`${styles.draggableWrapper} ${isSelected ? styles.selected : ''}`}
      style={style}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Actual styled element */}
      <div className={`${templateClass} ${styles.innerItem}`}>
        {item.type === 'note' && !editing && (
          <span>{item.note_text || '(catatan kosong)'}</span>
        )}
        {item.type === 'note' && editing && (
          <textarea
            className={styles.noteEditArea}
            defaultValue={item.note_text}
            autoFocus
            onBlur={(e) => {
              onUpdate({ note_text: e.target.value });
              setEditing(false);
            }}
          />
        )}
        {item.type === 'photo' && (
          <img className="mem-img" src={item.previewUrl} alt="" />
        )}
        {item.type === 'video' && (
          <video src={item.previewUrl} autoPlay loop muted playsInline />
        )}
        {item.type === 'photo' && item.template === 'polaroid' && item.caption && (
          <div className="mem-caption">{item.caption}</div>
        )}
      </div>

      {/* Controls — only visible when selected */}
      {isSelected && (
        <div className={styles.itemControls}>
          <button onMouseDown={onRotateMouseDown} title="Putar">↻</button>
          <button onMouseDown={onShrink}          title="Kecilkan">−</button>
          <button onMouseDown={onGrow}            title="Besarkan">+</button>
          {item.type === 'note' && (
            <button onMouseDown={(e) => { e.stopPropagation(); setEditing(true); }} title="Edit">✎</button>
          )}
          <button onMouseDown={onRemoveClick}     title="Hapus">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Main Editor Component ──────────────────────────────────────────
export default function EditorClient() {
  const [unlocked,   setUnlocked]   = useState(false);
  const [items,      setItems]      = useState([]);
  const [selectedId, setSelectedId] = useState(null);  // which item is selected
  const [noteText,   setNoteText]   = useState('');
  const [caption,   setCaption]   = useState('');
  const [template,  setTemplate]  = useState('polaroid');
  const [isSaving,  setIsSaving]  = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');

  const pageCanvasRef = useRef(null);
  const fileInputRef  = useRef(null);

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
      x:          10,
      y:          10,
      rotation:   Math.round((Math.random() - 0.5) * 10),
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
      id:        Date.now(),
      type:      'note',
      note_text: noteText,
      x:         20,
      y:         20,
      rotation:  Math.round((Math.random() - 0.5) * 6),
      width:     45,
    }]);
    setNoteText('');
  };

  const updateItem = (id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

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
      const { data: existing, error: fetchErr } = await supabase
        .from('pages')
        .select('page_number')
        .order('page_number', { ascending: false })
        .limit(1);

      if (fetchErr) throw new Error(`Koneksi DB gagal: ${fetchErr.message}`);
      const nextNum = (existing?.[0]?.page_number ?? 0) + 1;

      // 2. Insert new page
      const { data: newPage, error: pageErr } = await supabase
        .from('pages')
        .insert({ page_number: nextNum })
        .select()
        .single();
      if (pageErr) throw new Error(`Gagal buat halaman: ${pageErr.message}`);

      // 3. Upload files + insert items
      for (const item of items) {
        let file_url = null;

        if (item.file) {
          const ext  = item.file.name.split('.').pop();
          const path = `${newPage.id}/${item.id}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('diary-media')
            .upload(path, item.file, { cacheControl: '3600', upsert: false });
          if (upErr) throw new Error(`Upload gagal: ${upErr.message}`);

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
        if (itemErr) throw new Error(`Gagal simpan item: ${itemErr.message}`);
      }

      setSaveMsg(`✅ Halaman ${nextNum} berhasil disimpan!`);
      setItems([]);
    } catch (err) {
      console.error('Save error:', err);
      setSaveMsg(`❌ ${err.message}`);
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

        {/* Item list preview */}
        {items.length > 0 && (
          <section className={styles.section}>
            <label className={styles.label}>Di Halaman ({items.length})</label>
            {items.map(it => (
              <div key={it.id} className={styles.itemChip}>
                <span>
                  {it.type === 'note' ? '📝' : it.type === 'video' ? '🎬' : '📷'}
                  {' '}
                  {it.type === 'note'
                    ? (it.note_text?.slice(0, 20) + (it.note_text?.length > 20 ? '…' : ''))
                    : (it.template + ' photo')}
                </span>
                <button onClick={() => removeItem(it.id)}>✕</button>
              </div>
            ))}
          </section>
        )}

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

      {/* Page canvas — click empty area to deselect */}
      <main className={styles.canvas}>
        <div
          ref={pageCanvasRef}
          className={`${styles.pagePreview} diary-page has-grid`}
          onMouseDown={(e) => {
            // deselect if clicking directly on canvas (not on an item)
            if (e.target === pageCanvasRef.current) setSelectedId(null);
          }}
        >
          {items.length === 0 && (
            <div className={styles.emptyHint}>
              Upload foto, video, atau tambah catatan →
            </div>
          )}
          {items.map(item => (
            <DraggableItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onSelect={() => setSelectedId(item.id)}
              containerRef={pageCanvasRef}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onRemove={() => { removeItem(item.id); setSelectedId(null); }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

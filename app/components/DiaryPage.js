export default function DiaryPage({ page }) {
  const items = page.items || [];

  return (
    <div className="diary-page has-grid">
      {/* Render each item on the page */}
      {items.map((item) => {
        const commonStyle = {
          position:  'absolute',
          left:      `${item.x}%`,
          top:       `${item.y}%`,
          width:     `${item.width}%`,
          transform: `rotate(${item.rotation}deg)`,
          zIndex:    10,
        };

        if (item.type === 'note') {
          const fontClass = item.font_family ? 'font-' + item.font_family.toLowerCase().replace(/ /g, '-') : 'font-caveat';
          return (
            <div
              key={item.id}
              className="mem-note"
              style={{ ...commonStyle, minHeight: '80px' }}
            >
              <div 
                className={`note-text-content ${fontClass}`}
                style={{ fontFamily: item.font_family || 'Caveat, cursive' }}
              >
                {item.note_text}
              </div>
            </div>
          );
        }

        if (item.type === 'video') {
          return (
            <div key={item.id} className="mem-video mem-photo" style={commonStyle}>
              <video
                src={item.file_url}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          );
        }

        // Default: photo (polaroid / vintage / taped)
        const templateClass = `photo-${item.template || 'polaroid'}`;
        return (
          <div
            key={item.id}
            className={`mem-photo ${templateClass}`}
            style={commonStyle}
          >
            <img className="mem-img" src={item.file_url} alt={item.caption || 'Memory'} />
            {item.caption && item.template === 'polaroid' && (
              <div className="mem-caption">{item.caption}</div>
            )}
          </div>
        );
      })}

      {/* Page number bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right:  '16px',
        fontFamily: "'Special Elite', serif",
        fontSize: '11px',
        color: 'rgba(100,80,50,0.45)',
        letterSpacing: '0.08em',
      }}>
        {page.page_number}
      </div>
    </div>
  );
}

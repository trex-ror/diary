export default function DiaryCover() {
  const year = new Date().getFullYear();
  return (
    <div className="diary-cover">
      <div className="diary-cover-subtitle">a shared diary</div>
      <div className="diary-cover-divider" />
      <div className="diary-cover-title">
        <em>Diary</em><br />With You
      </div>
      <div className="diary-cover-divider" />
      <div className="diary-cover-year">{year}</div>
    </div>
  );
}

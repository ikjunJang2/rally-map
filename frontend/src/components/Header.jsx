export default function Header({ onToggleBig, onToggleDark }) {
  return (
    <header className="app-header">
      <h1>🕊️ 집회 한 장 지도 <span className="venue">핸드볼경기장</span></h1>
      <div className="toggles">
        <button onClick={onToggleBig} aria-label="글자 크게">가나 크게</button>
        <button onClick={onToggleDark} aria-label="어두운 화면">🌙</button>
      </div>
    </header>
  );
}

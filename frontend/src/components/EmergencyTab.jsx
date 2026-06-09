const CONTACTS = [
  { icon: '🚑', title: '응급의료 · 화재', sub: '위급 상황', num: '119', danger: true },
  { icon: '🚓', title: '경찰 신고', sub: '', num: '112', danger: true },
  { icon: '☎️', title: '서울시 다산콜', sub: '화장실·교통 등 생활 문의', num: '120' },
  { icon: '⚖️', title: '민주사회를 위한 변호사모임 사무처', sub: '인권침해 법률 상담 연결', num: '02-522-7284' },
  { icon: '🧑‍⚖️', title: '국가인권위원회 상담', sub: '', num: '1331' },
];

export default function EmergencyTab() {
  return (
    <section>
      <h2 className="tab-title">누르면 바로 전화가 걸려요</h2>
      {CONTACTS.map((c) => (
        <a key={c.num} className={`callbtn ${c.danger ? 'danger' : ''}`} href={`tel:${c.num.replaceAll('-', '')}`}>
          <span>
            {c.icon} {c.title}
            {c.sub && <><br /><small>{c.sub}</small></>}
          </span>
          <span className="num">{c.num}</span>
        </a>
      ))}
      <div className="card">
        <h3>📝 미리 적어두면 좋아요</h3>
        <p className="meta">
          일행과 헤어졌을 때 만날 장소를 정해두세요. 휴대폰 배터리가 없을 때를 대비해
          가족 전화번호를 종이에 적어 지니세요.
        </p>
      </div>
    </section>
  );
}

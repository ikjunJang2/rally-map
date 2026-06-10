import { Ambulance, Siren, PhoneCall, Scale, ShieldCheck, StickyNote,
  AlertTriangle, ShieldAlert, Ban, Camera, type LucideIcon } from 'lucide-react';

const CONTACTS: { Icon: LucideIcon; title: string; sub: string; num: string; danger: boolean }[] = [
  { Icon: Ambulance, title: '응급의료 · 화재', sub: '위급 상황', num: '119', danger: true },
  { Icon: Siren, title: '경찰 신고', sub: '', num: '112', danger: true },
  { Icon: PhoneCall, title: '서울시 다산콜', sub: '화장실·교통 등 생활 문의', num: '120', danger: false },
  { Icon: Scale, title: '민주사회를 위한 변호사모임 사무처', sub: '인권침해 법률 상담 연결', num: '02-522-7284', danger: false },
  { Icon: ShieldCheck, title: '국가인권위원회 상담', sub: '', num: '1331', danger: false },
];

export default function EmergencyPage() {
  return (
    <section aria-label="긴급 연락처와 권리 카드">
      <h2 className="tab-title"><PhoneCall size={20} className="ic accent" aria-hidden="true" />누르면 바로 전화가 걸려요</h2>
      {CONTACTS.map((c) => (
        <a key={c.num} className={`callbtn ${c.danger ? 'danger' : ''}`} href={`tel:${c.num.replaceAll('-', '')}`}>
          <span className={`call-ic ${c.danger ? 'danger' : ''}`} aria-hidden="true">
            <c.Icon size={22} />
          </span>
          <span className="call-text">
            {c.title}
            {c.sub && <small>{c.sub}</small>}
          </span>
          <span className="num">{c.num}</span>
        </a>
      ))}

      {/* ── 긴급 권리 카드 (Phase 0) ── */}
      <h2 className="tab-title" style={{ marginTop: 26 }}>
        <ShieldAlert size={20} className="ic accent" aria-hidden="true" />긴급 권리 카드
      </h2>

      <div className="card beta-banner" role="note">
        <p>
          <AlertTriangle size={15} aria-hidden="true" /> <b>법률 자문이 아닙니다.</b> 민주사회를 위한 변호사모임(민변)의
          법률 검수 전 <b>베타</b> 안내예요. 구체적인 사건은 반드시 변호사와 상담하세요.
        </p>
      </div>

      <div className="card rights-card">
        <h3><ShieldAlert size={17} className="ic accent" aria-hidden="true" />연행·체포될 때</h3>
        <p>경찰은 체포할 때 반드시 이 네 가지를 알려야 해요:</p>
        <ul className="tips">
          <li>① 무슨 혐의인지(피의사실의 요지)</li>
          <li>② 체포하는 이유</li>
          <li>③ <b>변호인을 선임할 수 있다</b>는 것</li>
          <li>④ 변명할 기회</li>
        </ul>
        <p className="law-note">근거: 형사소송법 제200조의5. 이 고지를 못 받았다면 기억해 두세요.</p>
      </div>

      <div className="card rights-card">
        <h3><Ban size={17} className="ic accent" aria-hidden="true" />말하지 않을 권리 (진술거부권)</h3>
        <p>
          조사·신문에서 <b>불리한 진술을 강요당하지 않아요.</b>
          "진술을 거부하겠습니다 · 변호인과 상의한 뒤 말하겠습니다"라고 말할 수 있고,
          <b> 거부해도 그 자체로 불이익은 없어요.</b>
        </p>
        <p className="law-note">근거: 헌법 제12조 제2항 · 형사소송법 제244조의3</p>
      </div>

      <div className="card rights-card">
        <h3><ShieldCheck size={17} className="ic accent" aria-hidden="true" />불심검문 · 임의동행</h3>
        <p>
          경찰관에게 <b>소속·성명·검문 이유</b>를 물을 수 있어요.
          <b> 임의동행 요구는 거부할 수 있고</b>, 동행하더라도 가족·변호사에게 연락할 권리가 있어요.
        </p>
        <p className="law-note">근거: 경찰관 직무집행법 제3조</p>
      </div>

      <div className="card rights-card">
        <h3><Camera size={17} className="ic accent" aria-hidden="true" />촬영 · 녹음 (주의)</h3>
        <ul className="tips">
          <li>경찰의 채증 촬영에 대해 헌법재판소는 <b>위헌이 아니라고 봤어요</b>(2018년 기각 결정). 채증 자체가 곧 불법은 아니에요.</li>
          <li>본인이 현장을 찍는 건 가능하지만, <b>일반 참가자 얼굴이 식별되게 찍어 온라인에 올리면</b> 초상권 침해·명예훼손·정보통신망법 위반이 될 수 있어요.</li>
          <li>내가 끼지 않은 <b>다른 사람들끼리의 대화를 몰래 녹음</b>하는 건 통신비밀보호법 위반이에요(제3조).</li>
        </ul>
      </div>

      <a className="callbtn" href="tel:0225227284">
        <span className="call-ic" aria-hidden="true"><Scale size={22} /></span>
        <span className="call-text">
          연행되면 가장 먼저 — 변호인
          <small>민변 인권침해 상담</small>
        </span>
        <span className="num">02-522-7284</span>
      </a>

      <p className="notice">
        근거 조문: 헌법 12조②, 형사소송법 200조의5·244조의3, 경찰관직무집행법 3조,
        통신비밀보호법 3조, 헌재 2014헌마843. · 초안 2026-06-10 · <b>민변 법률검수 전 베타</b>
      </p>

      <div className="card">
        <h3><StickyNote size={16} className="ic accent" aria-hidden="true" />미리 적어두면 좋아요</h3>
        <p className="meta">
          일행과 헤어졌을 때 만날 장소를 정해두세요. 휴대폰 배터리가 없을 때를 대비해
          가족 전화번호를 종이에 적어 지니세요.
        </p>
      </div>
    </section>
  );
}

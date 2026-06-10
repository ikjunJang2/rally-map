import { Fragment } from 'react';
import { Ambulance, Siren, PhoneCall, Scale, ShieldCheck, StickyNote,
  AlertTriangle, ShieldAlert, Ban, Camera, type LucideIcon } from 'lucide-react';

const CONTACTS: { Icon: LucideIcon; title: string; sub: string; num: string; danger: boolean }[] = [
  { Icon: Ambulance, title: '응급의료 · 화재', sub: '위급 상황', num: '119', danger: true },
  { Icon: Siren, title: '경찰 신고', sub: '', num: '112', danger: true },
  { Icon: PhoneCall, title: '서울시 다산콜', sub: '화장실·교통 등 생활 문의', num: '120', danger: false },
  { Icon: Scale, title: '민주사회를 위한 변호사모임 사무처', sub: '인권침해 법률 상담 연결', num: '02-522-7284', danger: false },
  { Icon: ShieldCheck, title: '국가인권위원회 상담', sub: '', num: '1331', danger: false },
];

/** **별표**로 감싼 부분만 굵게 렌더. (법률 카피의 강조를 데이터로 관리) */
function renderBold(text: string) {
  return text.split('**').map((seg, i) =>
    i % 2 ? <b key={i}>{seg}</b> : <Fragment key={i}>{seg}</Fragment>
  );
}

const BANNER =
  '**법률 자문이 아니에요.** 민변(민주사회를 위한 변호사모임) 법률 검수 전 **베타** 안내예요. 구체적인 사건은 꼭 변호사와 상담하세요.';

type RightsCard = {
  Icon: LucideIcon; title: string;
  intro?: string; body?: string; bullets?: string[]; lawNote?: string;
};

const RIGHTS_CARDS: RightsCard[] = [
  {
    Icon: ShieldAlert,
    title: '연행·체포될 때',
    intro: '경찰은 체포할 때, 또는 체포 직후 지체 없이 이 네 가지를 알려야 해요.',
    bullets: [
      '① 무슨 혐의인지 (피의사실의 요지)',
      '② 체포하는 이유',
      '③ **변호인을 선임할 수 있다**는 것',
      '④ 변명할 기회',
    ],
    lawNote: '근거: 형사소송법 제200조의5. 못 들었다면 기억해 두세요.',
  },
  {
    Icon: Ban,
    title: '말하지 않을 권리 (진술거부권)',
    body: '조사·신문에서 **불리한 진술을 강요당하지 않아요.** 진술을 거부할 수 있고, 변호인의 도움을 받을 권리도 있어요. **거부했다는 사실만으로 유죄의 증거가 되거나 처벌의 근거가 되지는 않아요.**',
    lawNote: '근거: 헌법 제12조 제2항 · 형사소송법 제244조의3',
  },
  {
    Icon: ShieldCheck,
    title: '불심검문 · 임의동행',
    body: '경찰관에게 **소속·성명·검문 이유**를 물을 수 있어요. **임의동행은 강제가 아니에요.** 동의하지 않으면 가지 않아도 돼요. 동행에 응하면 경찰은 가족 등에게 동행 사실과 장소를 알리거나, 본인이 연락할 기회를 줘야 해요.',
    lawNote: '근거: 경찰관 직무집행법 제3조',
  },
  {
    Icon: Camera,
    title: '촬영 · 녹음 (주의)',
    bullets: [
      '경찰의 채증 촬영을 헌법재판소는 **위헌이 아니라고 봤어요** (2018년 결정). 다만 정도가 지나치면 위법이 될 수 있어요.',
      '현장 기록을 위해 직접 촬영할 수 있어요. 다만 일반 참가자 얼굴이 식별되게 찍어 온라인에 올리면 **초상권 침해·명예훼손·정보통신망법 위반이 될 수 있어요.**',
      '내가 당사자가 아닌, 공개되지 않은 사적 대화를 몰래 녹음하면 통신비밀보호법 위반이 될 수 있어요.',
    ],
    lawNote: '근거: 헌재 2014헌마843(2018) · 통신비밀보호법 제3조',
  },
];

const FOOTER =
  '근거 조문: 헌법 12조②, 형사소송법 200조의5·244조의3, 경찰관직무집행법 3조, 통신비밀보호법 3조, 헌재 2014헌마843 · 초안 2026-06-10 · **민변 법률검수 전 베타**';

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
        <p><AlertTriangle size={15} aria-hidden="true" /> {renderBold(BANNER)}</p>
      </div>

      {RIGHTS_CARDS.map((c) => (
        <div key={c.title} className="card rights-card">
          <h3><c.Icon size={17} className="ic accent" aria-hidden="true" />{c.title}</h3>
          {c.intro && <p>{renderBold(c.intro)}</p>}
          {c.body && <p>{renderBold(c.body)}</p>}
          {c.bullets && (
            <ul className="tips">
              {c.bullets.map((b, i) => <li key={i}>{renderBold(b)}</li>)}
            </ul>
          )}
          {c.lawNote && <p className="law-note">{c.lawNote}</p>}
        </div>
      ))}

      <a className="callbtn" href="tel:0225227284">
        <span className="call-ic" aria-hidden="true"><Scale size={22} /></span>
        <span className="call-text">
          연행되면 가장 먼저 — 변호인
          <small>민변 인권침해 상담</small>
        </span>
        <span className="num">02-522-7284</span>
      </a>

      <p className="notice">{renderBold(FOOTER)}</p>

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

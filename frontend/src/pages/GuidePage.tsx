import { useState, type FormEvent } from 'react';
import { BookOpen, Scale, SearchIcon, ExternalLink, Landmark } from 'lucide-react';
import { useLawSearch } from '../hooks/useApi';
import Skeleton from '../components/Skeleton';

// ── 핵심 조문 (원문 인용 — 법령은 저작권 보호 대상 아님) ──

const KEY_LAWS = [
  {
    title: '대한민국헌법 제1조',
    body: '② 대한민국의 주권은 국민에게 있고, 모든 권력은 국민으로부터 나온다.',
    note: '이 서비스의 이름이 여기서 왔어요.',
  },
  {
    title: '대한민국헌법 제21조',
    body: '① 모든 국민은 언론·출판의 자유와 집회·결사의 자유를 가진다.\n② 언론·출판에 대한 허가나 검열과 집회·결사에 대한 허가는 인정되지 아니한다.',
    note: '집회는 허가제가 아닌 신고제입니다.',
  },
  {
    title: '집회 및 시위에 관한 법률 제3조',
    body: '① 누구든지 폭행, 협박, 그 밖의 방법으로 평화적인 집회 또는 시위를 방해하거나 질서를 문란하게 하여서는 아니 된다.',
    note: '평화적 집회를 방해하는 행위 자체가 불법입니다.',
  },
  {
    title: '경찰관 직무집행법 제3조 (불심검문)',
    body: '⑦ 질문을 받거나 동행을 요구받은 사람은 형사소송에 관한 법률에 따르지 아니하고는 신체를 구속당하지 아니하며, 그 의사에 반하여 답변을 강요당하지 아니한다.',
    note: '불심검문에서 답변은 의무가 아니고, 임의동행은 거부할 수 있어요.',
  },
  {
    title: '형사소송법 제244조의3 (진술거부권)',
    body: '피의자는 일체의 진술을 하지 아니하거나 개개의 질문에 대하여 진술을 거부할 수 있고, 진술을 거부하더라도 불이익을 받지 아니한다.',
    note: '조사를 받게 되더라도 진술거부권과 변호인 조력권이 보장됩니다.',
  },
];

function lawGoKrSearch(q: string) {
  return `https://www.law.go.kr/lsSc.do?menuId=1&subMenuId=15&query=${encodeURIComponent(q)}`;
}

function LawSection() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const { data, isLoading } = useLawSearch(query);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(input.trim());
  };

  return (
    <>
      <div className="card">
        <h3><SearchIcon size={16} className="ic accent" aria-hidden="true" />법령 검색</h3>
        <p className="meta">국가법령정보센터(law.go.kr)에서 모든 현행 법령을 찾아볼 수 있어요.</p>
        <form className="form-row" onSubmit={submit} style={{ marginTop: 10 }}>
          <input placeholder="예: 집회 및 시위에 관한 법률" aria-label="법령 이름 검색"
                 value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="primary" disabled={!input.trim()}>검색</button>
        </form>
      </div>

      {isLoading && <Skeleton lines={3} />}

      {/* 서버 검색 결과 (LAW_OC 설정 시) */}
      {data?.enabled && data.laws.map((l) => (
        <a key={l.link || l.name} className="card streamcard" href={l.link || lawGoKrSearch(l.name)}
           target="_blank" rel="noreferrer">
          <h3><Scale size={16} className="ic accent" aria-hidden="true" />{l.name}</h3>
          <p className="meta">{l.dept}{l.date && ` · 시행 ${l.date}`}</p>
          <span className="navlink"><ExternalLink size={14} aria-hidden="true" /> 법령 전문 보기</span>
        </a>
      ))}
      {data?.enabled && query && data.laws.length === 0 && !isLoading && (
        <div className="card"><p className="meta">'{query}' 검색 결과가 없어요. 법령 이름으로 검색해보세요.</p></div>
      )}

      {/* 키 미설정 — law.go.kr 검색 링크 폴백 */}
      {data && !data.enabled && query && (
        <a className="card streamcard" href={lawGoKrSearch(query)} target="_blank" rel="noreferrer">
          <h3><Scale size={16} className="ic accent" aria-hidden="true" />'{query}' 법령 검색 결과</h3>
          <span className="navlink"><ExternalLink size={14} aria-hidden="true" /> 국가법령정보센터에서 보기</span>
        </a>
      )}

      <h3 className="sub-title"><Landmark size={17} className="ic accent" aria-hidden="true" />꼭 알아둘 조문</h3>
      {KEY_LAWS.map((l) => (
        <div key={l.title} className="card">
          <h3>{l.title}</h3>
          <p className="meta law-text">{l.body}</p>
          <p className="meta law-note">→ {l.note}</p>
        </div>
      ))}
      <p className="notice">
        조문은 국가법령정보센터 기준 원문이에요. 구체적인 사건에는 변호사 상담
        (민변 02-522-7284)을 권해요. 법적 조언이 아닌 일반 정보 제공입니다.
      </p>
    </>
  );
}

function FieldGuide() {
  return (
    <>
      <div className="card">
        <h3><span className="badge">검문</span>불심검문을 받았을 때</h3>
        <ul className="tips">
          <li>경찰관에게 소속·성명·검문 이유를 물어볼 수 있어요.</li>
          <li>임의동행은 거부할 수 있어요. 동행 시 가족·변호사에게 연락할 권리가 있어요.</li>
        </ul>
      </div>
      <div className="card">
        <h3><span className="badge">준비물</span>챙겨오면 좋은 것</h3>
        <ul className="tips">
          <li>생수, 보조배터리, 양산·모자 (6월 한낮 더위 대비)</li>
          <li>편한 신발, 우비 (우산보다 안전)</li>
          <li>신분증, 비상 연락처 메모</li>
        </ul>
      </div>
      <div className="card">
        <h3><span className="badge">안전</span>현장 안전 수칙</h3>
        <ul className="tips">
          <li>몸이 안 좋으면 즉시 그늘로 이동하고 주변에 도움을 요청하세요.</li>
          <li>어린이·어르신과 함께라면 출구와 가까운 가장자리에 계세요.</li>
          <li>안내 방송과 진행 요원의 안내를 따라주세요.</li>
        </ul>
      </div>
      <div className="card">
        <h3><span className="badge">교통</span>오가는 길</h3>
        <p className="meta">
          5·9호선 <b>올림픽공원역 3번 출구</b>(동2문 방면, 도보 5분),
          8호선 <b>몽촌토성역 1번 출구</b>(도보 15분).
          행사 당일 주변 도로가 통제될 수 있으니 대중교통을 이용하세요.<br />
          실시간 교통통제: <a href="https://m.topis.seoul.go.kr" target="_blank" rel="noreferrer">서울 TOPIS</a>
        </p>
      </div>
    </>
  );
}

export default function GuidePage() {
  const [tab, setTab] = useState<'guide' | 'law'>('guide');

  return (
    <section aria-label="안내와 법률 정보">
      <h2 className="tab-title"><BookOpen size={20} className="ic accent" aria-hidden="true" />안내</h2>

      <div className="seg" role="tablist" aria-label="안내 종류">
        <button role="tab" aria-selected={tab === 'guide'} className={tab === 'guide' ? 'on' : ''}
                onClick={() => setTab('guide')}>
          <BookOpen size={16} aria-hidden="true" /> 현장 안내
        </button>
        <button role="tab" aria-selected={tab === 'law'} className={tab === 'law' ? 'on' : ''}
                onClick={() => setTab('law')}>
          <Scale size={16} aria-hidden="true" /> 권리·법률
        </button>
      </div>

      {tab === 'guide' ? <FieldGuide /> : <LawSection />}
    </section>
  );
}

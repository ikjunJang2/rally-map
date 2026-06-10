export default function GuidePage() {
  return (
    <section aria-label="권리와 안전 안내">
      <div className="card">
        <h3><span className="badge">권리</span>평화로운 집회는 헌법이 보장합니다</h3>
        <p className="meta">
          헌법 제21조는 집회의 자유를 보장하며, 집회는 허가제가 아닌 신고제입니다.
          평화적으로 참여하는 시민은 보호받을 권리가 있습니다.
        </p>
      </div>
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
    </section>
  );
}

import { FileText } from 'lucide-react';
import { CONTACT_EMAIL, RETENTION_DAYS } from '../config';

/** 이용약관 — 게시판 운영정책·임시조치 절차(망법 44조의2)·YouTube ToS 동의 고지 포함 */
export default function TermsPage() {
  return (
    <section aria-label="이용약관">
      <h2 className="tab-title"><FileText size={20} className="ic accent" aria-hidden="true" />이용약관</h2>

      <div className="card legal">
        <h3>1. 서비스 성격</h3>
        <p className="meta">
          주권자의 광장은 평화로운 집회에 참여하는 시민을 위해 현장 정보(지도·라이브·CCTV·법령)와
          소통 공간을 제공하는 비영리 시민 서비스입니다. 특정 정당·후보자를 위한 선거운동 목적의
          서비스가 아닙니다.
        </p>
      </div>

      <div className="card legal">
        <h3>2. 게시물 책임과 금지 행위</h3>
        <p className="meta">게시물의 법적 책임은 작성자에게 있습니다. 다음 글은 금지되며 통보 없이 삭제될 수 있습니다.</p>
        <ul className="tips meta">
          <li>타인의 명예를 훼손하거나 사생활·개인정보(실명·연락처·얼굴)를 침해하는 글</li>
          <li>욕설·혐오·폭력 선동, 스팸·광고·도배</li>
          <li>공직선거법 위반 소지가 있는 글 — 후보자 비방, 허위사실 공표,
            선거일 전 6일부터 투표 마감까지의 여론조사·모의투표 결과 공표 등</li>
        </ul>
        <p className="meta">
          욕설·스팸은 자동 필터로 차단되며(완전하지 않을 수 있음), 글 작성은 분당 1건·시간당
          10건으로 제한됩니다.
        </p>
      </div>

      <div className="card legal">
        <h3>3. 신고와 임시조치</h3>
        <ul className="tips meta">
          <li>모든 글·댓글의 [신고] 버튼 또는 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로
            권리침해를 신고할 수 있습니다.</li>
          <li>권리침해 주장이 접수되면 정보통신망법 제44조의2에 따라 지체 없이 삭제 또는
            <b> 최대 30일간 접근을 차단(임시조치)</b>하며, 해당 위치에 조치 사실을 표시합니다.</li>
          <li>선거관리위원회 등 권한 있는 기관의 삭제 요청은 지체 없이 이행합니다.
            작성자는 조치일부터 3일 이내에 해당 기관에 이의신청할 수 있습니다.</li>
        </ul>
      </div>

      <div className="card legal">
        <h3>4. 삭제와 이력 보존</h3>
        <p className="meta">
          글·댓글을 삭제하면 화면에서 즉시 사라지지만, 분쟁·신고 대응을 위해 삭제 후
          {' '}{RETENTION_DAYS}일간 보존된 뒤 완전히 파기됩니다. 자세한 내용은 개인정보처리방침을 보세요.
        </p>
      </div>

      <div className="card legal">
        <h3>5. 외부 콘텐츠</h3>
        <ul className="tips meta">
          <li>라이브 목록은 YouTube API Services로 제공됩니다. <b>본 서비스를 이용하면
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer"> YouTube 이용약관</a>에
            동의하는 것으로 간주됩니다.</b> 검색 노이즈 제거를 위해 일부 채널은 자동 수집 목록에서
            제외될 수 있습니다(유튜브 직접 검색에는 영향 없음).</li>
          <li>CCTV 영상(국가교통정보센터)·법령(국가법령정보센터)·지도(OpenStreetMap 등)는
            각 제공처의 이용조건을 따릅니다.</li>
          <li>법률 관련 내용은 일반 정보 제공이며 법적 조언이 아닙니다.</li>
        </ul>
      </div>

      <div className="card legal">
        <h3>6. 면책</h3>
        <p className="meta">
          시설 위치·운영시간·라이브 등 현장 정보는 실제와 다를 수 있으며, 본 서비스는 무료
          제공되는 정보의 정확성·가용성을 보증하지 않습니다. 현장에서는 진행 요원과 경찰의
          안내를 우선하세요.
        </p>
      </div>

      <p className="notice">시행일: 2026년 6월 10일 · 문의: {CONTACT_EMAIL}</p>
    </section>
  );
}

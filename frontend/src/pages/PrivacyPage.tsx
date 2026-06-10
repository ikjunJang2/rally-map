import { ShieldCheck } from 'lucide-react';
import { CONTACT_EMAIL, RETENTION_DAYS } from '../config';

/** 개인정보처리방침 — 개인정보보호법 30조 + YouTube API Services 약관 III.A 요건 */
export default function PrivacyPage() {
  return (
    <section aria-label="개인정보처리방침">
      <h2 className="tab-title"><ShieldCheck size={20} className="ic accent" aria-hidden="true" />개인정보처리방침</h2>

      <div className="card legal">
        <h3>1. 수집하는 정보와 목적</h3>
        <p className="meta">
          본 서비스는 로그인·계정·실명·연락처·위치정보를 수집하지 않습니다.
          처리하는 정보는 다음이 전부입니다.
        </p>
        <ul className="tips meta">
          <li><b>커뮤니티 글·댓글</b>: 닉네임(자유 입력), 삭제용 PIN(SHA-256 해시로만 저장), 작성 내용 — 게시판 운영 목적</li>
          <li><b>하트·도배 방지용 세션 식별자</b>: 브라우저가 생성한 무작위 ID의 해시 — 중복 방지 목적, 원본 미저장</li>
          <li><b>접속자 수 집계</b>: 무작위 세션 ID를 서버 메모리에 75초만 보관 — IP·기기정보 미수집</li>
          <li><b>서버 접속 로그</b>: 웹서버 접속 로그를 <b>비활성화</b>하여 방문 기록(IP)을 남기지 않습니다</li>
        </ul>
      </div>

      <div className="card legal">
        <h3>2. 보유 기간과 파기</h3>
        <ul className="tips meta">
          <li>글·댓글은 작성자가 삭제하면 화면에서 즉시 사라지며, 권리침해 분쟁·신고 대응 목적으로
            <b> 삭제 후 {RETENTION_DAYS}일간</b> 보존된 뒤 자동으로 완전 파기됩니다.</li>
          <li>종료된 유튜브 방송 정보는 종료 후 곧(약 10분 내) 자동 삭제됩니다.</li>
          <li>접속자 수 세션은 75초 후 자동 소멸하며 서버 재시작 시 전부 사라집니다.</li>
        </ul>
      </div>

      <div className="card legal">
        <h3>3. 외부 서비스 (리소스 로드 시 해당 사업자에 IP가 전달될 수 있음)</h3>
        <ul className="tips meta">
          <li><b>YouTube API Services</b>: 라이브 방송 목록·썸네일 표시에 사용합니다.
            본 서비스 이용 시 <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube 이용약관</a>이 함께 적용되며,
            Google의 정보 처리는 <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google 개인정보처리방침</a>을 따릅니다.</li>
          <li><b>지도 타일</b>: OpenStreetMap 등 지도 제공자 서버에서 이미지를 불러옵니다.</li>
          <li><b>폰트 CDN</b>(jsDelivr): 화면 글꼴을 불러옵니다.</li>
          <li><b>교통 CCTV·법령 검색</b>: 국가교통정보센터·국가법령정보센터 공공 API를 사용합니다.</li>
        </ul>
        <p className="meta">본 서비스는 광고·분석(트래킹) 스크립트를 일절 사용하지 않습니다.</p>
      </div>

      <div className="card legal">
        <h3>4. 이용자의 권리</h3>
        <p className="meta">
          본인 글·댓글은 작성 시 입력한 PIN으로 직접 삭제할 수 있습니다.
          그 외 삭제 요청, 열람 요구, 권리침해 신고는 아래 연락처로 보내주시면 지체 없이 처리합니다.
        </p>
      </div>

      <div className="card legal">
        <h3>5. 개인정보 보호책임자</h3>
        <p className="meta">
          운영자 — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
          쿠키는 사용하지 않으며, 브라우저 localStorage에는 화면 설정(다크모드·글자크기)과
          무작위 세션 ID만 저장됩니다.
        </p>
      </div>

      <p className="notice">시행일: 2026년 6월 10일</p>
    </section>
  );
}

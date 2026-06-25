import { Link, useParams } from 'react-router-dom';
import { BookImage, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToonList, useToonSeries, useToonEpisode } from '../hooks/useApi';
import Skeleton from '../components/Skeleton';

const imgUrl = (id: number) => `/api/toon/img/${id}`;

function ToonList() {
  const { data, isLoading } = useToonList();
  if (isLoading) return <Skeleton lines={5} />;
  if (!data || data.length === 0) {
    return <div className="card"><p className="meta">아직 공개된 웹툰이 없어요. 곧 시민 작가님들의 작품이 올라올 거예요 🎨</p></div>;
  }
  return (
    <div className="toon-grid">
      {data.map((s) => (
        <Link key={s.id} to={`/toon/${s.id}`} className="toon-card">
          <div className="toon-cover">
            {s.coverImageId ? <img src={imgUrl(s.coverImageId)} alt="" loading="lazy" /> : <BookImage size={28} aria-hidden="true" />}
          </div>
          <div className="toon-card-body">
            <h3>{s.title}</h3>
            <p className="meta">{s.author} · {s.episodes}화</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ToonSeriesView({ seriesId }: { seriesId: number }) {
  const { data, isLoading, isError } = useToonSeries(seriesId);
  if (isLoading) return <Skeleton lines={4} />;
  if (isError || !data) return <div className="card"><p className="meta">작품을 찾을 수 없어요.</p></div>;
  return (
    <>
      <Link to="/toon" className="navlink"><ChevronLeft size={15} aria-hidden="true" /> 웹툰 목록</Link>
      <div className="card">
        <h2 className="tab-title" style={{ marginTop: 4 }}>{data.title}</h2>
        <p className="meta">{data.author}</p>
        {data.summary && <p className="meta" style={{ marginTop: 6, lineHeight: 1.5 }}>{data.summary}</p>}
      </div>
      {data.episodes.length === 0
        ? <div className="card"><p className="meta">아직 공개된 회차가 없어요.</p></div>
        : data.episodes.map((e) => (
            <Link key={e.id} to={`/toon/${seriesId}/${e.id}`} className="card toon-ep-row">
              <span className="toon-ep-no">{e.no}화</span>
              <span className="toon-ep-title">{e.title}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ))}
    </>
  );
}

function ToonViewer({ seriesId, episodeId }: { seriesId: number; episodeId: number }) {
  const { data, isLoading, isError } = useToonEpisode(episodeId);
  if (isLoading) return <Skeleton lines={6} />;
  if (isError || !data) return <div className="card"><p className="meta">회차를 찾을 수 없어요.</p></div>;
  return (
    <>
      <Link to={`/toon/${seriesId}`} className="navlink"><ChevronLeft size={15} aria-hidden="true" /> 회차 목록</Link>
      <h2 className="tab-title" style={{ marginTop: 4 }}>{data.no}화 · {data.title}</h2>
      <div className="toon-viewer">
        {data.images.length === 0
          ? <p className="meta">이미지가 없어요.</p>
          : data.images.map((id) => <img key={id} src={imgUrl(id)} alt="" loading="lazy" />)}
      </div>
      <Link to={`/toon/${seriesId}`} className="ghost wide" style={{ marginTop: 12 }}>회차 목록으로</Link>
    </>
  );
}

export default function ToonPage() {
  const { seriesId, episodeId } = useParams<{ seriesId?: string; episodeId?: string }>();
  const sid = Number(seriesId) || 0;
  const eid = Number(episodeId) || 0;
  return (
    <section aria-label="시민 웹툰">
      {!sid && (
        <h2 className="tab-title"><BookImage size={20} className="ic accent" aria-hidden="true" />시민 웹툰</h2>
      )}
      {eid ? <ToonViewer seriesId={sid} episodeId={eid} />
        : sid ? <ToonSeriesView seriesId={sid} />
        : <ToonList />}
    </section>
  );
}

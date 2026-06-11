import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 값이 바뀌면(예: 라우트 경로) 오류 상태를 자동 해제 — 한 화면 크래시가 다른 탭으로 옮겨가지 않게 */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/** 페이지 단위 오류 격리 — 한 화면이 죽어도 앱 전체가 죽지 않게 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면 오류:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // 라우트가 바뀌면(resetKey 변경) 이전 화면의 오류를 지워 새 화면을 정상 렌더
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="card" role="alert">
          <h3><AlertTriangle size={17} className="ic red" aria-hidden="true" />화면을 표시하지 못했어요</h3>
          <p className="meta">잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침해주세요.</p>
          <button className="primary" onClick={this.reset}>다시 시도</button>
        </div>
      );
    }
    return this.props.children;
  }
}

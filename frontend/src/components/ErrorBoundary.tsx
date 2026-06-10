import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
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

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="card" role="alert">
          <h3>⚠️ 화면을 표시하지 못했어요</h3>
          <p className="meta">잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침해주세요.</p>
          <button className="primary" onClick={this.reset}>다시 시도</button>
        </div>
      );
    }
    return this.props.children;
  }
}

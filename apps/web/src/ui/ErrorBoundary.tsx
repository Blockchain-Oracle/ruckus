import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  fallback: ReactNode;
  onError?: (error: unknown, info: ErrorInfo) => void;
  children: ReactNode;
};

/**
 * React 19 unmounts the whole root on an uncaught render error, which leaves only the page
 * background. Boundaries keep the failure local (hooks still can't catch render errors).
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error);
    this.props.onError?.(error, info);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

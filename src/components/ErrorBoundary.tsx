import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * A failed interactive must not take the chapter down with it. The reader keeps
 * the prose and is told plainly which part broke.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.label}]`, error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="boundary">
          <span className="eyebrow">{this.props.label} could not be drawn</span>
          <p className="mono boundary__message">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

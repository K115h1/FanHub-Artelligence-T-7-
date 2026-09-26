import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  body?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const {
      title = "Something went wrong",
      body = "An unexpected error occurred. Try again, or come back later.",
    } = this.props;

    if (this.state.hasError) {
      return (
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-950 to-purple-900 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/30 text-purple-300">
            <AlertTriangle className="h-6 w-6" strokeWidth={2} />
          </div>

          <h3 className="text-base font-semibold text-purple-50">{title}</h3>
          <p className="max-w-xs text-sm text-purple-300">{body}</p>

          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-full bg-purple-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-400"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
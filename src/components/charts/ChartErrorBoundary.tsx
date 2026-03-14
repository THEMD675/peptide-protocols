import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 p-4 text-sm text-stone-500 dark:text-stone-400 min-h-[80px]">
          تعذّر عرض الرسم البياني
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="ms-2 text-emerald-600 dark:text-emerald-400 underline"
          >
            أعد المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

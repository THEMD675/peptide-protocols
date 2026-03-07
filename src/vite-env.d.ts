/// <reference types="vite/client" />

interface Window {
  gtag?: (...args: unknown[]) => void;
  turnstile?: {
    render: (container: HTMLElement, options: Record<string, unknown>) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
  };
}

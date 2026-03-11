import { useEffect, useRef } from 'react';

/**
 * Lightweight IntersectionObserver-based scroll-reveal hook.
 * Adds 'is-visible' class to elements with [data-reveal] when they enter the viewport.
 * Supports stagger via [data-stagger] on the container.
 * CSS only — no animation libraries.
 */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Optional: unobserve after first reveal for perf
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    // Observe all elements with data-reveal
    const elements = document.querySelectorAll('[data-reveal]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

/**
 * Ref-based scroll reveal for a single element.
 */
export function useRevealRef<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

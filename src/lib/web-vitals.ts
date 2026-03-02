import { onCLS, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  // Send to GA4
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
  onINP(sendToAnalytics) // INP replaced FID in web-vitals v4+
}

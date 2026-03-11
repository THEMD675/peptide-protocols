import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics)
  onFCP(sendToAnalytics)   // First Contentful Paint
  onLCP(sendToAnalytics)   // Largest Contentful Paint
  onTTFB(sendToAnalytics)  // Time to First Byte
  onINP(sendToAnalytics)   // Interaction to Next Paint (replaces FID in v4+)
}

/**
 * GA4 custom events. No-op when GA isn't loaded (NEXT_PUBLIC_GA_ID unset, ad blockers, admin pages),
 * so callers never need to guard. `gtag` is defined by <GoogleAnalytics> in the (public) layout.
 *
 * Events (register params as custom dimensions in GA → 관리 → 맞춤 정의 to report on them):
 *  - take_photo     { method: "in_app_camera" | "device_camera", count }
 *  - select_photo   { count }
 *  - submit_report  { photo_count, has_memo, location_source }
 */
type Params = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: Params) => void;
  }
}

export function trackEvent(name: "take_photo" | "select_photo" | "submit_report", params?: Params) {
  try {
    window.gtag?.("event", name, params);
  } catch {
    // analytics must never break the app
  }
}

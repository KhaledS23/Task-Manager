import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
// Keep some existing browser polyfills used in tests
if (!window.matchMedia) {
  // @ts-ignore
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
// @ts-ignore
window.alert = window.alert || (() => {});
// @ts-ignore
window.confirm = window.confirm || (() => true);
// @ts-ignore
window.prompt = window.prompt || (() => null);

// Filter React Router v7 future-flag warnings in tests only
const _warn = console.warn.bind(console);
// @ts-ignore
console.warn = (...args: any[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('React Router Future Flag Warning')) return;
  _warn(...args as any);
};

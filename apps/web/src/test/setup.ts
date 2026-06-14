import "@testing-library/jest-dom";

class ResizeObserverMock {
  observe() {
    // noop for jsdom tests
  }

  unobserve() {
    // noop for jsdom tests
  }

  disconnect() {
    // noop for jsdom tests
  }
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

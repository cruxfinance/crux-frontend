import '@testing-library/jest-dom';

// Server tests run under the node environment, where there is no window
if (typeof window !== 'undefined') {

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.ergoConnector
Object.defineProperty(window, 'ergoConnector', {
  value: undefined,
  writable: true,
});
}

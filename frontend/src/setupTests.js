import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Polyfill for TextEncoder if not defined
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
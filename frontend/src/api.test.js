// frontend/src/api.test.js

// Mock localStorage
// Moved this line here

// Now import api.js
import { readTickets, apiFetch } from './api'; const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    clear: jest.fn(() => { store = {}; }),
    removeItem: jest.fn(key => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock }); // Keep apiFetch import for direct testing if needed, but we'll mock global fetch

describe('readTickets', () => {
  const API_BASE_URL = 'https://10.1.9.244/api/v1'; // Re-declare for testing purposes

  beforeEach(() => {
    // Mock the global fetch function
    global.fetch = jest.fn();
    // Clear localStorage mock store
    localStorageMock.clear();
  });

  afterEach(() => {
    // Restore original fetch and localStorage after each test
    jest.restoreAllMocks();
  });

  test('should call apiFetch with the correct endpoint when no filters are provided', async () => {
    // Mock a successful response from fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tickets: [], total: 0 }),
    });

    await readTickets();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tickets/`, expect.any(Object));
  });

  test('should call apiFetch with the correct endpoint and status filter', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tickets: [], total: 0 }),
    });

    const filters = { status: 'Abierto' };
    await readTickets(filters);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tickets/?status=Abierto`, expect.any(Object));
  });

  test('should call apiFetch with the correct endpoint and assignedToMe filter', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tickets: [], total: 0 }),
    });

    const filters = { assignedToMe: true };
    await readTickets(filters);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tickets/?assigned_to_me=true`, expect.any(Object));
  });

  test('should call apiFetch with multiple filters', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tickets: [], total: 0 }),
    });

    const filters = { status: 'Cerrado', severity: 'Alta', limit: 10 };
    await readTickets(filters);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Adjusted order to match URLSearchParams output
    const expectedEndpoint = `${API_BASE_URL}/tickets/?status=Cerrado&limit=10&severity=Alta`;
    expect(global.fetch).toHaveBeenCalledWith(expectedEndpoint, expect.any(Object));
  });

  test('should return the data from apiFetch', async () => {
    const mockData = { tickets: [{ id: 1, summary: 'Test Ticket' }], total: 1 };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const result = await readTickets();

    expect(result).toEqual(mockData);
  });

  test('should handle errors from apiFetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'API Error' }),
    });

    await expect(readTickets()).rejects.toThrow('API Error');
  });

  test('should handle unknown errors from apiFetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Failed to parse JSON')), // Simulate non-JSON error
    });

    await expect(readTickets()).rejects.toThrow('Error desconocido en la API'); // Changed expected error message
  });

  test('should not include Authorization header if no token in localStorage', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tickets: [], total: 0 }),
    });

    await readTickets();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchOptions = global.fetch.mock.calls[0][1];
    expect(fetchOptions.headers.Authorization).toBeUndefined();
  });

  test('should include Authorization header if token exists in localStorage (direct apiFetch)', async () => {
    // Explicitly mock getItem to return a token
    localStorageMock.getItem.mockReturnValue('test-token');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/test-endpoint');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchOptions = global.fetch.mock.calls[0][1];
    console.log('Direct apiFetch headers:', fetchOptions.headers);
    expect(fetchOptions.headers.Authorization).toBe('Bearer test-token');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('token'); // Verify getItem was called
  });
});

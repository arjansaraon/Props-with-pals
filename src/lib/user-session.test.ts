import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveUserSession,
  getUserSession,
  getAllUserSessions,
  removeUserSession,
  type UserSession,
} from './user-session';

describe('user-session localStorage utility', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
  })();

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
  });

  describe('saveUserSession', () => {
    it('saves user session with pool code as key', () => {
      saveUserSession('ABC123', { name: 'Mike', isCaptain: false });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pwp_ABC123',
        JSON.stringify({ name: 'Mike', isCaptain: false })
      );
    });

    it('saves captain session', () => {
      saveUserSession('XYZ789', { name: 'Arjan', isCaptain: true });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pwp_XYZ789',
        JSON.stringify({ name: 'Arjan', isCaptain: true })
      );
    });

    it('overwrites existing session for same pool', () => {
      saveUserSession('ABC123', { name: 'Mike', isCaptain: false });
      saveUserSession('ABC123', { name: 'Michael', isCaptain: false });

      const stored = localStorageMock.getItem('pwp_ABC123');
      expect(JSON.parse(stored!)).toEqual({ name: 'Michael', isCaptain: false });
    });
  });

  describe('getUserSession', () => {
    it('returns null for non-existent pool', () => {
      const result = getUserSession('NOTFOUND');
      expect(result).toBeNull();
    });

    it('returns saved session for existing pool', () => {
      localStorageMock.setItem(
        'pwp_ABC123',
        JSON.stringify({ name: 'Mike', isCaptain: false })
      );

      const result = getUserSession('ABC123');
      expect(result).toEqual({ name: 'Mike', isCaptain: false });
    });

    it('returns null for corrupted data', () => {
      localStorageMock.setItem('pwp_ABC123', 'not-valid-json');

      const result = getUserSession('ABC123');
      expect(result).toBeNull();
    });

    it('returns null when localStorage is not available', () => {
      // @ts-expect-error - testing undefined localStorage
      global.localStorage = undefined;

      const result = getUserSession('ABC123');
      expect(result).toBeNull();
    });
  });

  describe('getAllUserSessions', () => {
    it('returns empty object when no sessions exist', () => {
      const result = getAllUserSessions();
      expect(result).toEqual({});
    });

    it('returns all pwp_ prefixed sessions', () => {
      localStorageMock.setItem(
        'pwp_ABC123',
        JSON.stringify({ name: 'Mike', isCaptain: false })
      );
      localStorageMock.setItem(
        'pwp_XYZ789',
        JSON.stringify({ name: 'Arjan', isCaptain: true })
      );
      // Non-pwp key should be ignored
      localStorageMock.setItem('other_key', 'some value');

      const result = getAllUserSessions();
      expect(result).toEqual({
        ABC123: { name: 'Mike', isCaptain: false },
        XYZ789: { name: 'Arjan', isCaptain: true },
      });
    });

    it('skips corrupted entries', () => {
      localStorageMock.setItem(
        'pwp_ABC123',
        JSON.stringify({ name: 'Mike', isCaptain: false })
      );
      localStorageMock.setItem('pwp_BROKEN', 'not-valid-json');

      const result = getAllUserSessions();
      expect(result).toEqual({
        ABC123: { name: 'Mike', isCaptain: false },
      });
    });
  });

  describe('removeUserSession', () => {
    it('removes session for pool', () => {
      localStorageMock.setItem(
        'pwp_ABC123',
        JSON.stringify({ name: 'Mike', isCaptain: false })
      );

      removeUserSession('ABC123');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pwp_ABC123');
    });

    it('does not throw for non-existent pool', () => {
      expect(() => removeUserSession('NOTFOUND')).not.toThrow();
    });
  });

  describe('SSR safety', () => {
    it('saveUserSession does not throw when localStorage unavailable', () => {
      // @ts-expect-error - testing undefined localStorage
      global.localStorage = undefined;

      expect(() =>
        saveUserSession('ABC123', { name: 'Mike', isCaptain: false })
      ).not.toThrow();
    });

    it('getAllUserSessions returns empty object when localStorage unavailable', () => {
      // @ts-expect-error - testing undefined localStorage
      global.localStorage = undefined;

      const result = getAllUserSessions();
      expect(result).toEqual({});
    });

    it('removeUserSession does not throw when localStorage unavailable', () => {
      // @ts-expect-error - testing undefined localStorage
      global.localStorage = undefined;

      expect(() => removeUserSession('ABC123')).not.toThrow();
    });
  });
});

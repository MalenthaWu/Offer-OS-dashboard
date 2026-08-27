import { describe, expect, it, vi } from 'vitest';
import { bootstrapOfferOS } from '../../src/bootstrap.js';

describe('bootstrapOfferOS', () => {
  it.each([
    ['database opening', () => Promise.reject(new Error('IndexedDB unavailable')), vi.fn()],
    ['migration', () => Promise.resolve({ name: 'db' }), vi.fn(() => Promise.reject(new Error('migration failed')))],
  ])('starts legacy behavior in read-only mode when %s fails', async (_failure, openDatabase, migrate) => {
    const target = {};
    const startLegacy = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    await bootstrapOfferOS({ openDatabase, migrate, root: {}, target, startLegacy, logger });

    expect(target.__OFFER_OS_DB__).toBeNull();
    expect(startLegacy).toHaveBeenCalledOnce();
    expect(startLegacy).toHaveBeenCalledWith(expect.objectContaining({
      persistence: expect.objectContaining({ available: false }),
    }));
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('reports an available persistence context only after database migration succeeds', async () => {
    const target = {};
    const db = { name: 'db' };
    const startLegacy = vi.fn().mockResolvedValue(undefined);

    await bootstrapOfferOS({
      openDatabase: vi.fn().mockResolvedValue(db),
      migrate: vi.fn().mockResolvedValue(undefined),
      root: {},
      target,
      startLegacy,
    });

    expect(target.__OFFER_OS_DB__).toBe(db);
    expect(startLegacy).toHaveBeenCalledWith(expect.objectContaining({
      persistence: expect.objectContaining({ available: true }),
    }));
  });
});

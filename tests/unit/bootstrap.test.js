import { describe, expect, it, vi } from 'vitest';
import { bootstrapOfferOS } from '../../src/bootstrap.js';

describe('bootstrapOfferOS', () => {
  it.each([
    ['database opening', () => Promise.reject(new Error('IndexedDB unavailable')), vi.fn()],
    ['migration', () => Promise.resolve({ name: 'db' }), vi.fn(() => Promise.reject(new Error('migration failed')))],
  ])('starts legacy behavior when %s fails', async (_failure, openDatabase, migrate) => {
    const target = {};
    const startLegacy = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    await bootstrapOfferOS({ openDatabase, migrate, root: {}, target, startLegacy, logger });

    expect(target.__OFFER_OS_DB__).toBeNull();
    expect(startLegacy).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

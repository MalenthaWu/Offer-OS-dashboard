import { describe, expect, it, vi } from 'vitest';
import { startLegacyWithDashboard } from '../../src/modules/dashboard/dashboard-startup.js';

describe('startLegacyWithDashboard', () => {
  it('keeps the legacy dashboard active when IndexedDB bootstrap failed', async () => {
    const target = {
      __OFFER_OS_DB__: null,
      __OFFER_OS_FEATURES__: { jobs: false, dashboard: true },
    };
    const loadLegacy = vi.fn(async () => {
      expect(target.__OFFER_OS_FEATURES__.dashboard).toBe(false);
    });
    const initDashboard = vi.fn();

    const enabled = await startLegacyWithDashboard({
      target,
      root: {},
      store: {},
      loadLegacy,
      initDashboard,
    });

    expect(enabled).toBe(false);
    expect(loadLegacy).toHaveBeenCalledOnce();
    expect(initDashboard).not.toHaveBeenCalled();
  });

  it('enables the modular dashboard before legacy startup and initializes it with persistence', async () => {
    const target = {
      __OFFER_OS_DB__: { name: 'offer-os' },
      __OFFER_OS_FEATURES__: { jobs: true, dashboard: false },
    };
    const root = {};
    const store = {};
    const loadLegacy = vi.fn(async () => {
      expect(target.__OFFER_OS_FEATURES__.dashboard).toBe(true);
    });
    const initDashboard = vi.fn();

    const enabled = await startLegacyWithDashboard({ target, root, store, loadLegacy, initDashboard });

    expect(enabled).toBe(true);
    expect(loadLegacy).toHaveBeenCalledOnce();
    expect(initDashboard).toHaveBeenCalledWith({ root, store });
  });
});

export function createAppStore(initial = {}) {
  let state = { jobs: [], activities: [], ...initial };
  const listeners = new Map();
  const emit = (topic) => (listeners.get(topic) ?? new Set()).forEach((fn) => fn(state));

  return {
    getState: () => state,
    setJobs(jobs) {
      state = { ...state, jobs: [...jobs] };
      emit('jobs:changed');
    },
    setActivities(activities) {
      state = { ...state, activities: [...activities] };
      emit('activities:changed');
    },
    subscribe(topic, fn) {
      if (!listeners.has(topic)) listeners.set(topic, new Set());
      listeners.get(topic).add(fn);
      return () => listeners.get(topic)?.delete(fn);
    },
  };
}

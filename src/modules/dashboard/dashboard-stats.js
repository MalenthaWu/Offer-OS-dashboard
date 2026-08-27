export const DASHBOARD_STAGES = Object.freeze(['关注', '已投递', '已测评', '面试中', '已结束']);

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function localDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function applicationStreaks(days) {
  let bestStreak = 0;
  let runningStreak = 0;

  days.forEach((day) => {
    if (day.count > 0) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  });

  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0 && days[index].count > 0; index -= 1) {
    currentStreak += 1;
  }

  return { currentStreak, bestStreak };
}

export function computeDashboard({ jobs = [], activities = [], today = new Date() } = {}) {
  const localToday = localDay(new Date(today));
  const start = new Date(localToday);
  start.setDate(start.getDate() - 90);
  const stageCounts = Object.fromEntries(DASHBOARD_STAGES.map((stage) => [stage, 0]));
  const days = Array.from({ length: 91 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: localDateKey(date), count: 0 };
  });
  const dayByKey = new Map(days.map((day) => [day.date, day]));

  jobs.forEach((job) => {
    if (Object.hasOwn(stageCounts, job?.stage)) stageCounts[job.stage] += 1;
  });

  activities.forEach((activity) => {
    if (activity?.type !== '投递') return;
    const occurredAt = new Date(activity.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) return;
    const day = dayByKey.get(localDateKey(occurredAt));
    if (day) day.count += 1;
  });

  const totalApplications = days.reduce((total, day) => total + day.count, 0);
  const activeDays = days.filter((day) => day.count > 0).length;

  return {
    totalJobs: jobs.length,
    stageCounts,
    heatmap: {
      days,
      totalApplications,
      activeDays,
      ...applicationStreaks(days),
    },
  };
}

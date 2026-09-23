import assert from 'node:assert/strict';
import { buildWorkoutProgressSummary } from './src/data/workouts/workoutAnalytics.js';
import { buildAdaptiveWorkoutSummary } from './src/data/workouts/workoutSummary.js';

const exercise = {
  id: 'test_bench',
  nameZh: '测试卧推',
  trackingType: 'weight_reps',
  equipment: ['barbell'],
  progressionRule: 'double_progression'
};
const target = { sets: 3, reps: '6-8', rir: 2 };

function session(id, date, weight, reps, rirs) {
  return {
    id,
    date,
    planDayId: 'test_day',
    startedAt: `${date}T10:00:00.000Z`,
    endedAt: `${date}T11:00:00.000Z`,
    completed: true,
    exerciseLogs: [{
      exerciseId: exercise.id,
      sets: reps.map((value, index) => ({
        setIndex: index + 1,
        weight,
        weightUnit: 'kg',
        reps: value,
        rir: rirs[index],
        completed: true
      }))
    }]
  };
}

const first = session('s1', '2026-09-01', 50, [6, 6, 6], [2, 2, 2]);
const repProgress = session('s2', '2026-09-08', 50, [7, 7, 7], [2, 2, 2]);
const loadProgress = session('s3', '2026-09-15', 52.5, [6, 6, 6], [2, 2, 2]);

const repSummary = buildWorkoutProgressSummary(repProgress, [repProgress, first], [exercise]);
assert.equal(repSummary.exerciseSummaries[0].status, '次数进步');
assert.match(repSummary.exerciseSummaries[0].message, /多完成 3 次/);

const loadSummary = buildWorkoutProgressSummary(loadProgress, [loadProgress, repProgress], [exercise]);
assert.equal(loadSummary.exerciseSummaries[0].status, '重量进步');
assert.doesNotMatch(loadSummary.exerciseSummaries[0].message, /退步|下降/);

const adaptive = buildAdaptiveWorkoutSummary({
  currentSession: loadProgress,
  history: [loadProgress, repProgress, first],
  planExercises: [{ exerciseId: exercise.id, target }],
  exerciseList: [exercise],
  userProfile: { baselineLifts: [] }
});
assert.equal(adaptive.recommendations.length, 1);
assert.equal(adaptive.recommendations[0].strategy, '建议维持重量');
assert.equal(adaptive.recommendations[0].recommendationText, '52.5kg · 7 / 7 / 7');
assert.match(adaptive.recommendations[0].reason, /适应阶段/);

const noHistory = buildAdaptiveWorkoutSummary({
  currentSession: first,
  history: [first],
  planExercises: [{ exerciseId: exercise.id, target }],
  exerciseList: [exercise],
  userProfile: { baselineLifts: [] }
});
assert.equal(noHistory.recommendations[0].performanceStatus, '暂无上次记录');
assert.equal(noHistory.recommendations[0].currentPerformanceText, '50kg × 6 / 6 / 6');
assert.equal(noHistory.exerciseSummaries.length, 1);

console.log('Workout summary tests passed: 4/4');

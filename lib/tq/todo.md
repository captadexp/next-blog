# @supergrowthai/tq - Backlog

## Critical (data loss / duplicate execution)

- [ ] **T1**: `TaskRunner.run()` failure silently loses entire batch — `.catch` returns empty arrays, tasks consumed from MQ are never retried. Fix: return tasks as `failedTasks` so `postProcessTasks` can retry. File: `TaskHandler.ts:356-359`
- [ ] **T8**: Executor errors swallowed → tasks become "ignored" instead of retried — `.catch(err => logger.error(...))` doesn't call `fail()`. Fix: call `actions.fail(task)` in catch. Affects all 3 executor paths (multi, parallel, sequential). File: `TaskRunner.ts:140,154,182`

## High Priority

- [ ] **T5**: Negative `retry_after` creates tight retry loop — negative values are truthy, pass `|| 2000` check, produce `Date.now() + negative` = scheduled in the past = immediate re-pickup every 5s. Fix: `Math.max(task.retry_after || 2000, 0)`. File: `TaskHandler.ts:238`
- [ ] **MED-003**: Lock timeout refresh for long-running async tasks exceeding 30 min default
- [ ] **MED-007**: Capture error details when executor throws (currently continues silently)
- [ ] **HIGH-002**: Optimize PrismaAdapter.updateTasks — sequential updates in transaction
- [ ] **HIGH-003**: Auto-fail tasks in AsyncActions when executor doesn't call success/fail

## Medium Priority

- [ ] **MED-001**: Add `onLifecycleError` callback — lifecycle callbacks currently swallow errors silently
- [ ] **MED-005**: Make stale task threshold configurable (currently hardcoded at 2 days)
- [ ] **MED-006**: Await in-flight task processing during shutdown
- [ ] **T9**: `mode: 'sync'` in lifecycle config is broken — both sync and async branches do identical fire-and-forget (no `await`). File: `TaskHandler.ts:530-543`

## Low Priority

- [ ] **LOW-001**: Extract magic numbers to config (poll intervals, limits, timeouts)
- [ ] **LOW-002**: Make Logger injectable instead of direct instantiation
- [ ] **LOW-003**: Add JSDoc to internal methods
- [ ] **LOW-004**: Fix PrismaAdapter.generateId unsafe `as TId` cast
- [ ] **LOW-005**: Built-in metrics collection (task counts, latency histograms, queue depths)

## Test Coverage

- [ ] MongoDB adapter operations
- [ ] Prisma adapter operations
- [ ] Retry exhaustion flow
- [ ] Concurrent task processing
- [ ] Async handoff and completion
- [ ] Task deduplication via task_hash

## Gap to Enterprise-Grade Cluster Deployment

The architecture (DI, pluggable adapters, lifecycle events, retry/exhaust pipeline) is solid.
The gap is in hardening details and operational tooling.

### Current state: mid-scale production (steady workloads, predictable traffic)

### What's needed for high-scale cluster deployment:

**Task amplification guard**
- `actions.addTasks()` has no limit on spawned child tasks (file: `Actions.ts:65-72`).
- A buggy executor can call `addTasks()` with millions of entries, all accumulated in memory.
- Each child task can spawn more children — unbounded amplification.
- Fix: configurable max child tasks per execution (e.g., 1000), reject or warn above threshold.

**postProcessTasks atomicity**
- Sequential DB writes without transaction: retry upsert → new tasks → mark failed → mark success.
- If step 3 fails, success tasks are never marked `executed` in DB.
- After 2-day stale recovery, they get re-executed (duplicate processing).
- Fix: wrap in a transaction, or reorder to mark success first (least harmful partial failure).

**Per-task-type observability**
- Failures are counted per-queue (`queueStats` Map), not per-task-type.
- Operators can't see that task type X has a 90% failure rate while type Y is fine.
- The lifecycle events (`onTaskFailed`) have `task_type` — build a metrics provider
  that aggregates failure rate per type and emits alerts above threshold.

**Mature task pickup race**
- `getMatureTasks()` in PrismaAdapter/MongoDbAdapter uses find() + update() (not atomic).
- Multiple workers can pick up the same tasks. Duplicate detection is best-effort via cache.
- Fix: use `findOneAndUpdate` (Mongo) or `UPDATE ... RETURNING` (Prisma/SQL) for atomic claim.

**AsyncTaskManager capacity leak**
- A promise that never resolves occupies a slot forever (file: `AsyncTaskManager.ts`).
- Eventually blocks all async task processing (default max: 100 slots).
- Fix: add per-task timeout in AsyncTaskManager. If promise doesn't resolve within
  2x the handoff timeout, force-remove it and mark the task as failed.
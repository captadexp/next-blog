# @supergrowthai/tq - Backlog

## Medium Priority

- [ ] **MED-001**: Add `onLifecycleError` callback - lifecycle callbacks currently swallow errors silently
- [ ] **MED-003**: Lock timeout refresh for long-running async tasks exceeding 30 min default
- [ ] **MED-005**: Make stale task threshold configurable (currently hardcoded at 2 days)
- [ ] **MED-006**: Await in-flight task processing during shutdown
- [ ] **MED-007**: Capture error details when executor throws (currently continues silently)
- [ ] **HIGH-002**: Optimize PrismaAdapter.updateTasks - sequential updates in transaction
- [ ] **HIGH-003**: Auto-fail tasks in AsyncActions when executor doesn't call success/fail

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
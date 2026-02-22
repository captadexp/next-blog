# @supergrowthai/mq - Backlog

## Kinesis Resilience (Production)

| ID | Severity | Issue | File | Status |
|----|----------|-------|------|--------|
| ~~K2~~ | HIGH | Single lock renewal failure drops shard permanently | `KinesisShardConsumer.ts` | **DONE** — 2 retries with 2s backoff before `handleLockRenewalFailure` |
| ~~K3~~ | HIGH | Kinesis throttle counts toward `MAX_CONSECUTIVE_ERRORS` | `KinesisShardConsumer.ts` | **DONE** — `ProvisionedThroughputExceededException` no longer increments `consecutiveErrorCount` |
| ~~K1~~ | HIGH | Poison pill on low-throughput shard = infinite crash loop | `KinesisShardConsumer.ts` | **DONE** — In-memory `(lastCheckpoint, failureCount)` tracking, advances past batch after 3 failures, emits `onPoisonPill` |
| K4 | HIGH | Processor timeout doesn't cancel the processor | `KinesisShardConsumer.ts:438` | `Promise.race` abandons timeout but processor runs in background holding locks/connections. Pass `AbortSignal` to processor. Breaking change. |
| ~~H4~~ | HIGH | `stopAndCleanupConsumer` doesn't signal consumer to stop | `KinesisShardRebalancer.ts` | **DONE** — `consumer.stop()` sets flag checked in processing loop, closes dual-processing window |
| K8 | MEDIUM | Heartbeat failure is completely silent | `ShardLeaser.ts:70` | Add failure counter + lifecycle event when threshold exceeded. Instance has zero awareness when it's about to lose all shards. |
| ~~K7~~ | LOW | Consumer key parsing breaks with hyphens in stream name | `KinesisShardRebalancer.ts` | **DONE** — Uses `substring(streamId.length + 1)` instead of `split('-', 2)` |

## Existing Backlog

| ID | Issue | File | Recommendation |
|---------|-----------------------------------------------|----------------------------------------|-------------------------------------------------------------------------|
| MED-002 | Lifecycle callbacks swallow errors | All implementations | Add `onLifecycleError` callback |
| MED-004 | Kinesis partition key = message type | `kinesis.ts:549` | Make partition key configurable (see SCALE-01) |
| MED-006 | Shutdown doesn't wait for in-flight | `memory.ts`, `mongodb.ts` | Track in-flight, await completion |
| MED-007 | PrismaQueue generateId unsafe cast | `prisma.ts:316` | Accept ID generator function |
| LOW-001 | Hardcoded polling intervals | `memory.ts`, `mongodb.ts`, `prisma.ts` | Make configurable via constructor |
| LOW-002 | Logger coupling | All implementations | Accept optional logger in constructor |
| LOW-003 | Kinesis region hardcoded to env | `kinesis.ts:98` | Accept region in config |
| LOW-004 | Missing JSDoc on some methods | Various | Add method-level documentation |
| LOW-005 | Consider state machines for complex consumers | `KinesisShardConsumer.ts` | Revisit when adding rebalancing/draining states or if state bugs emerge |

## Gap to Enterprise-Grade Cluster Deployment

The architecture (pluggable providers, lifecycle events, shard-based distribution, DI) is sound.
The gap is in hardening, observability, and operational tooling.

### Current state: mid-scale production (steady workloads, predictable traffic)

### What's needed for high-scale cluster deployment:

**Partition strategy** (biggest single ROI item)
- `generatePartitionKey` returns `message.type` — all messages of the same type hit the same shard.
- Under high-volume task types (spikes, campaigns), one shard saturates while others are idle.
- Fix: hash on entity ID (order_id, user_id) for even distribution. Make configurable via `KinesisConfig`.

**Metrics pipeline**
- Lifecycle events exist but no built-in metrics emission (counters, histograms, gauges).
- Build a `PrometheusLifecycleProvider` or `DatadogLifecycleProvider` that maps the existing
  `onMessagePublished/Consumed/ConsumerConnected` events to structured metrics.
- Key metrics: message age (p50/p95/p99), consumer lag per shard, checkpoint staleness,
  lock renewal failure rate, rebalance frequency.

**DLQ + reprocessing**
- Failed messages currently hit `status: 'failed'` and stop. No replay mechanism.
- Add a secondary Kinesis stream or DB table for failed/poison messages.
- Build replay tooling (CLI or API) to reprocess DLQ entries after root cause is fixed.

**Backpressure** *(partially addressed)*
- AIMD adaptive strategy (`AIMDStrategy.ts`) now adjusts batch size and processing delay based on success/failure rates.
- Throttle-aware backoff integrated into consumer loop.
- Remaining: token-bucket rate limiter on `processRecordBatch` for hard ceiling.

**Shard management**
- No handling of shard splits or merges (Kinesis resharding).
- `KinesisShardManager.listShards` returns current shards but doesn't detect parent/child
  relationships after a split. The KCL handles this natively.
- No enhanced fan-out support (dedicated read throughput per consumer).

**Auto-scaling responsiveness**
- 60s `REBALANCE_INTERVAL` means new instances wait up to 60s to get shards.
- For auto-scaling scenarios (traffic spike → new instances), consider reducing interval
  or adding an "eager rebalance" trigger on instance startup.

**Operational tooling**
- No CLI for inspecting shard assignments, checkpoint positions, or lock ownership.
- No runbooks for common failure modes (Redis outage, shard saturation, poison pill).
- No way to manually advance a checkpoint or force-release a lock without Redis CLI.
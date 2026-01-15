| ID      | Issue                                         | File                                   | Recommendation                                                          |
|---------|-----------------------------------------------|----------------------------------------|-------------------------------------------------------------------------|
| MED-002 | Lifecycle callbacks swallow errors            | All implementations                    | Add `onLifecycleError` callback                                         |
| MED-004 | Kinesis partition key = message type          | `kinesis.ts:398`                       | Make partition key configurable                                         |
| MED-006 | Shutdown doesn't wait for in-flight           | `memory.ts`, `mongodb.ts`              | Track in-flight, await completion                                       |
| MED-007 | PrismaQueue generateId unsafe cast            | `prisma.ts:316`                        | Accept ID generator function                                            |
| LOW-001 | Hardcoded polling intervals                   | `memory.ts`, `mongodb.ts`, `prisma.ts` | Make configurable via constructor                                       |
| LOW-002 | Logger coupling                               | All implementations                    | Accept optional logger in constructor                                   |
| LOW-003 | Kinesis region hardcoded to env               | `kinesis.ts:66`                        | Accept region in config                                                 |
| LOW-004 | Missing JSDoc on some methods                 | Various                                | Add method-level documentation                                          |
| LOW-005 | Consider state machines for complex consumers | `KinesisShardConsumer.ts`              | Revisit when adding rebalancing/draining states or if state bugs emerge |

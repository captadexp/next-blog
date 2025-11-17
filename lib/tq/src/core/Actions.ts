import {ExecutorActions} from "./base/interfaces";
import {Logger, LogLevel} from "@supergrowthai/utils";
import {tId} from "../utils/task-id-gen.js";
import {CronTask} from "../adapters";

const logger = new Logger('Actions', LogLevel.INFO);

interface ActionEntry<ID = any> {
    type: 'success' | 'fail' | 'addTasks';
    timestamp: number;
    task?: CronTask<ID>;  // The task passed to success/fail
    newTasks?: CronTask<ID>[];     // Tasks to add
}

interface TaskContext<ID = any> {
    task: CronTask<ID> | null;  // The task being executed (null for batch contexts)
    actions: ActionEntry<ID>[];
}

export interface ActionResults<ID = any> {
    failedTasks: CronTask<ID>[];
    successTasks: CronTask<ID>[];
    newTasks: CronTask<ID>[];
    ignoredTasks: CronTask<ID>[];
}

export class Actions<ID = any> implements ExecutorActions<ID> {
    private readonly taskRunnerId: string;
    private readonly taskContexts = new Map<string, TaskContext<ID>>();

    constructor(taskRunnerId: string) {
        this.taskRunnerId = taskRunnerId;
    }

    /**
     * Fork execution context for a specific task (for single-task executors)
     */
    forkForTask(task: CronTask<ID>): ExecutorActions<ID> {
        const taskId = tId(task);

        // Initialize context for this task
        const context: TaskContext<ID> = {task, actions: []};
        this.taskContexts.set(taskId, context);

        // Return a scoped actions object that tracks everything in this context
        return {
            fail: (t: CronTask<ID>) => {
                context.actions.push({
                    type: 'fail',
                    timestamp: Date.now(),
                    task: t
                });
                logger.error(`[${this.taskRunnerId}] Task failed: ${tId(t)} (${t.type})`);
            },

            success: (t: CronTask<ID>) => {
                context.actions.push({
                    type: 'success',
                    timestamp: Date.now(),
                    task: t
                });
                logger.info(`[${this.taskRunnerId}] Task succeeded: ${tId(t)} (${t.type})`);
            },

            addTasks: (tasks: CronTask<ID>[]) => {
                context.actions.push({
                    type: 'addTasks',
                    timestamp: Date.now(),
                    newTasks: tasks
                });
                logger.info(`[${this.taskRunnerId}] Task ${taskId} adding ${tasks.length} new tasks`);
            }
        };
    }

    // For multi-task executors - they use the root Actions directly (no forking)
    fail(task: CronTask<ID>): void {
        const taskId = tId(task);
        let context = this.taskContexts.get(taskId);
        if (!context) {
            context = {task, actions: []};
            this.taskContexts.set(taskId, context);
        }

        context!.actions.push({
            type: 'fail',
            timestamp: Date.now(),
            task
        });
        logger.error(`[${this.taskRunnerId}] Task failed: ${taskId} (${task.type})`);
    }

    success(task: CronTask<ID>): void {
        const taskId = tId(task);
        let context = this.taskContexts.get(taskId);
        if (!context) {
            context = {task, actions: []};
            this.taskContexts.set(taskId, context);
        }

        context.actions.push({
            type: 'success',
            timestamp: Date.now(),
            task
        });
        logger.info(`[${this.taskRunnerId}] Task succeeded: ${taskId} (${task.type})`);
    }

    addTasks(tasks: CronTask<ID>[]): void {
        // For multi-task mode, store in a batch-specific context
        logger.info(`[${this.taskRunnerId}] Adding ${tasks.length} new tasks`);

        const batchKey = `__batch_${this.taskRunnerId}__`;
        let batchContext = this.taskContexts.get(batchKey);
        if (!batchContext) {
            batchContext = {task: null, actions: []};
            this.taskContexts.set(batchKey, batchContext);
        }
        batchContext.actions.push({
            type: 'addTasks',
            timestamp: Date.now(),
            newTasks: tasks
        });
    }

    addIgnoredTask(task: CronTask<ID>): void {
        const taskId = tId(task);
        this.taskContexts.set(taskId, {task, actions: []});
        logger.warn(`[${this.taskRunnerId}] Task ignored: ${taskId} (${task.type})`);
    }

    /**
     * Extract actions for a single task (used by async tasks)
     */
    extractTaskActions(taskId: string): ActionResults<ID> {
        const results: ActionResults<ID> = {
            failedTasks: [],
            successTasks: [],
            newTasks: [],
            ignoredTasks: []
        };

        const context = this.taskContexts.get(taskId);
        if (!context) return results;

        if (context.actions.length === 0 && context.task) {
            // No actions = ignored task
            results.ignoredTasks.push(context.task);
        } else {
            // Process all actions
            for (const action of context.actions) {
                if (action.type === 'success' && action.task) {
                    results.successTasks.push(action.task);
                    // If marking a different task, remove its context
                    const targetTaskId = tId(action.task);
                    if (targetTaskId !== taskId) {
                        this.taskContexts.delete(targetTaskId);
                    }
                } else if (action.type === 'fail' && action.task) {
                    results.failedTasks.push(action.task);
                    const targetTaskId = tId(action.task);
                    if (targetTaskId !== taskId) {
                        this.taskContexts.delete(targetTaskId);
                    }
                } else if (action.type === 'addTasks' && action.newTasks) {
                    results.newTasks.push(...action.newTasks);
                }
            }
        }

        this.taskContexts.delete(taskId);
        return results;
    }

    /**
     * Extract sync results including batch context (for sync processing)
     */
    extractSyncResults(excludeTaskIds: string[]): ActionResults<ID> {
        const results: ActionResults<ID> = {
            failedTasks: [],
            successTasks: [],
            newTasks: [],
            ignoredTasks: []
        };

        const excludeSet = new Set(excludeTaskIds);
        const batchKey = `__batch_${this.taskRunnerId}__`;

        // Process all task contexts except excluded ones
        for (const [taskId, context] of this.taskContexts) {
            if (excludeSet.has(taskId)) continue;

            if (taskId === batchKey) {
                // Batch context - only has addTasks
                for (const action of context.actions) {
                    if (action.type === 'addTasks' && action.newTasks) {
                        results.newTasks.push(...action.newTasks);
                    }
                }
            } else {
                // Regular task context
                if (context.actions.length === 0 && context.task) {
                    results.ignoredTasks.push(context.task);
                } else {
                    for (const action of context.actions) {
                        if (action.type === 'success' && action.task) {
                            results.successTasks.push(action.task);
                        } else if (action.type === 'fail' && action.task) {
                            results.failedTasks.push(action.task);
                        } else if (action.type === 'addTasks' && action.newTasks) {
                            results.newTasks.push(...action.newTasks);
                        }
                    }
                }
            }
        }

        // Clear processed contexts
        for (const [taskId] of this.taskContexts) {
            if (!excludeSet.has(taskId)) {
                this.taskContexts.delete(taskId);
            }
        }

        return results;
    }

    /**
     * Get all results (mainly for backward compatibility)
     */
    getResults(): ActionResults<ID> {
        return this.extractSyncResults([]);
    }
}
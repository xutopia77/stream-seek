import logger from './Logger'
import * as Dty from '../../bridge/dataTypedef'
import appCfg from './AppCfg'

// Task status enumeration
enum TaskStatus {
    Pending = 'pending',
    Running = 'running',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled'
}

// Task item interface
interface TaskItem {
    id: string
    cmd: string
    status: TaskStatus
    startTime: number
    timeout?: number
    abortController?: AbortController
    metadata?: Record<string, unknown>
}

// Commands that should not update status (configurable)
const SILENT_COMMANDS: Set<string> = new Set([
    Dty.CmdType.tags_get,
    Dty.CmdType.filesGet,
    Dty.CmdType.search_file,
    Dty.CmdType.app_start
])

// Generate unique task ID
function generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Task manager class - manages single task execution with cancellation support
class TaskManager {
    private currentTask: TaskItem | null = null
    private status: string = ''
    private defaultTimeout: number = 30 * 60 * 1000 // 30 minutes default timeout

    // Check if task manager is busy
    isBusy(): boolean {
        return this.currentTask !== null && this.currentTask.status === TaskStatus.Running
    }

    // Get current task info
    getCurrentTask(): TaskItem | null {
        return this.currentTask
    }

    // Get current status string
    getStatus(): string {
        return this.status
    }

    // Set status string (with silent command filtering)
    setStatus(status: string): void {
        if (SILENT_COMMANDS.has(status)) {
            return
        }
        this.status = status
    }

    // Legacy method - alias for setStatus
    /** @deprecated Use setStatus instead */
    statusSet(status: string): void {
        this.setStatus(status)
    }

    // Start a new task
    startTask(cmd: string, options?: { timeout?: number; metadata?: Record<string, unknown> }): string | null {
        // Check if already busy
        if (this.isBusy()) {
            logger.warn(`TaskManager is busy, current task: ${this.currentTask?.cmd}, rejecting: ${cmd}`)
            return null
        }

        const taskId = generateTaskId()
        this.currentTask = {
            id: taskId,
            cmd: cmd,
            status: TaskStatus.Running,
            startTime: Date.now(),
            timeout: options?.timeout ?? this.defaultTimeout,
            metadata: options?.metadata
        }

        this.setStatus(cmd)

        if (appCfg.bPrtWorkQueue) {
            logger.info(`Task started: ${taskId}, cmd: ${cmd}`)
        }

        // Set up timeout handler
        const taskTimeout = this.currentTask.timeout ?? this.defaultTimeout
        if (taskTimeout > 0) {
            setTimeout(() => {
                if (this.currentTask?.id === taskId && this.currentTask.status === TaskStatus.Running) {
                    logger.warn(`Task timeout: ${taskId}, cmd: ${cmd}`)
                    this.cancelTask(taskId, 'timeout')
                }
            }, taskTimeout)
        }

        return taskId
    }

    // Complete current task
    completeTask(taskId?: string, success: boolean = true): void {
        if (!this.currentTask) {
            return
        }

        // If taskId provided, verify it matches current task
        if (taskId && this.currentTask.id !== taskId) {
            logger.warn(`Task ID mismatch: expected ${this.currentTask.id}, got ${taskId}`)
            return
        }

        const prevCmd = this.currentTask.cmd
        this.currentTask.status = success ? TaskStatus.Completed : TaskStatus.Failed

        if (appCfg.bPrtWorkQueue) {
            const duration = Date.now() - this.currentTask.startTime
            logger.info(`Task completed: ${this.currentTask.id}, cmd: ${prevCmd}, duration: ${duration}ms, success: ${success}`)
        }

        this.currentTask = null
        this.status = ''
    }

    // Cancel current task
    cancelTask(taskId?: string, reason: string = 'user_cancel'): boolean {
        if (!this.currentTask) {
            return false
        }

        if (taskId && this.currentTask.id !== taskId) {
            logger.warn(`Cannot cancel task: ID mismatch`)
            return false
        }

        const prevCmd = this.currentTask.cmd

        // Trigger abort controller if exists
        if (this.currentTask.abortController) {
            this.currentTask.abortController.abort()
        }

        this.currentTask.status = TaskStatus.Cancelled

        if (appCfg.bPrtWorkQueue) {
            logger.info(`Task cancelled: ${this.currentTask.id}, cmd: ${prevCmd}, reason: ${reason}`)
        }

        this.currentTask = null
        this.status = ''
        return true
    }

    // Set abort controller for current task (enables cancellation)
    setAbortController(abortController: AbortController): void {
        if (this.currentTask) {
            this.currentTask.abortController = abortController
        }
    }

    // Check if current task is aborted
    isAborted(): boolean {
        return this.currentTask?.abortController?.signal.aborted ?? false
    }

    // Generate busy response
    makeBusyResponse(): Dty.Resp {
        const resp = new Dty.Resp()
        const currentCmd = this.currentTask?.cmd ?? 'unknown'
        const duration = this.currentTask ? Math.round((Date.now() - this.currentTask.startTime) / 1000) : 0
        return resp.err(`TaskManager is busy, current task: ${currentCmd}, running for ${duration}s`)
    }

    // Legacy compatibility methods (deprecated, will be removed in future)
    /** @deprecated Use startTask instead */
    addTask(req: { cmd: string } | null): void {
        if (req !== null) {
            this.startTask(req.cmd)
        } else {
            this.completeTask(undefined, true)
        }
    }

    /** @deprecated Use isBusy() instead */
    isBusyLegacy = (): boolean => {
        return this.currentTask !== null
    }

    /** @deprecated Use getCurrentTask()?.cmd instead */
    get curReq(): { cmd: string } | null {
        return this.currentTask ? { cmd: this.currentTask.cmd } : null
    }

    /** @deprecated Use setCurrentTask directly */
    set curReq(value: { cmd: string } | null) {
        if (value === null) {
            this.completeTask(undefined, true)
        } else {
            this.startTask(value.cmd)
        }
    }
}

// Singleton instance
const taskManager = new TaskManager()

// Legacy export name for backward compatibility
const workQueue = taskManager

// Work response interface
interface WorkResp<T> {
    cmd: string
    data: T
}

export { taskManager, workQueue, TaskStatus }
export type { TaskItem, WorkResp }

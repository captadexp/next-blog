export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR
}

class Logger {
    private readonly prefix: string;
    private logLevel: LogLevel;

    constructor(prefix: string, initialLogLevel: LogLevel = LogLevel.INFO) {
        this.prefix = prefix;
        this.logLevel = initialLogLevel;
    }

    setLogLevel(level: LogLevel) {
        this.logLevel = level;
    }

    debug(message: string, ...args: any[]) {
        if (this.logLevel === LogLevel.DEBUG) {
            console.debug(`[${this.prefix}] ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]) {
        if (this.logLevel <= LogLevel.INFO) {
            console.info(`[${this.prefix}] ${message}`, ...args);
        }
    }

    error(message: string, ...args: any[]) {
        console.error(`[${this.prefix}] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]) {
        if (this.logLevel <= LogLevel.WARN) {
            console.warn(`[${this.prefix}] ${message}`, ...args);
        }
    }

    time(message: string) {
        if (this.logLevel <= LogLevel.INFO) {
            console.time(`[${this.prefix}] ${message}`)
        }
    }

    timeEnd(message: string) {
        if (this.logLevel <= LogLevel.INFO) {
            console.timeEnd(`[${this.prefix}] ${message}`)
        }
    }
}


export default Logger
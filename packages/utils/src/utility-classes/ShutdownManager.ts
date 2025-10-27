type Fn = () => Promise<void>

class ShutdownManager {
    private readonly sigintListeners: Fn[] = [];
    sigint: { register: (listener: Fn) => void } = {
        register: (listener) => this.sigintListeners.push(listener)
    }
    private readonly sigtermListeners: Fn[] = [];
    sigterm: { register: (listener: Fn) => void } = {
        register: (listener) => this.sigtermListeners.push(listener)
    }
    private readonly sigquitListeners: Fn[] = [];
    sigquit: { register: (listener: Fn) => void } = {
        register: (listener) => this.sigquitListeners.push(listener)
    }
    private shuttingDown: boolean;
    private readonly _runListeners: (listeners: Fn[]) => Promise<void>;

    constructor() {
        this.shuttingDown = false;

        this._runListeners = async (listeners) => {
            for (const listener of listeners) {
                try {
                    await listener();
                } catch (err) {
                    console.error('Error during shutdown task:', err);
                }
            }
        };

        process.on('SIGINT', () => {
            if (this.shuttingDown) return;
            this.shuttingDown = true;
            console.log('\nSIGINT received. Running shutdown tasks...');
            this._runListeners(this.sigintListeners).then(() => {
                console.log('Shutdown tasks completed.');
                process.exit(0);
            }).catch(err => {
                console.error('Error during shutdown:', err);
                process.exit(1);
            });
        });

        process.on('SIGTERM', () => {
            if (this.shuttingDown) return;
            this.shuttingDown = true;
            console.log('\nSIGTERM received. Running shutdown tasks...');
            this._runListeners(this.sigtermListeners).then(() => {
                console.log('Shutdown tasks completed.');
                process.exit(0);
            }).catch(err => {
                console.error('Error during shutdown:', err);
                process.exit(1);
            });
        });

        process.on('SIGQUIT', () => {
            if (this.shuttingDown) return;
            this.shuttingDown = true;
            console.log('\nSIGQUIT received. Running shutdown tasks...');
            this._runListeners(this.sigquitListeners).then(() => {
                console.log('Shutdown tasks completed.');
                process.exit(0);
            }).catch(err => {
                console.error('Error during shutdown:', err);
                process.exit(1);
            });
        });
    }
}

export default ShutdownManager;
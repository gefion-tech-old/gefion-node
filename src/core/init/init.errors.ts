export class InitError extends Error {

    public constructor(
        public error?: Error
    ) {
        super()
    }

}

export class ReInitError extends InitError {}
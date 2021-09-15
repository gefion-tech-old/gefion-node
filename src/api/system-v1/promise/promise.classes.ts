export abstract class VMPromise<T> extends Promise<T> {

    abstract callUnhandledRejection(reason: any): void

}
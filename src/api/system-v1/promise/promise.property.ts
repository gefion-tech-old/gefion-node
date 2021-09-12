import { APIProperty } from '../../../core/vm/api-property/api-property.classes'

export class PromiseAPIProperty extends APIProperty {

    public async init(): Promise<any> {
        class VMPromise<T> extends Promise<T> {}
        
        return VMPromise
    }

    public hasLink(): boolean {
        return false
    }

    public linkCollector(): void {

    }

}
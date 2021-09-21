import { injectable } from 'inversify'
import { IAPIPropertyFactory } from '../../../core/vm/api-property/api-property.interface'
import {  
    APIPropertyStats
} from '../../../core/vm/api-property/api-property.classes'
import { PromiseStats } from './promise.stats'
import { PromiseAPIProperty } from './promise.property'
import { PromiseName } from './promise.types'

@injectable()
export class PromiseFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return PromiseName
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async stats(): Promise<APIPropertyStats> {
        return new PromiseStats()
    }

    public async apiProperty(): Promise<PromiseAPIProperty> {
        return new PromiseAPIProperty
    }

} 
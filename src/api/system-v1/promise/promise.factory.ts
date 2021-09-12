import { injectable } from 'inversify'
import { IAPIPropertyFactory } from '../../../core/vm/api-property/api-property.interface'
import {  
    APIPropertyStatsReducer,
    APIPropertyStats 
} from '../../../core/vm/api-property/api-property.classes'
import { PromiseStatsReducer } from './promise.stats-reducer'
import { PromiseAPIProperty } from './promise.property'

@injectable()
export class PromiseFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return 'Promise'
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async statsReducer(statsSegments: APIPropertyStats[]): Promise<APIPropertyStatsReducer> {
        return new PromiseStatsReducer(statsSegments)
    }

    public async apiProperty(): Promise<PromiseAPIProperty> {
        return new PromiseAPIProperty
    }

} 
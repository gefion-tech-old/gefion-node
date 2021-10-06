import { injectable } from 'inversify'
import {
    IAPIPropertyFactory
} from '../../../../../core/vm/api-property/api-property.interface'
import { SetImmediateName } from './setImmediate.types'
import { SetImmediateAPIProperty } from './setImmediate.property'
import { SetImmediateStats } from './setImmediate.stats'

@injectable()
export class SetImmediateFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return SetImmediateName
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async stats(): Promise<SetImmediateStats> {
        return new SetImmediateStats
    }

    public async apiProperty(): Promise<SetImmediateAPIProperty> {
        return new SetImmediateAPIProperty
    }

}
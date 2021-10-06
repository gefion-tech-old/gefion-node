import { injectable } from 'inversify'
import {
    IAPIPropertyFactory
} from '../../../../../core/vm/api-property/api-property.interface'
import { SetIntervalName } from './setInterval.types'
import { SetIntervalAPIProperty } from './setInterval.property'
import { SetIntervalStats } from './setInterval.stats'

@injectable()
export class SetIntervalFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return SetIntervalName
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async stats(): Promise<SetIntervalStats> {
        return new SetIntervalStats
    }

    public async apiProperty(): Promise<SetIntervalAPIProperty> {
        return new SetIntervalAPIProperty
    }

}
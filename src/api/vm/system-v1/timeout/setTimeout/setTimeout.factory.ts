import { injectable } from 'inversify'
import {
    IAPIPropertyFactory
} from '../../../../../core/vm/api-property/api-property.interface'
import { SetTimeoutName } from './setTimeout.types'
import { SetTimeoutAPIProperty } from './setTimeout.property'
import { SetTimeoutStats } from './setTimeout.stats'

@injectable()
export class SetTimeoutFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return SetTimeoutName
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async stats(): Promise<SetTimeoutStats> {
        return new SetTimeoutStats
    }

    public async apiProperty(): Promise<SetTimeoutAPIProperty> {
        return new SetTimeoutAPIProperty
    }

}
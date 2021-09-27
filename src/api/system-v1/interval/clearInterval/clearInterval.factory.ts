import { injectable } from 'inversify'
import { 
    IAPIPropertyFactory 
} from '../../../../core/vm/api-property/api-property.interface'
import { ClearIntervalName } from './clearInterval.types'
import { ClearIntervalAPIProperty } from './clearInterval.property'
import { ClearIntervalStats } from './clearInterval.stats'

@injectable()
export class ClearIntervalFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return ClearIntervalName
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async stats(): Promise<ClearIntervalStats> {
        return new ClearIntervalStats()
    }

    public async apiProperty(): Promise<ClearIntervalAPIProperty> {
        return new ClearIntervalAPIProperty
    }

}
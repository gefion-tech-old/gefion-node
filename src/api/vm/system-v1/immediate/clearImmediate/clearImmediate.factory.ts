import { injectable } from 'inversify'
import { 
    IAPIPropertyFactory 
} from '../../../../../core/vm/api-property/api-property.interface'
import { ClearImmediateName } from './clearImmediate.types'
import { ClearImmediateAPIProperty } from './clearImmediate.property'
import { ClearImmediateStats } from './clearImmediate.stats'

@injectable()
export class ClearImmediateFactory implements IAPIPropertyFactory {

    public async name(): Promise<string> {
        return ClearImmediateName
    }

    public async isGlobal(): Promise<boolean> {
        return true
    }

    public async stats(): Promise<ClearImmediateStats> {
        return new ClearImmediateStats()
    }

    public async apiProperty(): Promise<ClearImmediateAPIProperty> {
        return new ClearImmediateAPIProperty
    }

}
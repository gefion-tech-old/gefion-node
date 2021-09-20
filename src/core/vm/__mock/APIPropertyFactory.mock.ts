import { IAPIPropertyFactory } from '../api-property/api-property.interface'
import { 
    APIProperty, 
    APIPropertyStats
} from '../api-property/api-property.classes'

export function getAPIPropertyFactory(mock: {
    name: () => string
    isGlobal: () => boolean
    stats: () => APIPropertyStats
    apiProperty: () => APIProperty
}): IAPIPropertyFactory {
    return new class implements IAPIPropertyFactory {
        public async name(): Promise<string> {
            return mock.name()
        }
    
        public async isGlobal(): Promise<boolean> {
            return mock.isGlobal()
        }
    
        public async stats(): Promise<APIPropertyStats> {
            return mock.stats()
        }
    
        public async apiProperty(): Promise<APIProperty> {
            return mock.apiProperty()
        }
    }
}
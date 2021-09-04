import { IAPIPropertyFactory } from '../api-property/api-property.interface'
import { 
    APIProperty, 
    APIPropertyStats, 
    APIPropertyStatsReducer 
} from '../api-property/api-property.classes'

export function getAPIPropertyFactory(mock: {
    name: () => string
    isGlobal: () => boolean
    statsReducer: (statsSegments: APIPropertyStats[]) => APIPropertyStatsReducer
    apiProperty: () => APIProperty
}): IAPIPropertyFactory {
    return new class implements IAPIPropertyFactory {
        public async name(): Promise<string> {
            return mock.name()
        }
    
        public async isGlobal(): Promise<boolean> {
            return mock.isGlobal()
        }
    
        public async statsReducer(statsSegments: APIPropertyStats[]): Promise<APIPropertyStatsReducer> {
            return mock.statsReducer(statsSegments)
        }
    
        public async apiProperty(): Promise<APIProperty> {
            return mock.apiProperty()
        }
    }
}
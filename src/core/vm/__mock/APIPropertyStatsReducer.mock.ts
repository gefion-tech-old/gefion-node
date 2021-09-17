import {
    APIPropertyStats,
    APIPropertyStatsReducer
} from '../api-property/api-property.classes'

export function getAPIPropertyStatsReducer(mock: {
    stats: (propertyStats: APIPropertyStats<any>[]) => Object
}): (propertyStats: APIPropertyStats<any>[]) => APIPropertyStatsReducer<any> {
    return function(statsSegments: APIPropertyStats<any>[]): APIPropertyStatsReducer<any> {
        class StatsReducer extends APIPropertyStatsReducer<any> {
            public stats(): object {
                return mock.stats(this.propertyStatsSegments)
            }
        }
        
        return new StatsReducer(statsSegments)
    } 
}
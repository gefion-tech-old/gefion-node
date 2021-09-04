import {
    APIPropertyStats,
    APIPropertyStatsReducer
} from '../api-property/api-property.classes'

export function getAPIPropertyStatsReducer(mock: {
    stats: (propertyStats: APIPropertyStats[]) => Object
}): (propertyStats: APIPropertyStats[]) => APIPropertyStatsReducer {
    return function(statsSegments: APIPropertyStats[]): APIPropertyStatsReducer {
        class StatsReducer extends APIPropertyStatsReducer {
            public stats(): object {
                return mock.stats(this.propertyStats)
            }
        }
        
        return new StatsReducer(statsSegments)
    } 
}
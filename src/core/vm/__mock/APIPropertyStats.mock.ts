import {
    APIPropertyStatsSegment,
    APIPropertyStats
} from '../api-property/api-property.classes'

export function getAPIPropertyStats(mock: {
    stats: (context: APIPropertyStats) => Object
    addStatsSegment: (context: APIPropertyStats, segment: APIPropertyStatsSegment) => void
}): APIPropertyStats {
    class Stats extends APIPropertyStats {
        public stats(): object {
            return mock.stats(this)
        }

        public addStatsSegment(segment: APIPropertyStatsSegment): void {
            mock.addStatsSegment(this, segment)
        }
    }
    
    return new Stats()
}
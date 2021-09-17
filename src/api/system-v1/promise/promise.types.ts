import { TargetApiProperty } from '../../../core/vm/api-property/api-property.types'
import { SystemV1Name } from '../system-v1.modules'
import {  
    APIPropertyStats 
} from '../../../core/vm/api-property/api-property.classes'

export const PromiseName = 'Promise'

export const TargetAPIProperty: TargetApiProperty = {
    name: PromiseName,
    version: SystemV1Name
}

export type MainStatsSegment = APIPropertyStats<object>
export type StatsSegment = MainStatsSegment

export type Stats = object
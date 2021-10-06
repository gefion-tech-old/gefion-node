import { 
    APIPropertyStats
} from '../../../../../core/vm/api-property/api-property.classes'

/**
 * Отдельно статистика вестись не будет. Её будет вести setInterval свойство
 * благодаря событию, которое генерирует это свойство
 */
export class ClearIntervalStats extends APIPropertyStats {

    public stats(): any {
        return {}
    }

    public addStatsSegment(): void {}

}
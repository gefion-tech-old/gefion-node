import { ScheduleConfig } from '../schedule.types'

export function getScheduleConfig(config: ScheduleConfig): () => Promise<ScheduleConfig> {
    return async function(): Promise<ScheduleConfig> {
        return config
    }
}
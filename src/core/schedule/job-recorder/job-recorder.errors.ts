import { ScheduleError } from '../schedule.errors'

export class ReRegistrationJobError extends ScheduleError {

    public name = 'ReRegistrationJobError'
    public message = 'Попытка повторно запланировать задания на выполнение'

}
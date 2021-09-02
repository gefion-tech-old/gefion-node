export class ScheduleError extends Error {}

export class IncorrectRecurrence extends ScheduleError {

    public name = 'IncorrectRecurrence'
    public message = 'Некорректные правила для планирования повторения задания в ScheduleModule'

}
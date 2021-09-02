export class RepairError extends Error {}

export class RepairJobError extends RepairError {

    public name = 'RepairJobError'
    public message = 'Ошибка при выполнении одного из запланированных заданий'

    constructor(
        public repairJob: string, 
        public error: any
    ) {
        super()
    }

}
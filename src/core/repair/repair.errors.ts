export class RepairJobError extends Error {

    constructor(
        public repairJob: string, 
        public error: Error
    ) {
        super()
    }

}
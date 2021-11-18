import { Method } from '../method.types'
import { Applicant } from './issue.types'

export class IssueError extends Error {}

export class MethodComplaintError extends IssueError {

    public name = 'MethodComplaintError'
    public message = 'На указанный метод поступила жалоба от указанного заявителя'

    public constructor(
        public applicant: Applicant,
        public method: Method,
        public error: any
    ) {
        super()
    }

}
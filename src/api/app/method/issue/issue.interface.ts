import { Method } from '../method.types'
import { Applicant } from './issue.types'

export interface IIssueService {

    /**
     * Пожаловаться на указанный метод. Жалоба будет отправлена напрямую работающему
     * скрипту, который реализует метод и только если этот метод доступен.
     */
    complain(applicant: Applicant, method: Method, error: any): void

}
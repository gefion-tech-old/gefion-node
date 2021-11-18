import { CreatorType } from '../../creator/creator.types'

export interface ContextApplicant {
    /**
     * Контекст с информацией о заявителе и прочее, что
     * можно будет использовать при нарушенных связях бд или
     * вне сайта
     */
    context: any
}

export interface SystemApplicant extends ContextApplicant {
    /**
     * Тип заявителя
     */
    type: CreatorType.System
}

export interface OtherApplicant extends ContextApplicant {
    /**
     * Тип заявителя
     */
    type: Exclude<CreatorType, CreatorType.System>
    /**
     * Идентификатор заявителя
     */
    id: number
}

export type Applicant = SystemApplicant | OtherApplicant
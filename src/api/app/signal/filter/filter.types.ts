import { BindableCreator } from '../../creator/creator.types'
import { Method } from '../../method/method.types'

export interface Filter {
    /**
     * Пространство имён
     */
    namespace: string
    /**
     * Название
     */
    name: string
}

export interface FilterMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateFilter {
    /**
     * Название
     */
    name: string
    /**
     * Пространство имён
     */
    namespace: string
    /**
     * Создатель
     */
    creator: BindableCreator
    /**
     * Метод
     */
    method: Method
}

/**
 * Идентификатор события мутации
 */
export const FilterEventMutationName = Symbol('FilterMutationEvent')

export enum FilterEventMutation {
    /**
     * Событие создания ресурса фильтра
     */
    Create = 'Create',
    /**
     * Событие установки метаданных в ресурс фильтра
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие удаления ресурса фильтра
     */
    Remove = 'Remove'
}
 
export interface EventContext {
    type: FilterEventMutation
    filterId: number
}
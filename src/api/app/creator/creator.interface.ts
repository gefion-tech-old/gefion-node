import { BindableResource, BindableCreator, CreatorType } from './creator.types'
import { BlockInstance } from '../entities/block-instance.entity'
import { EntityManager } from 'typeorm'

export interface ICreatorService {

    /**
     * Привязать метод к указанному создателю
     */
    bind(resource: BindableResource, creator: BindableCreator, transactionEntityManager?: EntityManager): Promise<void>

    /**
     * По идентификатору ресурса получить его создателя
     */
    getCreator(resource: BindableResource): Promise<BlockInstance | CreatorType.System | undefined>

}
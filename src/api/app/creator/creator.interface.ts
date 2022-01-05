import { BindableResource, BindableCreator, CreatorType } from './creator.types'
import { BlockInstance } from '../entities/block.entity'

export interface ICreatorService {

    /**
     * Привязать метод к указанному создателю
     */
    bind(resource: BindableResource, creator: BindableCreator, nestedTransaction?: boolean): Promise<void>

    /**
     * По идентификатору ресурса получить его создателя
     */
    getCreator(resource: BindableResource): Promise<BlockInstance | CreatorType.System | undefined>

    /**
     * Вернуть true, если указанный создатель является фактическим создателем указанного ресурса
     */
    isResourceCreator(resource: BindableResource, creator: BindableCreator): Promise<boolean>

}
import { BindableResource, BindableCreator } from './creator.types'

export interface ICreatorService {

    /**
     * Привязать метод к указанному создателю
     */
    bind(resource: BindableResource, creator: BindableCreator): Promise<void>

}
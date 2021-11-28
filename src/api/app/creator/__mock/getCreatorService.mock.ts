import { injectable } from 'inversify'
import { ICreatorService } from '../creator.interface'
import { BindableResource, BindableCreator, CreatorType } from '../creator.types'
import { BlockInstance } from '../../entities/block-instance.entity'

export function getCreatorService(mock: ICreatorService): new() => ICreatorService {
    @injectable()
    class CreatorService implements ICreatorService {

        bind(resource: BindableResource, creator: BindableCreator): Promise<void> {
            return mock.bind(resource, creator)
        }

        getCreator(resource: BindableResource): Promise<BlockInstance | CreatorType.System | undefined> {
            return mock.getCreator(resource)
        }

        isResourceCreator(resource: BindableResource, creator: BindableCreator): Promise<boolean> {
            return mock.isResourceCreator(resource, creator)
        }

    }

    return CreatorService
}
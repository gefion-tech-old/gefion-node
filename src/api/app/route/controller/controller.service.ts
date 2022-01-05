import { injectable, inject } from 'inversify'
import { IControllerService } from './controller.interface'
import { 
    ControllerMetadata, 
    CreateController,
    Controller as ControllerType,
    ControllerEventMutation,
    ControllerEventMutationName,
    EventContext
} from './controller.types'
import { METHOD_SYMBOL } from '../../method/method.types'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { ICreatorService } from '../../creator/creator.interface'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { Controller } from '../../entities/route.entity'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { IMethodService } from '../../method/method.interface'
import {
    ControllerMethodNotDefined,
    ControllerDoesNotExists,
    ControllerAlreadyExists,
    ControllerUsedError
} from './controller.errors'
import { Metadata } from '../../entities/metadata.entity'
import { MethodUsedError } from '../../method/method.errors'
import { isErrorCode, SqliteErrorCode } from '../../../../core/typeorm/utils/error-code'
import { EventEmitter } from 'events'

@injectable()
export class ControllerService implements IControllerService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService
    ) {}

    public async create(options: CreateController, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const controllerRepository = connection.getRepository(Controller)

        if (await this.isExists(options)) {
            throw new ControllerAlreadyExists
        }

        const methodId = await this.methodService.getMethodId(options.method)

        if (!methodId) {
            throw new ControllerMethodNotDefined
        }

        /**
         * Оборачиваю запрос в транзакцию в том числе из-за каскадного сохранения
         * метаданных
         */
        const controllerEntity = await transaction(nestedTransaction, connection, async () => {
            const controllerEntity = await mutationQuery(true, () => {
                return controllerRepository.save({
                    name: options.name,
                    namespace: options.namespace,
                    metadata: {
                        metadata: {
                            custom: null
                        }
                    },
                    method: { id: methodId }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Controller,
                id: controllerEntity.id
            }, options.creator, true)

            return controllerEntity
        })

        const eventContext: EventContext = {
            type: ControllerEventMutation.Create,
            controllerId: controllerEntity.id
        }
        this.eventEmitter.emit(ControllerEventMutationName, eventContext)
    }

    public async isExists(controller: ControllerType): Promise<boolean> {
        const connection = await this.connection
        const controllerRepository = connection.getRepository(Controller)

        return await controllerRepository.count({
            where: {
                namespace: controller.namespace,
                name: controller.name
            }
        }) > 0
    }

    public async setMetadata(controller: ControllerType, snapshotMetadata: SnapshotMetadata<ControllerMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const controllerRepository = connection.getRepository(Controller)
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

        const controllerEntity = await controllerRepository.findOne({
            where: {
                namespace: controller.namespace,
                name: controller.name
            }
        })

        if (!controllerEntity) {
            throw new ControllerDoesNotExists
        }

        controllerEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataRepository.update(controllerEntity.metadata.id, {
            metadata: controllerEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: ControllerEventMutation.SetMetadata,
            controllerId: controllerEntity.id
        }
        this.eventEmitter.emit(ControllerEventMutationName, eventContext)
    }

    public async remove(controller: ControllerType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const controllerRepository = connection.getRepository(Controller)
        const metadataRepository = connection.getRepository(Metadata)

        const controllerEntity = await controllerRepository.findOne({
            where: {
                namespace: controller.namespace,
                name: controller.name
            },
            relations: ['method']
        })

        if (!controllerEntity) {
            return
        }

        /**
         * Идентификатор контроллера для события
         */
        const controllerId = controllerEntity.id
        
        await transaction(nestedTransaction, connection, async () => {
            try {
                await mutationQuery(true, () => {
                    return controllerRepository.remove(controllerEntity)
                })
            } catch(error) {
                if (isErrorCode(error, [
                    SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                    SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
                ])) {
                    throw new ControllerUsedError
                }

                throw error
            }
            
            await mutationQuery(true, () => {
                return metadataRepository.remove(controllerEntity.metadata)
            })

            /**
             * Попытаться удалить метод контроллера, если он не используется
             */
            try {
                await this.methodService.removeMethod(controllerEntity.method, true)
            } catch(error) {
                block: {
                    if (error instanceof MethodUsedError) {
                        break block
                    }

                    throw error
                }
            }
        })

        const eventContext: EventContext = {
            type: ControllerEventMutation.Remove,
            controllerId: controllerId
        }
        this.eventEmitter.emit(ControllerEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(ControllerEventMutationName, handler)
    }

}
import { getContainer } from '../../../inversify.config'
import { 
    CREATOR_SYMBOL, 
    ResourceType,
    CreatorType
} from './creator.types'
import { ICreatorService } from './creator.interface'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { Method } from '../entities/method.entity'
import { BlockInstance } from '../entities/block-instance.entity'
import { BlockVersion } from '../entities/block-version.entity'
import { Creator } from '../entities/creator.entity'
import { ResourceAlreadyHasCreator } from './creator.errors'
import { Signal } from '../entities/signal.entity'
import { Role, Permission } from '../entities/user.entity'
import { Controller } from '../entities/route.entity'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('CreatorService в CreatorModule', () => {

    describe('Методы в качестве ресурсов', () => {

        it(`
            Методы корректно привязываются к экземпляру блока. Нельзя удалить
            экземпляр блока с привязанным методом, но можно удалить метод.
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const methodRepository = connection.getRepository(Method)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
            const creatorRepository = connection.getRepository(Creator)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(instanceRepository.remove(instanceEntity))
                .rejects
                .toThrow()
            await expect(methodRepository.remove(methodEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Методы корректно привязываются к системе. Привязка удаляется вместе
            с удалением метода
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const methodRepository = connection.getRepository(Method)
            const creatorRepository = connection.getRepository(Creator)
    
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.System
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(methodRepository.remove(methodEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Экземпляр блока, к которому привязан метод корректно можно получить
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const methodRepository = connection.getRepository(Method)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })

            await creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Method,
                id: methodEntity.id
            })).resolves.toBeInstanceOf(BlockInstance)

            container.restore()
        })
    
        it(`
            Систему, к которой привязан метод корректно можно получить 
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const methodRepository = connection.getRepository(Method)

            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })

            await creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.System
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Method,
                id: methodEntity.id
            })).resolves.toBe(CreatorType.System)

            container.restore()
        })

    })

    describe('Сигналы в качестве ресурсов', () => {

        it(`
            Сигналы корректно привязываются к экземпляру блока. Нельзя удалить
            экземпляр блока с привязанным сигналом, но можно удалить метод.
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const signalRepository = connection.getRepository(Signal)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
            const creatorRepository = connection.getRepository(Creator)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const signalEntity = await signalRepository.save({
                name: 'name',
                namespace: 'namespace',
                metadata: {
                    metadata: {}
                }
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Signal,
                id: signalEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(instanceRepository.remove(instanceEntity))
                .rejects
                .toThrow()
            await expect(signalRepository.remove({ id: signalEntity.id } as Signal))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })

        it(`
            Сигналы корректно привязываются к системе. Привязка удаляется вместе
            с удалением сигнала
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const signalRepository = connection.getRepository(Signal)
            const creatorRepository = connection.getRepository(Creator)
    
            const signalEntity = await signalRepository.save({
                name: 'name',
                namespace: 'namespace',
                metadata: {
                    metadata: {}
                }
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Signal,
                id: signalEntity.id
            }, {
                type: CreatorType.System
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(signalRepository.remove({ id: signalEntity.id } as Signal))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Экземпляр блока, к которому привязан метод корректно можно получить
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const signalRepository = connection.getRepository(Signal)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const signalEntity = await signalRepository.save({
                name: 'name',
                namespace: 'namespace',
                metadata: {
                    metadata: {}
                }
            })

            await creatorService.bind({
                type: ResourceType.Signal,
                id: signalEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Signal,
                id: signalEntity.id
            })).resolves.toBeInstanceOf(BlockInstance)

            container.restore()
        })
    
        it(`
            Систему, к которой привязан метод корректно можно получить 
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const signalRepository = connection.getRepository(Signal)

            const signalEntity = await signalRepository.save({
                name: 'name',
                namespace: 'namespace',
                metadata: {
                    metadata: {}
                }
            })

            await creatorService.bind({
                type: ResourceType.Signal,
                id: signalEntity.id
            }, {
                type: CreatorType.System
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Signal,
                id: signalEntity.id
            })).resolves.toBe(CreatorType.System)

            container.restore()
        })

    })

    describe('Роли в качестве ресурсов', () => {

        it(`
            Роли корректно привязываются к экземпляру блока. Нельзя удалить
            экземпляр блока с привязанной ролью, но можно удалить роль.
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const roleRepository = connection.getRepository(Role)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
            const creatorRepository = connection.getRepository(Creator)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const roleEntity = await roleRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Role,
                id: roleEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(instanceRepository.remove(instanceEntity))
                .rejects
                .toThrow()
            await expect(roleRepository.remove(roleEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Роли корректно привязываются к системе. Привязка удаляется вместе
            с удалением роли
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const roleRepository = connection.getRepository(Role)
            const creatorRepository = connection.getRepository(Creator)
    
            const roleEntity = await roleRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Role,
                id: roleEntity.id
            }, {
                type: CreatorType.System
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(roleRepository.remove(roleEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Экземпляр блока, к которому привязана роль корректно можно получить
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const roleRepository = connection.getRepository(Role)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const roleEntity = await roleRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })

            await creatorService.bind({
                type: ResourceType.Role,
                id: roleEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Role,
                id: roleEntity.id
            })).resolves.toBeInstanceOf(BlockInstance)

            container.restore()
        })
    
        it(`
            Систему, к которой привязана роль корректно можно получить 
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const roleRepository = connection.getRepository(Role)

            const roleEntity = await roleRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })

            await creatorService.bind({
                type: ResourceType.Role,
                id: roleEntity.id
            }, {
                type: CreatorType.System
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Role,
                id: roleEntity.id
            })).resolves.toBe(CreatorType.System)

            container.restore()
        })

    })

    describe('Полномочия в качестве ресурсов', () => {

        it(`
            Полномочия корректно привязываются к экземпляру блока. Нельзя удалить
            экземпляр блока с привязанным полномочием, но можно удалить полномочие.
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const permissionRepository = connection.getRepository(Permission)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
            const creatorRepository = connection.getRepository(Creator)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const permissionEntity = await permissionRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Permission,
                id: permissionEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(instanceRepository.remove(instanceEntity))
                .rejects
                .toThrow()
            await expect(permissionRepository.remove(permissionEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Полномочия корректно привязываются к системе. Привязка удаляется вместе
            с удалением полномочия
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const permissionRepository = connection.getRepository(Permission)
            const creatorRepository = connection.getRepository(Creator)
    
            const permissionEntity = await permissionRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Permission,
                id: permissionEntity.id
            }, {
                type: CreatorType.System
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(permissionRepository.remove(permissionEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Экземпляр блока, к которому привязано полномочие корректно можно получить
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const permissionRepository = connection.getRepository(Permission)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
            const permissionEntity = await permissionRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })

            await creatorService.bind({
                type: ResourceType.Permission,
                id: permissionEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Permission,
                id: permissionEntity.id
            })).resolves.toBeInstanceOf(BlockInstance)

            container.restore()
        })
    
        it(`
            Систему, к которой привязано полномочие корректно можно получить 
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const permissionRepository = connection.getRepository(Permission)

            const permissionEntity = await permissionRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                }
            })

            await creatorService.bind({
                type: ResourceType.Permission,
                id: permissionEntity.id
            }, {
                type: CreatorType.System
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Permission,
                id: permissionEntity.id
            })).resolves.toBe(CreatorType.System)

            container.restore()
        })

    })

    describe('Контроллеры в качестве ресурсов', () => {

        it(`
            Контроллеры корректно привязываются к экземпляру блока. Нельзя удалить
            экземпляр блока с привязанным контроллером, но можно удалить контроллер.
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
            const creatorRepository = connection.getRepository(Creator)
            const controllerRepository = connection.getRepository(Controller)
            const methodRepository = connection.getRepository(Method)
    
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })
            const controllerEntity = await controllerRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                },
                method: methodEntity
            })
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Controller,
                id: controllerEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(instanceRepository.remove(instanceEntity))
                .rejects
                .toThrow()
            await expect(controllerRepository.remove(controllerEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Контроллеры корректно привязываются к системе. Привязка удаляется вместе
            с удалением контроллера
        `, async () => {
            const container = await getContainer()
            container.snapshot()
    
            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const creatorRepository = connection.getRepository(Creator)
    
            const controllerRepository = connection.getRepository(Controller)
            const methodRepository = connection.getRepository(Method)
    
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })
            const controllerEntity = await controllerRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                },
                method: methodEntity
            })
    
            await expect(creatorService.bind({
                type: ResourceType.Controller,
                id: controllerEntity.id
            }, {
                type: CreatorType.System
            })).resolves.toBeUndefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(1)
            await expect(controllerRepository.remove(controllerEntity))
                .resolves
                .toBeDefined()
            await expect(creatorRepository.find())
                .resolves
                .toHaveLength(0)
    
            container.restore()
        })
    
        it(`
            Экземпляр блока, к которому привязан контроллер корректно можно получить
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const versionRepository = connection.getRepository(BlockVersion)
            const instanceRepository = connection.getRepository(BlockInstance)
    
            const versionEntity = await versionRepository.save({
                name: 'name',
                path: 'path',
                version: 'version' 
            })
            const instanceEntity = await instanceRepository.save({
                blockVersion: versionEntity
            })

            const controllerRepository = connection.getRepository(Controller)
            const methodRepository = connection.getRepository(Method)
    
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })
            const controllerEntity = await controllerRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                },
                method: methodEntity
            })

            await creatorService.bind({
                type: ResourceType.Controller,
                id: controllerEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Controller,
                id: controllerEntity.id
            })).resolves.toBeInstanceOf(BlockInstance)

            container.restore()
        })
    
        it(`
            Систему, к которой привязан контроллер корректно можно получить 
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)

            const controllerRepository = connection.getRepository(Controller)
            const methodRepository = connection.getRepository(Method)
    
            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })
            const controllerEntity = await controllerRepository.save({
                name: 'name',
                metadata: {
                    metadata: {
                        custom: null
                    }
                },
                method: methodEntity
            })

            await creatorService.bind({
                type: ResourceType.Controller,
                id: controllerEntity.id
            }, {
                type: CreatorType.System
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Controller,
                id: controllerEntity.id
            })).resolves.toBe(CreatorType.System)

            container.restore()
        })

    })

    it(`
        Попытка привязать создателя к ресурсу у которого уже есть создатель выбрасывает
        исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)

        const methodEntity = await methodRepository.save({
            name: 'name',
            namespace: 'namespace',
            type: 'type'
        })

        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.System
        })).resolves.toBeUndefined()
        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.System
        })).rejects.toBeInstanceOf(ResourceAlreadyHasCreator)

        container.restore()
    })

    it(`
        Попытка получить создателя ресурса, к которому не привязано ни одного создателя
        возвращает undefined
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)

        await expect(creatorService.getCreator({
            type: ResourceType.Method,
            id: 1
        })).resolves.toBeUndefined()

        container.restore()
    })

    it(`
        Владение системы ресурсом корректно подтверждается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)

        const methodEntity = await methodRepository.save({
            name: 'name',
            namespace: 'namespace',
            type: 'type'
        })

        await creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.System
        })

        await expect(creatorService.isResourceCreator({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        container.restore()
    })

    it(`
        Отсутствие создателя у ресурса возвращает false при проверке владения ресурсом
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)

        await expect(creatorService.isResourceCreator({
            type: ResourceType.Method,
            id: 0
        }, {
            type: CreatorType.System
        })).resolves.toBe(false)

        container.restore()
    })

    it(`
        Владение экземпляра блока ресурсом корректно подтверждается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const versionRepository = connection.getRepository(BlockVersion)
        const instanceRepository = connection.getRepository(BlockInstance)

        const versionEntity = await versionRepository.save({
            name: 'name',
            path: 'path',
            version: 'version' 
        })
        const instanceEntity = await instanceRepository.save({
            blockVersion: versionEntity
        })

        const methodEntity = await methodRepository.save({
            name: 'name',
            namespace: 'namespace',
            type: 'type'
        })

        await creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.BlockInstance,
            id: instanceEntity.id
        })

        await expect(creatorService.isResourceCreator({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.BlockInstance,
            id: instanceEntity.id
        })).resolves.toBe(true)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.BlockInstance,
            id: 0
        })).resolves.toBe(false)

        container.restore()
    })

})
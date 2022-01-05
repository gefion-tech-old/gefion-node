import { getContainer } from '../../../../inversify.config'
import { IRoleService } from './role.interface'
import { USER_SYMBOL } from '../user.types'
import { Metadata } from '../../entities/metadata.entity'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { 
    RoleDoesNotExists, 
    RoleDoesNotHavePermission, 
    RoleAlreadyExists,
    PermissionAlreadyBound
} from './role.errors'
import { RevisionNumberError } from '../../metadata/metadata.errors'
import { PermissionDoesNotExist } from '../permission/permission.errors'
import { IPermissionService } from '../permission/permission.interface'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { Role, RolePermission } from '../../entities/user.entity'
import { RoleEventMutation } from './role.types'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('RoleService в UserModule', () => {

    it(`
        Новая роль корректно создаётся. Попытка создать уже существующую роль
        приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.isExists('role1')).resolves.toBe(false)
        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).rejects.toBeInstanceOf(RoleAlreadyExists)
        await expect(roleService.isExists('role1')).resolves.toBe(true)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Role,
            id: 1
        }, { type: CreatorType.System })).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, {
            type: RoleEventMutation.Create,
            roleName: 'role1'
        })

        container.restore()
    })
    
    it(`
        Указанная роль корректно удаляется вместе с метаданными. Попытка удалить несуществующую роль
        ни к чему не приводит. Все метаданные связей ролей с полномочиями удаляются
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const permissionService = container
            .get<IPermissionService>(USER_SYMBOL.PermissionService)
        const metadataRepository = connection.getRepository(Metadata)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await permissionService.create({
            name: 'permission1',
            creator: {
                type: CreatorType.System
            }
        })
        
        await expect(roleService.isExists('role1')).resolves.toBe(false)
        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(2)
        await expect(roleService.isExists('role1')).resolves.toBe(true)
        await expect(roleService.addPermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.remove('role1')).resolves.toBeUndefined()
        await expect(roleService.remove('role1')).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(roleService.isExists('role1')).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(3)
        expect(eventMutationFn).nthCalledWith(3, {
            type: RoleEventMutation.Remove,
            roleName: 'role1'
        })

        container.restore()
    })
    
    it(`
        Попытка установить метаданные в несуществующую роль приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.setMetadata('role1', {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RoleDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })
    
    it(`
        Метаданные корректно устанавливаются в роль и читаются из неё. Попытка установить 
        метаданные несоответствующей редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const roleRepository = connection.getRepository(Role)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect((async () => {
            const roleEntity = await roleRepository.findOne({
                where: {
                    name: 'role1'
                }
            })
            return roleEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(roleService.setMetadata('role1', {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const roleEntity = await roleRepository.findOne({
                where: {
                    name: 'role1'
                }
            })
            return roleEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(roleService.setMetadata('role1', {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect((async () => {
            const roleEntity = await roleRepository.findOne({
                where: {
                    name: 'role1'
                }
            })
            return roleEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, {
            type: RoleEventMutation.SetMetadata,
            roleName: 'role1'
        })

        container.restore()
    })
    
    it(`
        Попытка добавить полномочие к несуществующей роли приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.addPermission('role1', 'permission1'))
            .rejects
            .toBeInstanceOf(RoleDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })
    
    it(`
        Попытка добавить несуществующее полномочие к роли приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(roleService.addPermission('role1', 'permission1'))
            .rejects
            .toBeInstanceOf(PermissionDoesNotExist)

        expect(eventMutationFn).toBeCalledTimes(1)

        container.restore()
    })
    
    it(`
        Полномочия корректно добавляются к роли. Повторная попытка добавить полномочие
        приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const permissionService = container
            .get<IPermissionService>(USER_SYMBOL.PermissionService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const metadataRepository = connection.getRepository(Metadata)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })
        await permissionService.create({
            name: 'permission1',
            creator: {
                type: CreatorType.System
            }
        })

        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(2)
        await expect(roleService.addPermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.addPermission('role1', 'permission1')).rejects.toBeInstanceOf(PermissionAlreadyBound)
        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(3)

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, {
            type: RoleEventMutation.AddPermission,
            roleName: 'role1',
            permissionName: 'permission1'
        })

        container.restore()
    })
    
    it(`
        Попытка удалить существующее полномочие из несуществующей роли приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const permissionService = container
            .get<IPermissionService>(USER_SYMBOL.PermissionService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)
        
        await expect(permissionService.create({
            name: 'permission1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        
        await expect(roleService.removePermission('role1', 'permission1'))
            .rejects
            .toBeInstanceOf(RoleDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Попытка удалить несуществующее полномочие из роли приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()

        await expect(roleService.removePermission('role1', 'empty')).rejects.toBeInstanceOf(PermissionDoesNotExist)

        expect(eventMutationFn).toBeCalledTimes(1)

        container.restore()
    })
    
    it(`
        Указанное полномочие корректно удаляется из роли вместе с метаданными. Попытка удалить несуществующее полномочие 
        из роли ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const permissionService = container
            .get<IPermissionService>(USER_SYMBOL.PermissionService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const metadataRepository = connection.getRepository(Metadata)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(permissionService.create({
            name: 'permission1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(roleService.addPermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(3)

        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(true)
        await expect(roleService.removePermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.removePermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(2)

        expect(eventMutationFn).toBeCalledTimes(3)
        expect(eventMutationFn).nthCalledWith(3, {
            type: RoleEventMutation.RemovePermission,
            roleName: 'role1',
            permissionName: 'permission1'
        })

        container.restore()
    })
    
    it(`
        Попытка установить метаданные в несуществующую связь роли с полномочием приводит
        к различным исключениям
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const permissionService = container
            .get<IPermissionService>(USER_SYMBOL.PermissionService)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(permissionService.create({
            name: 'permission1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()

        await expect(roleService.setRolePermissionMetadata('role2', 'permission1', {} as any))
            .rejects
            .toBeInstanceOf(RoleDoesNotExists)
        await expect(roleService.setRolePermissionMetadata('role1', 'permission2', {} as any))
            .rejects
            .toBeInstanceOf(PermissionDoesNotExist)
        await expect(roleService.setRolePermissionMetadata('role1', 'permission1', {} as any))
            .rejects
            .toBeInstanceOf(RoleDoesNotHavePermission)

        expect(eventMutationFn).toBeCalledTimes(1)

        container.restore()
    })
    
    it(`
        Метаданные корректно устанавливаются в связь роли с полномочием и корректно читаются из неё. 
        Попытка установить метаданные несоответствующей редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const permissionService = container
            .get<IPermissionService>(USER_SYMBOL.PermissionService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const metadataRepository = connection.getRepository(Metadata)
        const rolePermissionRepository = connection.getRepository(RolePermission)

        const eventMutationFn = jest.fn()
        roleService.onMutation(eventMutationFn)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(permissionService.create({
            name: 'permission1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(roleService.addPermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(3)
        
        await expect((async () => {
            const rolePermissionEntity = await rolePermissionRepository.findOne({
                where: {
                    roleName: 'role1',
                    permissionName: 'permission1'
                }
            })
            return rolePermissionEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(roleService.setRolePermissionMetadata('role1', 'permission1', {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const rolePermissionEntity = await rolePermissionRepository.findOne({
                where: {
                    roleName: 'role1',
                    permissionName: 'permission1'
                }
            })
            return rolePermissionEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(roleService.setRolePermissionMetadata('role1', 'permission1', {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)

        expect(eventMutationFn).toBeCalledTimes(3)
        expect(eventMutationFn).nthCalledWith(3, {
            type: RoleEventMutation.SetRolePermissionMetadata,
            roleName: 'role1',
            permissionName: 'permission1'
        })

        container.restore()
    })
    
})
import { getContainer } from '../../../../inversify.config'
import { IRoleService } from './role.interface'
import { USER_SYMBOL } from '../user.types'
import { Metadata } from '../../entities/metadata.entity'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { RoleDoesNotExists, RoleDoesNotHavePermission } from './role.errors'
import { RevisionNumberError } from '../../metadata/metadata.errors'
import { PermissionDoesNotExist } from '../permission/permission.errors'
import { IPermissionService } from '../permission/permission.interface'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'

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
        ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)

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
        })).resolves.toBeUndefined()
        await expect(roleService.isExists('role1')).resolves.toBe(true)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Role,
            id: 1
        }, { type: CreatorType.System })).resolves.toBe(true)

        container.restore()
    })
    
    it(`
        Указанная роль корректно удаляется вместе с метаданными. Попытка удалить несуществующую роль
        ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const metadataRepository = connection.getRepository(Metadata)
        
        await expect(roleService.isExists('role1')).resolves.toBe(false)
        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(metadataRepository.find()).resolves.toHaveLength(1)
        await expect(roleService.isExists('role1')).resolves.toBe(true)
        await expect(roleService.remove('role1')).resolves.toBeUndefined()
        await expect(roleService.remove('role1')).resolves.toBeUndefined()
        await expect(metadataRepository.find()).resolves.toHaveLength(0)
        await expect(roleService.isExists('role1')).resolves.toBe(false)

        container.restore()
    })
    
    it(`
        Попытка установить метаданные в несуществующую роль приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        await expect(roleService.setMetadata('role1', {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RoleDoesNotExists)

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

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(roleService.getMetadata('role1')).resolves.toMatchObject({
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
        await expect(roleService.getMetadata('role1')).resolves.toMatchObject({
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
        await expect(roleService.getMetadata('role1')).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
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

        await expect(roleService.addPermission('role1', 'permission1'))
            .rejects
            .toBeInstanceOf(RoleDoesNotExists)

        container.restore()
    })
    
    it(`
        Попытка добавить несуществующее полномочие к роли приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        await expect(roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(roleService.addPermission('role1', 'permission1'))
            .rejects
            .toBeInstanceOf(PermissionDoesNotExist)

        container.restore()
    })
    
    it(`
        Полномочия корректно добавляются к роли. Повторная попытка добавить полномочие
        ни к чему не приводит
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
        await expect(roleService.addPermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(3)

        container.restore()
    })
    
    it(`
        Попытка удалить полномочие из несуществующей роли приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        
        await expect(roleService.removePermission('role1', 'permission1'))
            .rejects
            .toBeInstanceOf(RoleDoesNotExists)

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
        await expect(roleService.addPermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(3)

        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(true)
        await expect(roleService.removePermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.removePermission('role1', 'permission1')).resolves.toBeUndefined()
        await expect(roleService.isExistsPermission('role1', 'permission1')).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(2)

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

        await expect(roleService.getRolePermissionMetadata('role1', 'permission1')).resolves.toMatchObject({
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
        await expect(roleService.getRolePermissionMetadata('role1', 'permission1')).resolves.toMatchObject({
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

        container.restore()
    })
    
})
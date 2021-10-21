import { getContainer } from '../../../../inversify.config'
import { IVersionService } from './version.interface'
import { BLOCK_SYMBOL } from '../block.types'
import { Connection } from 'typeorm'
import { BlockVersion } from '../entities/block-version.entity'
import { BlockInstance } from '../entities/block-instance.entity'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { BlockVersionInUse, BlockVersionAlreadyExists } from './version.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('VersionService в BlockModule', () => {
   
    it(`
        Версия корректно ассоциируется с физическим путём, а после ассоциация корректно 
        убирается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)
        const connection = container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const versionRepository = await connection
            .then(connection => {
                return connection.getRepository(BlockVersion)
            })

        const versionInfo = {
            name: 'block',
            version: '1.0.0',
            path: '/path/to/path'
        }

        await expect(versionService.associate(versionInfo)).resolves.toBeUndefined()
        await expect(versionRepository.findOne(versionInfo)).resolves.toMatchObject(versionInfo)
        await expect(versionService.unassociate(versionInfo)).resolves.toBeUndefined()
        await expect(versionRepository.findOne(versionInfo)).resolves.toBeUndefined()

        container.restore()
    })

    it(`
        Попытка ассоциировать уже ассоциированную версию блока приводит к исключению 
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'block',
            version: '1.0.0',
            path: '/path/to/path'
        }

        await versionService.associate(versionInfo)

        await expect(versionService.associate(versionInfo))
            .rejects
            .toBeInstanceOf(BlockVersionAlreadyExists)

        container.restore()
    })

    it(`
        При снятии ассоциации версии выбрасывается исключение, если у версии блока есть
        какие либо связанные с ним важные ресурсы
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)
        const connection = container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const versionRepository = await connection
            .then(connection => {
                return connection.getRepository(BlockVersion)
            })
        const instanceRepository = await connection
            .then(connection => {
                return connection.getRepository(BlockInstance)
            })

        const versionInfo = {
            name: 'block',
            version: '1.0.0',
            path: '/path/to/path'
        }

        await versionService.associate(versionInfo)

        const blockVersion = await versionRepository.findOne(versionInfo)

        if (!blockVersion) {
            throw new Error()
        }

        await instanceRepository.save({
            blockVersion: blockVersion
        })

        await expect(versionService.unassociate(versionInfo))
            .rejects
            .toBeInstanceOf(BlockVersionInUse)

        container.restore()
    })

})
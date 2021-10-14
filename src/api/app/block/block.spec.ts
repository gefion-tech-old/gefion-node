import { getContainer } from '../../../inversify.config'
import { IBlockService } from './block.interface'
import { BLOCK_SYMBOL } from './block.types'
import { Connection } from 'typeorm'
import { Block } from './entities/block.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('BlockService в BlockModule', () => {
   
    it(`
        Блок корректно ассоциируется с физическим путём, а после ассоциация корректно 
        убирается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const blockService = container
            .get<IBlockService>(BLOCK_SYMBOL.BlockService)
        const connection = container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const blockRepository = await connection
            .then(connection => {
                return connection.getRepository(Block)
            })

        const blockInfo = {
            name: 'block',
            version: '1.0.0',
            path: '/path/to/path'
        }

        await expect(blockService.associate(blockInfo)).resolves.toBeUndefined()
        await expect(blockRepository.findOne(blockInfo)).resolves.toMatchObject(blockInfo)
        await expect(blockService.unassociate(blockInfo)).resolves.toBeUndefined()
        await expect(blockRepository.findOne(blockInfo)).resolves.toBeUndefined()

        container.restore()
    })

    it.todo(`
        При снятии ассоциации блока выбрасывается исключение, если у блока есть
        какие-либо связанные ресурсы
    `)

})
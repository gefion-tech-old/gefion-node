import { injectable, inject } from 'inversify'
import { InitRunner } from '../init/init.types'
import { FASTIFY_SYMBOL } from './fastify.types'
import { IFastifyService } from './fastify.interface'

@injectable()
export class InitFastify implements InitRunner {

    public constructor(
        @inject(FASTIFY_SYMBOL.FastifyService)
        private fastifyService: IFastifyService
    ) {}

    public async run(): Promise<void> {
        await this.fastifyService.fastify()
    }

}
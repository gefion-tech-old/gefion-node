import { injectable, inject } from 'inversify'
import { IInitService } from './init.interface'
import { ReInitError } from './init.errors'
import { INIT_SYMBOL, InitConfig } from './init.types'

@injectable()
export class InitService implements IInitService {

    public constructor(
        @inject(INIT_SYMBOL.InitConfig)
        private config: Promise<InitConfig>
    ) {}

    private isCallSchedule = false

    public async init() {
        if (this.isCallSchedule) {
            throw new ReInitError
        }
        this.isCallSchedule = true

        const config = await this.config

        try {
            for (let runner of config.runners) {
                await runner.run()
            }
        } catch (error) {
            config.logger.fatal(error)
            throw error
        }
    }

}
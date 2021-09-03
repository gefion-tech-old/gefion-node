import { InitConfig, InitRunner } from '../init.types'

export function getInitConfig(mock: {
    runners: InitRunner[]
}): () => Promise<InitConfig> {
    return async function(): Promise<InitConfig> {
        return {
            runners: mock.runners
        }
    }
}
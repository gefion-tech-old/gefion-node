import { AsyncContainerModule, interfaces } from 'inversify'
import { GIT_SYMBOL, GitConfig } from './git.types'
import { getGitConfig } from './git.config'
import simpleGit, { SimpleGit as GitType } from 'simple-git'

export const GitModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<GitConfig>>(GIT_SYMBOL.GitConfig)
        .toDynamicValue(getGitConfig)
        .inSingletonScope()

    bind<Promise<GitType>>(GIT_SYMBOL.Git)
        .toDynamicValue(async (context: interfaces.Context): Promise<GitType> => {
            const container = context.container
            const config = await container.get<Promise<GitConfig>>(GIT_SYMBOL.GitConfig)

            return simpleGit(config)
        })
})
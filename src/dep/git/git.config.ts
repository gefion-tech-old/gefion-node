import { interfaces } from 'inversify'
import { GitConfig } from './git.types'

export async function getGitConfig(_: interfaces.Context): Promise<GitConfig> {
    return {
        maxConcurrentProcesses: 10
    }
}
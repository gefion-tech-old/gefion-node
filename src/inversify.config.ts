import 'reflect-metadata'
import { Container, interfaces } from 'inversify'
import { CoreModules } from './core/core.modules'
import { APIModules } from './api/api.modules'

let container: interfaces.Container

export async function getContainer(): Promise<interfaces.Container> {
    if (!container) {
        container = new Container
        
        await container.loadAsync(
            ...CoreModules,
            ...APIModules
        )
    }

    return container
}
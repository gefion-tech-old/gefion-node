import { injectable } from 'inversify'
import { IStoreService } from '../store/store.interface'
import { StoreInfo } from '../store/store.types'

export function getStoreService(mock: {
    getAppId: () => string
    sync: () => StoreInfo
    getPorts: () => number[]
    removePort: (port: number) => void
}): new() => IStoreService {
    @injectable()
    class StoreService implements IStoreService {

        public async getAppId(): Promise<string> {
            return mock.getAppId()
        }

        public async sync(): Promise<StoreInfo> {
            return mock.sync()
        }

        public async getPorts(): Promise<number[]> {
            return mock.getPorts()
        }

        public async removePort(port: number): Promise<void> {
            mock.removePort(port)
        }

    }

    return StoreService
}
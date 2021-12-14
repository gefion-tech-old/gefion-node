import { injectable } from 'inversify'
import { IRemoteAuthService } from '../auth/remote-auth/remote-auth.interface'

export function getRemoteAuthService(mock: IRemoteAuthService): new() => IRemoteAuthService {
    @injectable()
    class RemoteAuthService implements IRemoteAuthService {

        refreshToken(refreshToken: any, ua: any, ip: any): any {
            return mock.refreshToken(refreshToken, ua, ip)
        }

        login(code: any): any {
            return mock.login(code)
        }

    }

    return RemoteAuthService
}
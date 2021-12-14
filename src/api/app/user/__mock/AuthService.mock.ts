import { injectable } from 'inversify'
import { IAuthService } from '../auth/auth.interface'

export function getAuthService(mock: IAuthService): new() => IAuthService {
    @injectable()
    class AuthService implements IAuthService {

        login(code: any): any {
            return mock.login(code)
        }

        refreshToken(refreshToken: any, ua: any, ip: any): any {
            return mock.refreshToken(refreshToken, ua, ip)
        }

        verify(accessToken: any): any {
            return mock.verify(accessToken)
        }

    }

    return AuthService
}
import { Tokens, AuthCode, IPAddress, UserAgent, RefreshToken } from '../auth.types'

export interface IRemoteAuthService {

    /**
     * Прослойка для запроса на удалённый сервер
     */
    refreshToken(refreshToken: RefreshToken, ua: UserAgent, ip: IPAddress): Promise<Tokens | undefined>

    /**
     * Прослойка для запроса на удалённый сервер
     */
    login(code: AuthCode): Promise<Tokens | undefined>

}
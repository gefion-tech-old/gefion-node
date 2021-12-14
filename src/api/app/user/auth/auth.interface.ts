import {
    IPAddress,
    RefreshToken,
    UserAgent,
    AuthCode,
    Tokens,
    AccessToken,
    AuthVerifyPayload
} from './auth.types'

export interface IAuthService {

    /**
     * Провести стандартную проверку и замену refresh токена, а после вернуть
     * новый refresh токен вместе с access токеном. Возвращает undefined, если
     * по какой-либо причине токен не был обновлён
     * 
     * Эталонная реализаций предполагает, что для этого будет вызываться
     * центральный сервис аутентификации
     */
    refreshToken(refreshToken: RefreshToken, ua: UserAgent, ip: IPAddress): Promise<Tokens | undefined>

    /**
     * Аутентификация через центральный сервис аутентификации. По переданному коду получить
     * у сервиса аутентификации уже заранее сгенерированную пару refresh/access токенов
     */
    login(code: AuthCode): Promise<Tokens | undefined>

    /**
     * Проверить актуальность access токена и вернуть его тело в случае, если он
     * актуален
     */
    verify(accessToken: AccessToken): Promise<AuthVerifyPayload | undefined>

}
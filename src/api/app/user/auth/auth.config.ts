import { AuthConfig } from './auth.types'

export async function getAuthConfig(): Promise<AuthConfig> {
    return {
        loginCorrectRedirect: '/',
        loginUncorrectRedirect: '/',
        logoutRedirect: '/',
        secret: 'secret'
    }
}
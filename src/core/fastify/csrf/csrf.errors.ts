export class CSRFError extends Error {}

export class InvalidCsrfToken extends CSRFError {

    public name = 'InvalidCsrfToken'
    public message = 'Недействительный csrf токен'

}
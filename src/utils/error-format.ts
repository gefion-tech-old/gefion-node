import errorToJson from 'error-to-json'

class FormatError extends Error {

    public name = 'FormatError'
    public message = 'Исключение при попытке форматировать ошибку'

    public constructor(
        public exception: any,
        public error: any
    ) {
        super()
    }

}

export function getSerializableErrorFormat(error: any): object {
    try {
        return errorToJson(error)
    } catch(e) {
        return new FormatError(e, error)
    }
}

export function getLoggerErrorFormat(error: any) {
    return {
        error: getSerializableErrorFormat(error)
    }
}
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

/**
 * Получить объект ошибки, который без проблем может быть
 * в корректном формате сериализован в JSON формат
 */
export function getSerializableErrorFormat(error: any): object {
    try {
        return errorToJson(error)
    } catch(e) {
        return new FormatError(e, error)
    }
}

/**
 * Завернуть и сериализовать сырую ошибку в корректном для логгирования
 * формате
 */
export function getLoggerErrorFormat(error: any) {
    return {
        error: getSerializableErrorFormat(error)
    }
}

/**
 * Завернуть и сериализовать сырую ошибку в корректном для http ответа 
 * формате
 */
export function getHttpErrorFormat(error: any) {
    const removeAllStackFields = (object: any) => {
        delete object.stack

        for (const key in object) {
            if (typeof object[key] === 'object') {
                removeAllStackFields(object[key])
            }
        }
    }

    const formattedError = getSerializableErrorFormat(error)
    removeAllStackFields(formattedError)

    return {
        error: formattedError
    }
}
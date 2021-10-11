import got, { Got } from 'got'

export type GotErrorInfo = {
    url: any
    meta: any
    response: any
}

/**
 * Получить стандартный для всего приложения экземпляр got
 */
export function getDefaultGot(): Got {
    return got.extend({
        hooks: {
            beforeError: [
                /**
                 * Прикрепить объект с общей информацией о запросе к объекту ошибки
                 */
                (error: any) => {
                    const info: GotErrorInfo = {
                        url: error?.options?.url?.toString(),
                        meta: error?.options?.context?.meta,
                        response: error?.response?.body
                    }
                    error.info = info
                    return error
                }
            ]
        }
    })
}
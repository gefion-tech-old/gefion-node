/**
 * Список кодов ошибок
 */
export enum SqliteErrorCode {
    SQLITE_CONSTRAINT_PRIMARYKEY = 'SQLITE_CONSTRAINT_PRIMARYKEY',
    SQLITE_CONSTRAINT_UNIQUE = 'SQLITE_CONSTRAINT_UNIQUE',
    SQLITE_CONSTRAINT_FOREIGNKEY = 'SQLITE_CONSTRAINT_FOREIGNKEY',
    SQLITE_CONSTRAINT_TRIGGER = 'SQLITE_CONSTRAINT_TRIGGER',
    SQLITE_CONSTRAINT_NOTNULL = 'SQLITE_CONSTRAINT_NOTNULL'
}

/**
 * Вернуть true, если переданная ошибка является ошибкой sqlite
 * с указанным кодом
 */
export function isErrorCode(error: any, code: SqliteErrorCode): boolean
/**
 * Вернуть true, если ошибка является ошибкой sqlite и её код совпадает
 * хотя бы с одним перечисленным кодом
 */
export function isErrorCode(error: any, code: SqliteErrorCode[]): boolean
export function isErrorCode(error: any, code: SqliteErrorCode | SqliteErrorCode[]): boolean {
    const codes = code instanceof Array ? code : [code]
    return codes.includes(error?.driverError?.code)
}
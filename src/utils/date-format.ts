import format from 'dateformat'

/**
 * Получить дату в формате, который понимает sqlite
 */
export function getSqliteDateFormat(date: Date) {
    return format(date, 'yyyy-mm-dd HH:MM:ss.l', true)
}
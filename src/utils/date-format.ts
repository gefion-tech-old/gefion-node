import format from 'dateformat'

export function getSqliteDateFormat(date: Date) {
    return format(date, 'yyyy-mm-dd HH:MM:ss.l', true)
}
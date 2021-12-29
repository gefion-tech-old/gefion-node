/**
 * Простая функция, которая возвращает переданное значение с указанным типом
 * или с any типом по умолчанию
 */
export function type<T = any>(value: any): T {
    return value
}
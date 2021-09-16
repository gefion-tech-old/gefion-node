/**
 * Все определённые ниже промисы освобождают свои ссылки до выхода
 * из функции запуска скрипта
 */

test.promise1 = new Promise(resolve => {
    resolve(1)
}).then(value => {
    return value
})

test.promise2 = new Promise(() => {
    throw 1
}).catch(reason => {
    throw reason
})
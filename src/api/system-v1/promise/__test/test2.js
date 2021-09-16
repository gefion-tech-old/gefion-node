/**
 * Напрямую регистрирую then. Соответственно, для удержания ссылки для теста нужно
 * два вызова then
 */
test.promise1 = new Promise((resolve) => {
    resolve(1)
}).then(value => {
    return value
}).then(value => {
    return value
})
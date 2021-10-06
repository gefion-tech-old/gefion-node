/**
 * В этом примере catch регистрирует только один then обработчик
 */
test.promise3 = new Promise((resolve) => {
    resolve(1)
}).then(value => {
    return value
}).catch(reason => {
    void reason
})
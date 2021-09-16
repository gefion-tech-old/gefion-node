/**
 * В этом примере finally функция под капотом регистрирует целых три
 * then обработчика
 */
test.promise2 = new Promise(resolve => {
    resolve(1)
}).finally(value => {
    void value
})
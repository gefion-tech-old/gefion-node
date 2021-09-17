// const _Class1 = class {}
// const _Class2 = class extends _Class1 {

//     value = true

//     test() {
//         return this.value
//     }

// }
// const _Class3 = class extends _Class2 {

//     value = 'no'

//     test() {
//         return this.value
//     }

// }
// const Class3 = _Class3



/**
 * Без виртуальной машины возвращает экземпляр _Class2
 */
const result1 = new Class3.prototype.__proto__.constructor()
/**
 * Без вируальной машины возвращает true
 */
const result2 = (() => {
    const instance = new Class3.prototype.__proto__.constructor()

    if (typeof instance?.test === 'function') {
        return instance.test()
    }

    return
})()
/**
 * Без виртуальной машины возвращает true
 */
const result3 = (() => {
    const context = {
        value: true
    }
    const proto = Class3.prototype.__proto__

    if (typeof proto?.test === 'function') {
        return proto.test.call(context)
    }
    
    return
})()



messages.result1 = result1
messages.result2 = result2
messages.result3 = result3
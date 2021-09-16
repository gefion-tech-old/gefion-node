const bufferSize = 30 * 1024 * 1024
const buffer = Buffer.allocUnsafe(bufferSize)

const promise1 = new Promise(resolve => {
    void buffer
    resolve(1)
})

const promise2 = new Promise(resolve => {
    void buffer
    resolve(1)
})

const promise3 = new Promise(resolve => {
    void buffer
    resolve(1)
})

const promiseAll = Promise.all([
    promise1, promise2, promise3
]).then(values => {
    void buffer
    return values.reduce((prevValue, currentValue) => {
        return prevValue ? prevValue + currentValue : currentValue
    }, undefined)
}).then(value => {
    void buffer
    return value + 2
})
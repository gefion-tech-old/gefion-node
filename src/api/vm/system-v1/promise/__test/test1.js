test.promise1 = new Promise((resolve) => {
    resolve(1)
})
test.promise2 = new Promise((resolve) => {
    resolve(2)
})
test.promise3 = new Promise((resolve) => {
    resolve(3)
})
test.promise4 = new Promise((resolve) => {
    resolve(4)
})

test.promise5 = new Promise((_, reject) => {
    reject(5)
})
test.promise6 = new Promise(() => {
    throw 6
})

test.promise7 = Promise.all([
    test.promise1,
    test.promise2,
    test.promise3,
    test.promise4
])
test.promise8 = Promise.all([
    test.promise1,
    test.promise6
])

test.promise9 = Promise.allSettled([
    test.promise1,
    test.promise2,
    test.promise3,
    test.promise4,
    test.promise5,
    test.promise6
]).then(values => {
    return values.map(value => value.value ?? value.reason)
})

test.promise10 = Promise.race([
    test.promise1,
    test.promise6
])

test.promise11 = Promise.resolve(11)
test.promise12 = Promise.reject(12)

test.promise13 = test.promise1.then(value => {
    return {
        method: 'then',
        value: value
    }
})

test.promise14 = new Promise((resolve) => {
    resolve(14)
}).then(value => {
    throw value
})
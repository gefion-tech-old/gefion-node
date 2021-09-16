test.promise1 = new Promise(resolve => {
    resolve(1)
}).then({})

test.promise2 = new Promise(() => {
    throw 1
}).catch({})
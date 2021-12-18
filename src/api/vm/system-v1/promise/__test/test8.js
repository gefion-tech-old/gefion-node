new Promise((resolve) => {
    resolve(1)
}).then(() => {
    throw new test.MyError
})

new Promise(() => {
    throw new test.MyError
})
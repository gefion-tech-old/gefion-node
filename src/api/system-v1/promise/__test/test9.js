const resolves = []
test.main = function() {
    new Promise((resolve) => {
        resolves.push(resolve)
    }).then()
    new Promise(resolve => {
        resolves.push(resolve)
    }).then(() => {})
    new Promise(resolve => {
        resolves.push(resolve)
    }).then(() => {}, () => {})
    new Promise(resolve => {
        resolves.push(resolve)
    }).catch(() => {})
    new Promise(resolve => {
        resolves.push(resolve)
    }).finally()
    Promise.all([
        new Promise(resolve => {
            resolves.push(resolve)
        }),
        new Promise(resolve => {
            resolves.push(resolve)
        })
    ]).then(() => {})

    resolves.forEach(resolve => resolve())
}

new Promise(resolve => {
    resolves.push(resolve)
}).then(() => {})
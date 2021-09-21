const resolves = []

test.main = function() {
    resolves.forEach(resolve => {
        resolve(1)
    })
}

new Promise((_, reject) => {
    resolves.push(reject)
})
test.main = function() {
    setTimeout(() => {}, 100)

    setTimeout((error) => {
        throw error
    }, null, test.error)

    const timeoutId = setTimeout(() => {}, 1000)
    clearTimeout(timeoutId)
}

setTimeout(() => {})
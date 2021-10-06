test.main = function() {
    setImmediate(() => {})

    setImmediate((error) => {
        throw error
    }, test.error)

    const immediateId = setImmediate(() => {})
    clearImmediate(immediateId)
}

setImmediate(() => {})
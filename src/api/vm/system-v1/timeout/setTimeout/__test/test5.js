const bufferSize = 30 * 1024 * 1024
const buffer = Buffer.allocUnsafe(bufferSize)

setTimeout(() => {
    void buffer
    test.timeoutFn()
}, 50)
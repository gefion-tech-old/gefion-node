let intervalId
let count = 0

intervalId = setInterval(() => {
    count++
    test.intervalFn()

    if (count >= 3) {
        clearInterval(intervalId)
    }
}, 100)
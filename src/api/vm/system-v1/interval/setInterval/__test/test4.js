let intervalId

intervalId = setInterval(() => {
    clearInterval(intervalId)
    test.intervalFn()
})
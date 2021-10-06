test.main = function() {
    let interval1, interval2, interval3

    interval1 = setInterval(() => {
        clearInterval(interval1)
    })
    interval2 = setInterval(() => {}, 1000)
    interval3 = setInterval((error) => {
        clearInterval(interval3)
        throw error
    }, null, test.error)

    clearInterval(interval2)    
}

let intervalId
intervalId = setInterval(() => {
    clearInterval(intervalId)
})
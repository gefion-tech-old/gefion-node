const timerId1 = setTimeout(test.timeoutFn)
const timerId2 = setTimeout(test.timeoutFn, 50)

clearTimeout(timerId1)
clearTimeout(timerId2)
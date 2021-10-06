const immediateId = setImmediate(test.immediateFn)

clearImmediate(immediateId)

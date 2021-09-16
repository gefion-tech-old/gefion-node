/**
 * Сохраняю оригинальный объект процесса перед запуском jest, чтобы
 * на него можно было навесить событие unhandledRejection. Это событие
 * необходимо для тестов
 */
process._original = (function (_original) {
    return function () {
        return _original
    }
})(process)

const config = {
    verbose: true,
    testEnvironment: 'node'
}

module.exports = config
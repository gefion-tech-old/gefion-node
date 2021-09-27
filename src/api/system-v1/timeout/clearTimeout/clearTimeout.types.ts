export const ClearTimeoutName = 'clearTimeout'

export type ClearTimeoutEventInfo = {
    readonly scriptId: symbol
    readonly timeoutId: symbol
}
import { injectable } from 'inversify'
import { ISignalService } from '../signal.interface'
import { Method } from '../../method/method.types'
import { 
    Signal, 
    SignalMetadata,
    CreateSignal,
    EventContext
} from '../signal.type'

export function getSignalService(mock: ISignalService): new() => ISignalService {
    @injectable()
    class SignalService implements ISignalService {

        createIfNotCreated(options: CreateSignal, nestedTransaction?: boolean): Promise<void> {
            return mock.createIfNotCreated(options, nestedTransaction)
        }

        isExists(signal: Signal): Promise<boolean> {
            return mock.isExists(signal)
        }

        getSignalId(signal: Signal): Promise<number | undefined> {
            return mock.getSignalId(signal)
        }

        getMetadata(signal: Signal): Promise<SignalMetadata | undefined> {
            return mock.getMetadata(signal)
        }
    
        setCustomMetadata(signal: Signal, customMetadata: any, nestedTransaction?: boolean): Promise<void> {
            return mock.setCustomMetadata(signal, customMetadata, nestedTransaction)
        }
    
        addValidator(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void> {
            return mock.addValidator(signal, method, nestedTransaction)
        }
    
        removeValidator(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void> {
            return mock.removeValidator(signal, method, nestedTransaction)
        }
    
        addGuard(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void> {
            return mock.addGuard(signal, method, nestedTransaction)
        }
    
        removeGuard(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void> {
            return mock.removeGuard(signal, method, nestedTransaction)
        }
    
        addFilter(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void> {
            return mock.addFilter(signal, method, nestedTransaction)
        }
    
        removeFilter(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void> {
            return mock.removeFilter(signal, method, nestedTransaction)
        }
    
        connect(outSignal: Signal, intoSignal: Signal, nestedTransaction?: boolean): Promise<void> {
            return mock.connect(outSignal, intoSignal, nestedTransaction)
        }
    
        unconnect(outSignal: Signal, intoSignal: Signal, nestedTransaction?: boolean): Promise<void> {
            return mock.unconnect(outSignal, intoSignal, nestedTransaction)
        }
    
        remove(signal: Signal, nestedTransaction?: boolean): Promise<void> {
            return mock.remove(signal, nestedTransaction)
        }
    
        onSignalMutation(handler: (context: EventContext) => void): void {
            return mock.onSignalMutation(handler)
        }

    }

    return SignalService
}
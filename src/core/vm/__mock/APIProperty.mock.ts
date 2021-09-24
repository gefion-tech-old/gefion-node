import { APIProperty } from '../api-property/api-property.classes'
import { EventEmitters } from '../api-property/api-property.types'

export function getAPIProperty(mock: {
    init: (events: EventEmitters, scriptId: symbol) => Object
    linkCollector: (events: EventEmitters) => void
    hasLink: (events: EventEmitters, scriptId: symbol) => boolean
}): APIProperty {
    return new class extends APIProperty {
        public async init(scriptId: symbol): Promise<Object> {
            return mock.init(this.events, scriptId)
        }

        public linkCollector(): void {
            mock.linkCollector(this.events)
        }

        public hasLink(scriptId: symbol): boolean {
            return mock.hasLink(this.events, scriptId)
        }
    }
}
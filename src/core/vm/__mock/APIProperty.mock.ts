import { APIProperty } from '../api-property/api-property.classes'
import { EventEmitters } from '../api-property/api-property.types'

export function getAPIProperty(mock: {
    init: (events: EventEmitters) => Object
    linkCollector: (events: EventEmitters) => void
    hasLink: (events: EventEmitters) => boolean
}): APIProperty {
    return new class extends APIProperty {
        public async init(): Promise<Object> {
            return mock.init(this.events)
        }

        public linkCollector(): void {
            mock.linkCollector(this.events)
        }

        public hasLink(): boolean {
            return mock.hasLink(this.events)
        }
    }
}
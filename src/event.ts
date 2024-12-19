export default class Event {
    private list: any;

    constructor() {
        this.list = {};
    }

    on(type: string, cb?: Function) {
        if (!this.list[type]) {
            this.list[type] = [];
        }
        this.list[type].push(cb)
    }

    emit(type: string, ...op: any) {
        if (Array.isArray(this.list[type])) {
            this.list[type].forEach((i: any) => {
                i(...op)
            })
        }
    }

    remove(type: string, cb?: Function) {
        if (this.list[type]) {
            this.list[type] = this.list[type].filter((i: any) => i !== cb)
        }
    }
}


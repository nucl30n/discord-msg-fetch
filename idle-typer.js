class DiscordTyper {

    constructor() {
        this.auth = "";
        this.interval = 0;
        this.timeOutMute = false;
        this.targetChan = "";
        this.proceed = true;
    }

    get headers() {
        return {
            "Authorization": this.auth,
            "Content-Type": "application/json"
        };
    }

    get date() {
        return new Date().toLocaleString();
    }

    get typingUri() {
        return `https://discord.com/api/v9/channels/${this.targetChan}/typing`;
    }

    get randInterval() {
        let r = Math.floor(this.interval * (0.5 + Math.random()));
        console.log(r);
        return r;
    }

    throwError(message) {
        throw new Error(message);
    };

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async console(mode, message) {
        message = `[${this.date}] ${this.guildName} - ${message}`;
        switch (mode) {
            case "warn": console.warn(message); break;
            case "error": console.error(message); break;
            case "log":
            default: console.log(message); break;
        }
    }

    async rename() {
        this.console("log", `renamed to ${this.setName}; renaming`);
        return fetch(this.guildUri + "@me", {
            method: "PATCH",
            headers: this.headers,
            body: JSON.stringify({ nick: this.intendedName })
        })
            .then(r => r.ok ? r : Promise.reject(r))
            .catch(err => this.fetchErr(err));
    }

    async haltAndDelay(ms, reason) {
        this.console("warn", `${reason}; halting for ${ms}ms`);
        this.proceed = false;
        this.interval = ms;
        setTimeout(
            () => {
                this.proceed = true;
                this.interval = 1000;
            }, ms
        );

    }

    async doTyping() {
        return fetch(this.typingUri, {
            method: "POST",
            headers: this.headers

        })
            .then(r => r.ok ? r : Promise.reject(r))
            .catch(err => this.throwError(err));
    }

    async fetchErr(response) {
        let delay = ((code) => {
            switch (code) {
                case 429:
                case 500: return 5000;
                case 403: return 10000;
                case 401:
                default: return 5000;
            }
        })(response.status);
        return this.haltAndDelay(delay, response.statusText);
    }

    async loop() {
        console.log(this.typingUri);
        this.doTyping()

            //  .then(() => this.timeOutMute && this.haltAndDelay(6000, "Muted"))
            .then(() => this.delay(this.randInterval))
            .then(() => this.loop())
            .catch(err => this.throwError(err));
    }

    async checkConfig() {
        const invalidFields = [];
        for (let field of [this.targetChan, this.auth]) {
            (field == "" || field == null || field == 0)
                && invalidFields.push(field);
        }
        invalidFields.length > 0
            && this.throwError(`Invalid cfg; missing: ${invalidFields.join(", ")}`);
    }

    async start(cfg) {
        Object.assign(this, cfg);
        this.checkConfig()
            .then(() => this.interval = this.interval || 8500)
            .then(() => this.loop()
            )
            .catch(err => this.throwError(err));
    }
}
///
(async (f, cfgs) => {
    cfgs = await Deno.readTextFile(f)
        .then(t => JSON.parse(t));

    for (let cfg of cfgs) {
        new DiscordTyper().start(cfg);
    }
})("typer.json", []);

///

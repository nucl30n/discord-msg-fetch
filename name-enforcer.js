class DiscordRenamer {

    constructor(cfg) {
        this.intendedName = "";
        this.userId = "";
        this.auth = "";
        this.guild = "";
        this.guildName = "";
        this.interval = 0;
        this.timeOutMute = false;
        this.setName = "";
        this.cfg = cfg;
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

    get guildUri() {
        return `https://discord.com/api/v9/guilds/${this.guild}/members/`;
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

    async checkStatus() {
        return fetch(this.guildUri + this.userId, {
            method: "GET",
            headers: this.headers
        })
            .then(r => r.ok ? r.json() : Promise.reject(r))
            .then(o => {
                this.setName = o.nick;
                this.timeOutMute = new Date(o.communication_disabled_until ?? Date.now()).getTime() > new Date().getTime();
            })
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
        this.checkStatus()
            .then(() => (this.setName != this.intendedName) && this.rename())
            .then(() => this.timeOutMute && this.haltAndDelay(6000, "Muted"))
            .then(() => this.delay(Math.max(this.interval, 1000)))
            .then(() => this.loop())
            .catch(err => this.throwError(err));
    }

    async checkConfig() {
        const invalidFields = [];
        for (let field of [this.intendedName, this.userId, this.auth, this.guild]) {
            (field == "" || field == null || field == 0)
                && invalidFields.push(field);
        }
        invalidFields.length > 0
            && this.throwError(`Invalid cfg; missing: ${invalidFields.join(", ")}`);
    }

    async start(cfg) {
        Object.assign(this, cfg);
        this.checkConfig()
            .then(() =>
                fetch(`https://discord.com/api/v9/guilds/${this.guild}`, {
                    method: "GET",
                    headers: this.headers
                }))
            .then(r => r.ok ? r.json() : Promise.reject(r))
            .then(data => this.guildName = data.name)
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
        new DiscordRenamer().start(cfg);
    }
})("name-enforcer.json", []);

///

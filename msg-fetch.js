import { red, green, yellow, bold, cyan } from "https://deno.land/std@0.221.0/fmt/colors.ts";

class MessageFetcher {
    constructor() {
        this.throttleTime = 500;
        this.offset = 0;
        this.targetId = "";
        this.guildId = "";
        this.token = "";
        this.domain = "";
        this.output = [];
    }

    async delay(ms = this.throttleTime) {
        console.log(`Waiting ${ms}ms`);
        return new Promise(res => setTimeout(res, ms));
    }

    async responseHandler(res, func, args) {
        const json = await res.json().catch(() => ({}));

        switch (res.status) {
            case 200:
                this.throttleTime = Math.max(this.throttleTime - 25, 600);
                return json;
            case 404:
                console.log(yellow("not found"));
                return json;
            case 429:
                console.log(red("rate limited"));
                this.throttleTime = Math.ceil((json.retry_after || 1) * 1000) + this.throttleTime;
                return this.delay().then(() => func(...args));
            default:
                console.log(red(`unhandled: ${res.status}`));
                return this.delay().then(() => func(...args));
        }
    }

    async fetchMessages() {
        console.log(cyan("searching"));
        let total = Infinity;

        const fetchPage = () =>
            fetch(
                `${this.domain}/api/v9/guilds/${this.guildId}/messages/search?author_id=${this.targetId}&include_nsfw=true&offset=${this.offset}`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": this.token,
                        "Content-Type": "application/json"
                    }
                }
            );

        while (this.offset < total) {
            await fetchPage()
                .then(res => this.responseHandler(res, fetchPage.bind(this), []))
                .then(data => data ?? {})
                .then(data => typeof data.messages === "object" ? data : { messages: [] })
                .then(data => {
                    total = typeof data.total_results === "number" ? data.total_results : total;
                    this.offset += 25;

                    for (const msgGroup of data.messages) {
                        if (msgGroup?.[0]) {
                            this.output.push(msgGroup[0]);
                        }
                    }

                    console.log(`collected ${data.messages.length} groups (total: ${this.output.length})`);
                })
                .then(() => this.delay());
        }
    }

    async run({ targetId, guildId, token, domain }) {
        this.targetId = targetId;
        this.guildId = guildId;
        this.token = token;
        this.domain = domain;

        await this.fetchMessages();
        await this.writeOutput();
        console.log(bold(green("done")));
    }

    async writeOutput() {
        const filename = `messages-${this.guildId}-${this.targetId}.json`;
        await Deno.writeTextFile(filename, JSON.stringify(this.output, null, 2));
        console.log(green(`Messages written to ${filename}`));
    }
}

/// Entry
(async (f, cfgs) => {
    cfgs = await Deno.readTextFile(f)
        .then(t => JSON.parse(t))
        .catch(e => {
            console.error(red(`Error reading config: ${e}`));
            return [];
        });

    for (let cfg of cfgs) {
        await new MessageFetcher().run(cfg);
    }
})("config.json", []);

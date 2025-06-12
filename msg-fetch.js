import { red, green, bold, cyan } from "https://deno.land/std@0.221.0/fmt/colors.ts";

class FetchChannel {
    constructor() {
        this.token = "";
        this.channelId = "";
        this.domain = "";
        this.limit = 100;
        this.output = {};
        this.throttleTime = 750;
        this.authors = {};
    }

    async delay(ms = this.throttleTime) {
        return new Promise(res => setTimeout(res, ms));
    }

    extractMessageData(msg) {
        msg.author && (this.authors[msg.author.id] = {
            username: msg.author.username
        });
        return {
            timestamp: msg.timestamp ? Math.floor(new Date(msg.timestamp).getTime() / 1000) : undefined,
            content: msg.content,
            author: msg.author?.id,
            referenced: msg.referenced_message?.id
        };
    }

    async fetchPage(remaining, before) {
        return fetch(
            `${this.domain}/api/v10/channels/${this.channelId}/messages?limit=${Math.min(100, remaining)}${before ? `&before=${before}` : ""}`,
            {
                headers: {
                    "Authorization": this.token,
                    "Content-Type": "application/json"
                }
            }
        );
    }

    async fetchMessages() {
        console.log(cyan(`Fetching up to ${this.limit} messages from ${this.channelId}`));
        let remaining = this.limit;
        let before = null;

        while (remaining > 0) {
            await this.fetchPage(remaining, before)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then(messages => {
                    if (!Array.isArray(messages) || messages.length === 0) return;
                    for (const msg of messages) {
                        const data = this.extractMessageData(msg);
                        this.output[msg.id] = data;
                    }
                    remaining -= messages.length;
                    before = messages[messages.length - 1].id;
                    console.log(`Fetched ${messages.length}, total: ${Object.keys(this.output).length}`);
                })
                .catch(err => {
                    console.error(red(`Error fetching messages: ${err.status ?? err}`));
                    return this.delay(3000);
                });

            await this.delay();
        }
    }

    async writeOutput() {
        const filename = `saved/channel-${this.channelId}-timestamp-${Date.now()}.json`;
        const result = {
            authors: this.authors,
            messages: this.output,
        };
        await Deno.writeTextFile(filename, JSON.stringify(result, null, 2));
        console.log(green(`Saved ${Object.keys(this.output).length} messages to ${filename}`));
    }

    async run({ token, channelId, domain, limit }) {
        this.token = token;
        this.channelId = channelId;
        this.domain = domain;
        this.limit = limit;

        await this.fetchMessages();
        await this.writeOutput();
        console.log(bold(green("done")));
    }
}

(async (f, cfgs) => {
    cfgs = await Deno.readTextFile(f)
        .then(t => JSON.parse(t))
        .catch(e => {
            console.error(red(`Error reading config: ${e}`));
            return [];
        });

    for (const cfg of cfgs) {
        await new FetchChannel().run(cfg);
    }
})("msg-fetch.json", []);

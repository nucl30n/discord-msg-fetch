import { red, green, bold, cyan } from "https://deno.land/std@0.221.0/fmt/colors.ts";

interface DiscordAuthor {
    id: string;
    username: string;
    global_name?: string;
}

interface DiscordMessage {
    id: string;
    timestamp: string;
    content: string;
    author: DiscordAuthor;
    referenced_message?: DiscordMessage;
}

interface MessageData {
    timestamp: number | undefined;
    content: string;
    author: string | undefined;
    referenced: string | undefined;
}

interface AuthorMap {
    [id: string]: string;
}

interface MessageMap {
    [id: string]: MessageData;
}

interface FetchConfig {
    token: string;
    channelId: string;
    domain: string;
    limit: number;
}

class FetchChannel {
    token: string;
    channelId: string;
    domain: string;
    limit: number;
    output: MessageMap;
    throttleTime: number;
    authors: AuthorMap;

    constructor() {
        this.token = "";
        this.channelId = "";
        this.domain = "";
        this.limit = 100;
        this.output = {};
        this.throttleTime = 750;
        this.authors = {};
    }

    async delay(ms: number = this.throttleTime): Promise<void> {
        return new Promise(res => setTimeout(res, ms));
    }

    extractMessageData(msg: DiscordMessage): MessageData {
        this.authors[msg.author.id] = msg.author.username ?? "";
        msg.referenced_message?.author
            && (this.authors[msg.referenced_message.author.id] = msg.referenced_message.author.username ?? "");


        return {
            timestamp: msg.timestamp ? Math.floor(new Date(msg.timestamp).getTime() / 1000) : undefined,
            content: msg.content,
            author: msg.author?.id,
            referenced: msg.referenced_message?.id
        };
    }

    async fetchPage(remaining: number, before: string | null): Promise<Response> {
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

    async fetchMessages(): Promise<void> {
        console.log(cyan(`Fetching up to ${this.limit} messages from ${this.channelId}`));
        let remaining = this.limit;
        let before;
        while (remaining > 0) {
            await this.fetchPage(remaining, before ?? null)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((messages: DiscordMessage[]) => {
                    for (const msg of (!Array.isArray(messages) ? [] : messages)) {
                        this.output[msg.id] = this.extractMessageData(msg);
                    }
                    remaining -= messages.length;
                    before = messages[messages.length - 1].id;
                    console.log(`Fetched ${messages.length}, total: ${Object.keys(this.output).length}`);
                })
                .catch((err: any) => {
                    console.error(red(`Error fetching messages: ${err.status ?? err}`));
                    return this.delay(3000);
                });

            await this.delay();
        }
    }

    async writeOutput(): Promise<void> {
        const filename = `store/channel-${this.channelId}-timestamp-${Date.now()}.json`;
        const result = {
            authors: this.authors,
            messages: this.output,
        };
        await Deno.writeTextFile(filename, JSON.stringify(result, null, 2));
        console.log(green(`Saved ${Object.keys(this.output).length} messages to ${filename}`));
    }

    async run(config: FetchConfig): Promise<void> {
        this.token = config.token;
        this.channelId = config.channelId;
        this.domain = config.domain;
        this.limit = config.limit;

        await this.fetchMessages();
        await this.writeOutput();
        console.log(bold(green("done")));
    }
}



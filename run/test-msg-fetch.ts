import { FetchChannel, FetchConfig, colors } from "./msg-fetch.ts";

import { readTextFile } from "https://deno.land/std@0.221.0/fs/mod.ts";


(async (file: string, cfgs: FetchConfig[]) => {
    cfgs = await Deno.readTextFile(file)
        .then(t => JSON.parse(t) as FetchConfig[])
        .catch(e => {
            console.error(colors.red(`Error reading cfg: ${e}`));
            return [];
        });

    for (const cfg of cfgs) {
        await new FetchChannel().run(cfg);
    }
})("msg-fetch.json", []);
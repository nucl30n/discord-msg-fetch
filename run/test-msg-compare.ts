import { MsgMatcher } from "../msg-compare.ts";

const logs = {
    wanted: {
        "63243243243243": "username:mike3434, id: 345435345, reason:hacking",
        "63243265563243": "username:andyroblox43433, id: 457645632, reason:scammer 3x"
    },
    ban: {
        "63243243243243": "user:mike3434, robloxID: 345435345, hacking",
        "645345435344534": "andyroblox43433/457645632, scammed 3x"
    }
};

const matcher = new MsgMatcher(logs, { threshold: 0.6 });
matcher.run();


// deno run --allow-read --allow-net msg-fetch/run/test-msg-compare.ts

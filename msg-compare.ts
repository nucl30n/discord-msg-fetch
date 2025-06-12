import { red, green, bold, cyan, rgb24, rgb8, gray, yellow, magenta, white, brightYellow } from "https://deno.land/std@0.221.0/fmt/colors.ts";

export {
    MsgMatcher,
    LogMap,
    MatchResult,
    MatchConfig
};

type LogMap = Record<string, string>;
type MatchResult = {
    idA: string;
    msgA: string;
    idB: string;
    msgB: string;
    score: number;
};

interface MatchConfig {
    threshold?: number;
}

class MsgMatcher {
    logA: LogMap;
    logB: LogMap;
    threshold: number;
    matches: MatchResult[];
    nameA: string;
    nameB: string;

    static LABEL_REGEX = /\b(id|robloxid|user(name)?|reason)\b\s*[:]?/gi;

    constructor(logs: Record<string, LogMap>, cfg?: { threshold?: number; }) {
        const keys = Object.keys(logs);
        if (keys.length < 2) throw new Error("logs object must have two keys");
        this.nameA = keys[0];
        this.nameB = keys[1];
        this.logA = logs[this.nameA];
        this.logB = logs[this.nameB];
        this.threshold = cfg?.threshold ?? 0.6;
        this.matches = [];
    }

    static normTokens = (s: string) =>
        s.replace(MsgMatcher.LABEL_REGEX, " ")
            .replace(/[\/,:\n]+/g, " ")
            .replace(/\s+/g, " ")
            .toLowerCase()
            .trim()
            .split(" ")
            .filter(Boolean);

    static leven = (a: string, b: string) => {
        const d = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++) d[i][0] = i;
        for (let j = 0; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++)
            for (let j = 1; j <= b.length; j++)
                d[i][j] = a[i - 1] === b[j - 1]
                    ? d[i - 1][j - 1]
                    : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
        return d[a.length][b.length];
    };

    static levenSim = (a: string, b: string) => {
        const dist = MsgMatcher.leven(a, b), m = Math.max(a.length, b.length);
        return m ? 1 - dist / m : 1;
    };

    static fuzzyInter = (A: string[], B: string[]) =>
        A.filter(a => B.some(b => a === b || MsgMatcher.levenSim(a, b) > 0.8)).length;

    static jaccard = (a: string[], b: string[]) => {
        const inter = MsgMatcher.fuzzyInter(a, b);
        const uni = new Set([...a, ...b]).size;
        return uni ? inter / uni : 1;
    };

    match = (): MatchResult[] => {
        const out: MatchResult[] = [];
        for (const [idA, msgA] of Object.entries(this.logA)) {
            const a = MsgMatcher.normTokens(msgA);
            let best: MatchResult | null = null;
            for (const [idB, msgB] of Object.entries(this.logB)) {
                const b = MsgMatcher.normTokens(msgB);
                const score = (a.length === 1 && b.length === 1)
                    ? MsgMatcher.levenSim(a[0], b[0])
                    : MsgMatcher.jaccard(a, b);
                best = !best || score > best.score ? { idA, msgA, idB, msgB, score } : best;
            }
            best && best.score >= this.threshold && out.push(best);
        }
        return this.matches = out;
    };

    printMatches = (): void => {
        !this.matches.length && this.match();
        console.log(brightYellow(`\nFound ${this.matches.length} matches:\n`));

        for (const m of this.matches) {
            const lineA = `${yellow(`${this.nameA}:`)} ${gray(m.idA)}: ${bold(m.msgA)}`;

            const lineB = `${yellow(`${this.nameB}:`)} ${gray(m.idB)}: ${bold(m.msgB)}`;

            const matchScore = magenta(`-----------match ${bold(m.score.toFixed(2))}-----------`);
            console.log(`${lineA}\n   ${matchScore}\n${lineB}\n${"-".repeat(80)}`);
        }
    };

    run = (): void => (this.match(), this.printMatches());
}

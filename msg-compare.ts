import { red, green, bold, cyan } from "https://deno.land/std@0.221.0/fmt/colors.ts";

type LogMap = Record<string, string>;
type MatchResult = {
    idA: string;
    msgA: string;
    idB: string;
    msgB: string;
    score: number;
};

const LABEL_REGEX = /\b(id|robloxid|user(name)?|reason)\b\s*[:]?/gi;

const normTokens = (s: string) =>
    s.replace(LABEL_REGEX, " ")
        .replace(/[\/,:\n]+/g, " ") // treat delimiters as boundaries always
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim()
        .split(" ")
        .filter(Boolean);



const leven = (a: string, b: string) => {
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

const levenSim = (a: string, b: string) => {
    const dist = leven(a, b), m = Math.max(a.length, b.length);
    return m ? 1 - dist / m : 1;
};

const fuzzyInter = (A: string[], B: string[]) =>
    A.filter(a => B.some(b => a === b || levenSim(a, b) > 0.8)).length;

const jaccard = (a: string[], b: string[]) => {
    const inter = fuzzyInter(a, b);
    const uni = new Set([...a, ...b]).size;
    return uni ? inter / uni : 1;
};

const match = (logA: LogMap, logB: LogMap, threshold = 0.6): MatchResult[] => {
    const out: MatchResult[] = [];
    for (const [idA, msgA] of Object.entries(logA)) {
        const a = normTokens(msgA);
        let best: MatchResult | null = null;
        for (const [idB, msgB] of Object.entries(logB)) {
            const b = normTokens(msgB);
            const score = (a.length === 1 && b.length === 1)
                ? levenSim(a[0], b[0])
                : jaccard(a, b);
            if (!best || score > best.score) {
                best = { idA, msgA, idB, msgB, score };
            }
        }
        if (best && best.score >= threshold) out.push(best);
    }
    return out;
};

// ---- EXAMPLE USAGE ----

const logA = {
    "63243243243243": "username:mike3434, id: 345435345, reason:hacking",
    "63243265563243": "username:andyroblox43433, id: 457645632, reason:scammer 3x"
};

const logB = {
    "63243243243243": "user:mike3434, robloxID: 345435345, hacking",
    "645345435344534": "andyroblox43433/457645632, scammed 3x"
};

const matches = match(logA, logB, 0.6);

console.log(green(`\nFound ${matches.length} matches:\n`));
for (const m of matches) {
    const lineA = `${cyan("logA:")} ${cyan(m.idA)}: ${bold(m.msgA)}`;
    const lineB = `${cyan("logB:")} ${cyan(m.idB)}: ${bold(m.msgB)}`;
    const scoreColor =
        m.score > 0.95 ? green : m.score > 0.6 ? cyan : red;
    const matchScore = scoreColor(`<--match ${bold(m.score.toFixed(2))}-->`);
    console.log(`${lineA}\n   ${matchScore}\n${lineB}\n${"-".repeat(80)}`);
}

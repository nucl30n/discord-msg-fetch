import { red, green, bold, cyan } from "https://deno.land/std@0.221.0/fmt/colors.ts";

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

    static LABEL_REGEX = /\b(id|robloxid|user(name)?|reason)\b\s*[:]?/gi;

    constructor(logA: LogMap = {}, logB: LogMap = {}, cfg?: MatchConfig) {
        this.logA = logA;
        this.logB = logB;
        this.threshold = cfg?.threshold ?? 0.6;
        this.matches = [];
    }

    static normTokens(s: string): string[] {
        return s.replace(FuzzyLogMatcher.LABEL_REGEX, " ")
            .replace(/[\/,:\n]+/g, " ")
            .replace(/\s+/g, " ")
            .toLowerCase()
            .trim()
            .split(" ")
            .filter(Boolean);
    }

    static leven(a: string, b: string): number {
        const d = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++) d[i][0] = i;
        for (let j = 0; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++)
            for (let j = 1; j <= b.length; j++)
                d[i][j] = a[i - 1] === b[j - 1]
                    ? d[i - 1][j - 1]
                    : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
        return d[a.length][b.length];
    }

    static levenSim(a: string, b: string): number {
        const dist = FuzzyLogMatcher.leven(a, b), m = Math.max(a.length, b.length);
        return m ? 1 - dist / m : 1;
    }

    static fuzzyInter(A: string[], B: string[]): number {
        return A.filter(a => B.some(b => a === b || FuzzyLogMatcher.levenSim(a, b) > 0.8)).length;
    }

    static jaccard(a: string[], b: string[]): number {
        const inter = FuzzyLogMatcher.fuzzyInter(a, b);
        const uni = new Set([...a, ...b]).size;
        return uni ? inter / uni : 1;
    }

    match(): MatchResult[] {
        const out: MatchResult[] = [];
        for (const [idA, msgA] of Object.entries(this.logA)) {
            const a = FuzzyLogMatcher.normTokens(msgA);
            let best: MatchResult | null = null;
            for (const [idB, msgB] of Object.entries(this.logB)) {
                const b = FuzzyLogMatcher.normTokens(msgB);
                const score = (a.length === 1 && b.length === 1)
                    ? FuzzyLogMatcher.levenSim(a[0], b[0])
                    : FuzzyLogMatcher.jaccard(a, b);
                if (!best || score > best.score) {
                    best = { idA, msgA, idB, msgB, score };
                }
            }
            if (best && best.score >= this.threshold) out.push(best);
        }
        this.matches = out;
        return out;
    }

    printMatches(): void {
        if (!this.matches.length) this.match();
        console.log(green(`\nFound ${this.matches.length} matches:\n`));
        for (const m of this.matches) {
            const lineA = `${cyan("logA:")} ${cyan(m.idA)}: ${bold(m.msgA)}`;
            const lineB = `${cyan("logB:")} ${cyan(m.idB)}: ${bold(m.msgB)}`;
            const scoreColor =
                m.score > 0.95 ? green : m.score > 0.6 ? cyan : red;
            const matchScore = scoreColor(`<--match ${bold(m.score.toFixed(2))}-->`);
            console.log(`${lineA}\n   ${matchScore}\n${lineB}\n${"-".repeat(80)}`);
        }
    }

    run(): void {
        this.match();
        this.printMatches();
    }
}


import { dirname, join } from "path";
import { ParseConfig, Parser } from "../src/parser";
import { Builder } from "../src/build";
import { writeFile } from "fs/promises";


const here = dirname(__filename);
export async function compareParsedAndBuilt(confDirname: string, confBaseName: string, tmpdir: string, parseConfig?: Partial<ParseConfig>) {

    const originalDirname = join(here, 'configs', confDirname);
    const originPath = join(originalDirname, confBaseName);
    const originalPayload = await new Parser({
        ...parseConfig,
        filename: originPath
    }).parse();
    const originalParsed = originalPayload.config[0].parsed;

    const build1Config = new Builder().build(originalParsed);
    const build1File = join(tmpdir, 'build1.conf');
    await writeFile(build1File, build1Config);
    const build1Payload = await new Parser({
        ...parseConfig,
        filename: build1File
    }).parse();
    const build1Parsed = build1Payload.config[0].parsed;


    assertEqualPayloads(originalParsed, build1Parsed, ['line']);

    const build2Config = new Builder().build(build1Parsed);
    const build2File = join(tmpdir, 'build2.conf');
    await writeFile(build2File, build2Config);
    const build2Payload = await new Parser({
        ...parseConfig,
        filename: build2File
    }).parse();
    const build2Parsed = build2Payload.config[0].parsed;

    expect(build1Config).toBe(build2Config);
    assertEqualPayloads(build1Parsed, build2Parsed)
}

function assertEqualPayloads(a: any, b: any, ignoreKeys: string[] = []) {
    expect(typeof a).toBe(typeof b);
    if (Array.isArray(a)) {
        expect(a.length).toBe(b.length);
        for (let i = 0; i < a.length; i++) {
            assertEqualPayloads(a[i], b[i], ignoreKeys);
        }
    } else if (typeof a === 'object') {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        expect(aKeys.length).toBe(bKeys.length);
        for (const key of aKeys) {
            if (ignoreKeys.includes(key)) {
                continue;
            }
            assertEqualPayloads(a[key], b[key], ignoreKeys);
        }
    } else if (typeof a === 'string') {
        expect(a).toBe(b);
    } else {
        expect(a).toEqual(b);
    }
}

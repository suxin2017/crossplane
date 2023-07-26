import { analyze, enterBlockCtx } from "./analyzer";
import { NgxParserBaseException } from "./errors";
import { FileInput, Lexer, Token } from "./lexer";
import path from 'path'
import { glob, hasMagic } from 'glob'
import fs from 'fs';

interface ParseConfig {
    filename: string;
    onError: (error: Error) => void;
    catchErrors: boolean;
    ignore: string[];
    single: boolean;
    comments: boolean;
    strict: boolean;
    combine: boolean;
    checkCtx: boolean;
    checkArgs: boolean;
    debug: boolean;
}

type BaseError = {
    error: string;
    line?: number;
    file?: string;
    callback?: any;
    status?: string;
    errors?: [];
    stack?: string;
}

interface Parsing {
    file: string;
    status: string;
    errors: BaseError[];
    parsed: Stmt[];
}
export type Ctx = string[];
export interface Stmt {
    includes?: any[];
    file?: string;
    comment?: string;
    directive: string;
    line: number;
    args: string[];
    block?: Stmt[];
}

export interface Payload {
    status: string;
    errors: BaseError[];
    config: Parsing[];
}

const defaultParseConfig: Partial<ParseConfig> = {
    onError: undefined,
    catchErrors: true,
    ignore: [],
    single: false,
    comments: false,
    strict: false,
    combine: false,
    checkCtx: true,
    checkArgs: true,
    debug: false
}
export class Parser {

    payload: Payload = {
        status: 'ok',
        errors: [],
        config: []
    }
    includes: [string, Ctx][];
    included: Record<string, number>;
    config: ParseConfig;
    configDir: string;

    constructor(config: Partial<ParseConfig>) {
        this.config = { ...defaultParseConfig, ...config } as unknown as ParseConfig;
        console.log("Parser created");
        this.includes = [[this.config.filename, []]];
        this.included = { [this.config.filename]: 0 };
        this.configDir = path.dirname(this.config.filename);
    }

    async parse() {
        for (let [fname, ctx] of this.includes) {
            let input = new FileInput(fname);
            let lexer = new Lexer(input);
            let tokens = [...lexer.lex()];
            let parsing: Parsing = {
                file: fname,
                status: 'ok',
                errors: [],
                parsed: []
            }
            try {
                parsing.parsed = await this._parse(parsing, tokens[Symbol.iterator](), ctx);
            } catch (e) {
                if (this.config.catchErrors) {
                    this.handleError(parsing, e);
                } else {
                    throw e;
                }
            }
            this.payload.config.push(parsing);
        }

        if (this.config.combine) {
            return this.combineParsedConfig(this.payload);
        } else {
            return this.payload;
        }

    }
    combineParsedConfig(oldPayload: Payload) {
        let oldConfig = oldPayload.config;
        const performIncludes = (block: Stmt[]) => {
            const result: Stmt[] = [];
            for (const stmt of block) {
                if (stmt.block) {
                    stmt.block = performIncludes(stmt.block);
                }
                if (stmt.includes) {
                    for (const index of stmt.includes) {
                        let config = oldConfig[index]?.['parsed'];
                        for (const stmt of performIncludes(config)) {
                            result.push(stmt);
                        }
                    }
                } else {
                    result.push(stmt);
                }
            }
            return result;
        }

        let combinedConfig: Parsing = {
            file: oldConfig[0].file,
            status: 'ok',
            errors: [],
            parsed: []
        }

        for (const config of oldConfig) {
            combinedConfig.errors = combinedConfig.errors.concat(config.errors);
            if (config.status == 'failed') {
                combinedConfig.status = 'failed';
            }
        }

        const firstConfig = oldConfig[0].parsed;

        combinedConfig.parsed = performIncludes(firstConfig);

        const combinedPayload = {
            status: oldPayload.status ?? 'ok',
            errors: oldPayload.errors ?? [],
            config: [combinedConfig]
        }

        return combinedPayload;
    }

    handleError(parsing: Parsing, e: NgxParserBaseException) {
        let file = parsing.file;
        let error = e.toString();
        let line = e.lineno;
        let parsingError: BaseError = { error: error, line: line, };
        let payloadError: BaseError = { file: file, error: error, line: line };

        if (this.config.onError) {
            payloadError.callback = this.config.onError(e)
        }

        if (this.config.debug) {
            parsingError.stack = e.stack;
            payloadError.stack = e.stack;
        }

        parsing.status = 'failed';
        parsing.errors.push(parsingError);

        this.payload.status = 'failed';
        this.payload.errors.push(payloadError);

    }
    async _parse(parsing: Parsing, tokens: IterableIterator<Token>, ctx: Ctx = [], consume: boolean = false) {
        let fname = parsing.file;
        let parsed = [];
        let tokenIter = tokens;
        let nextTokenIter = tokenIter.next();
        let [token, lineno, quoted] = nextTokenIter.value;
        const next = () => {
            nextTokenIter = tokenIter.next();
            if (!nextTokenIter.done) {
                [token, lineno, quoted] = nextTokenIter.value;
            }
        }
        // # parse recursively by pulling from a flat stream of tokens
        while (!nextTokenIter.done) {
            let commentsInArgs: string[] = [];

            if (token === '}' && !quoted) {
                break
            }

            if (consume) {
                if (token === '{' && !quoted) {
                    this._parse(parsing, tokens, undefined, true);
                }
                next()
                continue;
            }

            let directive = token;

            let stmt: Stmt;
            if (this.config.combine) {
                stmt = {
                    file: fname,
                    directive: directive,
                    line: lineno,
                    args: []
                }
            } else {
                stmt = {
                    directive: directive,
                    line: lineno,
                    args: []
                }
            }

            if (directive.startsWith('#') && !quoted) {
                if (this.config.comments) {
                    stmt.directive = '#';
                    stmt.comment = token.slice(1);
                    parsed.push(stmt);
                }
                next();
                continue;
            }

            let args = stmt.args;
            let tempNext = tokenIter.next();
            token = tempNext.value[0];
            quoted = tempNext.value[2];
            while (!['{', ';', '}'].includes(token) || quoted) {
                if (token.startsWith('#') && !quoted) {
                    commentsInArgs.push(token.slice(1));
                } else {
                    stmt.args.push(token);
                }

                let tempNext = tokenIter.next();
                token = tempNext.value[0];
                quoted = tempNext.value[2];
            }

            if (this.config.ignore?.includes(directive)) {
                if (token == '{' && !quoted) {
                    this._parse(parsing, tokenIter, undefined, true);
                }
                next()
                continue;
            }

            if (stmt.directive === 'if') {
                this.prepareIfArgs(stmt);
            }

            try {
                analyze(
                    {
                        fname,
                        stmt,
                        term: token,
                        ctx,
                        strict: this.config.strict,
                        checkCtx: this.config.checkCtx,
                        checkArgs: this.config.checkArgs
                    }
                )
            } catch (e) {
                if (this.config.catchErrors) {
                    this.handleError(parsing, e);
                    console.log(`===${e.strerror}===${e.strerror.endsWith('is not terminated by ";"')}`);
                    
                    if ((e as NgxParserBaseException)?.strerror?.endsWith('is not terminated by ";"')) {
                        console.log('trying to recover');
                        
                        if (token != '}' && !quoted) {
                            this._parse(parsing, tokens, undefined, true);
                        } else {
                            break
                        }
                    }
                    next()
                    continue
                } else {
                    throw e;
                }
            }

            if (!this.config.single && stmt.directive === 'include') {
                let pattern = args[0];
                if (!path.isAbsolute(pattern)) {
                    pattern = path.join(this.configDir, pattern);
                }
                stmt.includes = []
                let fnames: string[];
                if (hasMagic(pattern)) {
                    fnames = await glob(pattern);
                    fnames.sort();
                } else {
                    try {
                        fs.readFileSync(pattern);
                        fnames = [pattern];
                    } catch (e) {
                        fnames = [];
                        e.lineno = stmt.line;
                        if (this.config.catchErrors) {
                            this.handleError(parsing, e);
                        } else {
                            throw e;
                        }
                    }
                }

                for (let fname of fnames) {
                    if (!(fname in this.included)) {
                        this.included[fname] = this.includes.length;
                        this.includes.push([fname, ctx]);
                    }
                    stmt.includes.push(this.included[fname]);
                }
            }

            if (token === '{' && !quoted) {
                let inner = enterBlockCtx(stmt, ctx);
                stmt.block = await this._parse(parsing, tokens, inner);
            }

            parsed.push(stmt);

            for (let comment of commentsInArgs) {
                let commentStmt = {
                    directive: '#',
                    line: stmt.line,
                    args: [],
                    comment: comment
                }
                parsed.push(commentStmt);
            }

            next()
        }
        return parsed
    }

    prepareIfArgs(stmt: Stmt) {
        let args = stmt.args;

        if (args && args[0]?.startsWith('(') && args[args.length - 1]?.endsWith(')')) {
            args[0] = args[0].slice(1).trimStart();
            args[args.length - 1] = args[args.length - 1].substring(0, args.length - 1).trimEnd();
            let start = args[0] ? 0 : 1;
            let endArgs = args[args.length - 1] ? 0 : 1;
            let end = args.length - endArgs;
            args = args.slice(start, end);
        }
    }


}
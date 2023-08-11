import { readFileSync } from 'fs';

type TokenWord = string;
type Line = number;
type Quoted = boolean;
export type Token = [TokenWord, Line, Quoted?]
export type InputIterResult = [string, number];

const EXTERNAL_LEXERS: any = {};
export function isWhitespace(char?: string) {
    if (char == null) return true;
    return char.trim() === '';
}
export class Input {
    line: number;
    constructor(public fileName: string, public input: string) {
        this.line = 1;
    }

    *iter() {
        let index = 0;
        let char = this.input[index];
        while (char != null) {
            if (char === "\\") {
                char = char + this.input[++index];
            }

            if (char.endsWith("\n")) {
                this.line++;
            }

            yield [char, this.line] as InputIterResult;
            char = this.input[++index];
        }
    }
}
export class FileInput extends Input {
    constructor(public filename: string) {
        super(filename, readFileSync(filename, {
            encoding: 'utf-8'
        }));
    }

}
export class Lexer {
    constructor(public input: Input) {

    }

    *lexFileObject(): Generator<Token> {
        let input = this.input;
        let token = '';
        let token_line = 0;
        let nextTokenIsDirective = true;
        const inputIter = input.iter();

        let nextInputGenerator = inputIter.next();

        while (nextInputGenerator.value) {
            let [char, line] = nextInputGenerator.value!;

            if (isWhitespace(char)) {
                if (token) {
                    yield [token, token_line];
                    if (nextTokenIsDirective && Object.keys(EXTERNAL_LEXERS).includes(token)) {
                        for (let customLexerToken of EXTERNAL_LEXERS[token]?.(inputIter, token)) {
                            yield customLexerToken;
                            nextTokenIsDirective = true;
                        }
                    } else {
                        nextTokenIsDirective = false;
                    }
                    token = '';
                }
                while (isWhitespace(char)) {
                    let nextIter = inputIter.next();
                    if (nextIter.value) {
                        [char, line] = nextIter.value!;
                    } else {
                        break;
                    }
                }
            }

            if (token === '' && char === '#') {
                while (!char.endsWith('\n')) {
                    token = token + char;
                    [char] = inputIter.next().value!;
                }
                yield [token, line, false];
                token = '';
                nextInputGenerator = inputIter.next();
                continue;
            }

            if (!token) {
                token_line = line;
            }
            // handle parameter expansion syntax (ex: "${var[@]}")
            if (token && getEndChar(token) == '$' && char === '{') {
                nextTokenIsDirective = false;
                while (getEndChar(token) !== '}' && !isWhitespace(char)) {
                    token = token + char;
                    [char, line] = inputIter.next().value!;
                }
            }


            // if a quote is found, add the whole string to the token buffer
            if (char === '"' || char === "'") {
                if (token) {
                    token += char;
                    nextInputGenerator = inputIter.next();
                    continue
                }
                let quote = char;
                [char, line] = inputIter.next().value!;
                while (char !== quote) {
                    token = token + (char === '\\' + quote ? quote : char);
                    [char, line] = inputIter.next().value!;
                }

                yield [token, token_line, true];

                if (nextTokenIsDirective && token in EXTERNAL_LEXERS) {
                    for (let customLexerToken of EXTERNAL_LEXERS[token]?.(nextInputGenerator, token)) {
                        yield customLexerToken;
                        nextTokenIsDirective = true;
                    }
                } else {
                    nextTokenIsDirective = false;
                }
                token = ''
                nextInputGenerator = inputIter.next();
                continue;
            }



            // handle special characters that are treated like full tokens
            if (['{', '}', ';'].includes(char)) {
                if (token) {
                    yield [token, token_line];
                    token = '';
                }
                yield [char, line, false];
                nextTokenIsDirective = true;
                nextInputGenerator = inputIter.next();
                continue;
            }

            token = token + char;
            nextInputGenerator = inputIter.next();
        }
    }

    *balanceBraces(tokens: Token[], filename?: string) {
        let depth = 0;

        for (let [token, line, quoted] of tokens) {
            if (token === '}' && !quoted) {
                depth--;
            } else if (token === '{' && !quoted) {
                depth++;
            }

            if (depth < 0) {
                throw new Error(`Unexpected '}' at ${filename}:${line}`)
            }
            yield [token, line, quoted] as const;
        }

        if (depth > 0) {
            throw new Error(`unexpected end of file, expecting "}" at ${filename}`)
        }
    }

    *lex(): Generator<Token> {
        let iter = this.lexFileObject();
        let it = this.balanceBraces([...iter], this.input.fileName);
        for (let [token, line, quoted] of it) {
            yield [token, line, quoted];
        }
    }
}


export function registerExternalLexer(directive: Record<string, []>, lexer: (input: Generator<InputIterResult>, token: string) => Generator<Token>) {
    for (let dir in directive) {
        EXTERNAL_LEXERS[dir] = lexer;
    }
}


function getEndChar(str: string) {
    return str.charAt(str.length - 1);
}


import { link } from "fs"
import { NgxParserBaseException } from "../errors"
import { InputIterResult, Token, isWhitespace, registerExternalLexer } from "../lexer"
import { registerExternalBuilder } from "../build"
import { Stmt } from "../parser"

export class LuaBlockPlugin {
    directives: Record<string, []> = {
        'access_by_lua_block': [],
        'balancer_by_lua_block': [],
        'body_filter_by_lua_block': [],
        'content_by_lua_block': [],
        'header_filter_by_lua_block': [],
        'init_by_lua_block': [],
        'init_worker_by_lua_block': [],
        'log_by_lua_block': [],
        'rewrite_by_lua_block': [],
        'set_by_lua_block': [],
        'ssl_certificate_by_lua_block': [],
        'ssl_session_fetch_by_lua_block': [],
        'ssl_session_store_by_lua_block': [],
    }

    registerExtension() {
        registerExternalLexer(this.directives, this.lex)
        registerExternalBuilder(this.directives, this.build)
    }

    *lex(charIterator: Generator<InputIterResult>, directive: string): Generator<Token> {
        let char: string | undefined, line: number | undefined;
        if (directive === 'set_by_lua_block') {
            let arg = '';
            [char, line] = charIterator.next().value ?? []
            while (char != undefined) {
                if (isWhitespace(char)) {
                    if (arg) {
                        yield [arg, line, false] as Token;
                        break
                    }
                    while (isWhitespace(char)) {
                        [char, line] = charIterator.next().value ?? []
                    }
                }
                arg += char
            }
        }

        let depth = 0;
        let token = '';

        while (true) {
            [char, line] = charIterator.next().value ?? [];
            if (!isWhitespace(char)) {
                break;
            }
        }

        if (char != "{") {
            throw new LuaBlockParserSyntaxError("expected { to start Lua block", '', line)
        }

        depth += 1;

        let emplaceIter = new EmplaceIter(charIterator);


        let commentLine: number;
        let nextValue = emplaceIter.next();
        while (nextValue) {
            [char, line] = nextValue;
            if (char === '-') {
                const [prevChar, prevLine] = [char, line];
                [char, commentLine] = emplaceIter.next() ?? [];
                if (char === '-') {
                    token += '-';
                    while (char !== '\n') {
                        token += char;
                        [char, line] = emplaceIter.next() ?? [];
                    }
                } else {
                    emplaceIter.put_back([char, commentLine] as [string, number]);
                    [char, line] = [prevChar, prevLine];
                }
            } else if (char === '{') {
                depth += 1;
            } else if (char === '}') {
                depth -= 1;
            } else if (char === '"' || char === "'") {
                const quote = char;
                token += quote;
                [char, line] = emplaceIter.next() ?? [];
                while (char !== quote) {
                    token += char === quote ? quote : char;
                    [char, line] = emplaceIter.next() ?? [];
                }
            }

            if (depth < 0) {
                const reason = 'unexpected "}"';
                throw new LuaBlockParserSyntaxError(reason, '', line);
            }

            if (depth === 0) {
                yield [token, line, true] as Token; // true because this is treated like a string
                yield [';', line, false] as Token;
                return
            }
            token += char;
            nextValue = emplaceIter.next();
        }

    }

    build(stmt: Stmt, padding: string, indent: number = 4, tabs: boolean = false) {
        let built = stmt['directive']
        let block = ''
        if (built == 'set_by_lua_block') {
            block = stmt['args'][1]
            built += ` ${stmt['args'][0]}`
        } else {
            block = stmt['args'][0]
        }
        return built + ' {' + block + '}'
    }
}

class EmplaceIter {
    it: Generator<InputIterResult>;
    ret: InputIterResult[];

    constructor(it: Generator<InputIterResult>) {
        this.it = it;
        this.ret = [];
    }

    next() {
        if (this.ret.length > 0) {
            const v = this.ret.pop();
            if (v) {
                return v;
            }
        }
        return this.it.next().value;
    }

    put_back(v: InputIterResult) {
        this.ret.push(v);
    }
}

class LuaBlockParserSyntaxError extends NgxParserBaseException { }
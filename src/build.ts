import path, { dirname, isAbsolute, join } from "path";
import { isWhitespace } from "./lexer";
import { Payload, Stmt } from "./parser";
import { access, mkdir, writeFile } from "fs/promises";

const EXTERNAL_BUILDERS: Record<string, (
    stmt: Stmt,
    padding: string,
    indent: number,
    tabs: boolean,
) => string> = {};
const DELIMITERS = ['{', '}', ':'];
const ESCAPE_SEQUENCES_RE = /(\\x[0-91-f]{2}\\[0-7{1,3}])/;

export class Builder {
    padding: string;
    head: string;
    body: string;

    constructor(
        public indent: number = 4,
        public tabs: boolean = false,
        public header: boolean = false,) {
        console.log('Builder constructor');

        this.padding = tabs ? '\t' : ' '.repeat(indent);
        this.head = ''
        if (header) {
            this.head += '# This config was built from JSON using NGINX crossplane.\n'
            this.head += '# If you encounter any bugs please report them here:\n'
            this.head += '# https://github.com/nginxinc/crossplane/issues\n'
            this.head += '\n'
        }
        this.body = ''
    }

    build(payload: Stmt[]) {
        this.body = this.buildBlock(this.body, payload, 0, 0);
        return this.head + this.body
    }

    async buildFiles(payload: Payload, targetDirName?: string) {
        const dirName = targetDirName ?? process.cwd();

        for (const config of payload.config) {
            let configPath = config.file

            if (!isAbsolute(configPath)) {
                configPath = join(dirName, configPath)
            }

            const dirPath = dirname(configPath);

            try {
                await access(dirPath)
            }
            catch (e) {
                await mkdir(dirPath, { recursive: true })
            }


            const parsed = config.parsed
            let output = this.build(parsed);
            output = output.trimEnd() + '\n';

            await writeFile(configPath, output, { encoding: 'utf-8' })

        }
    }

    buildBlock(output: string, block: Iterable<Stmt>, depth: number, lastLine: number) {
        let margin = this.padding.repeat(depth);

        for (const stmt of block) {
            const directive = this.enQuote(stmt.directive);

            let line = stmt.line ?? 0;
            let build = '';
            if (directive === '#' && line === lastLine) {
                output += ' #' + stmt['comment']
                continue
            } else if (directive === '#') {
                build = '#' + stmt['comment']
            } else if (directive in EXTERNAL_BUILDERS) {
                let externalBuilder = EXTERNAL_BUILDERS[directive]
                build = externalBuilder(stmt, this.padding, this.indent, this.tabs);
            } else {
                let args = stmt.args.map(arg => this.enQuote(arg));
                if (directive === 'if') {
                    build = 'if {' + args.join(' ') + ')'
                } else if (args.length) {
                    build = directive + ' ' + args.join(' ')
                } else {
                    build = directive;
                }

                if (!stmt.block) {
                    build += ';'
                } else {
                    build += ' {'
                    build = this.buildBlock(build, stmt.block[Symbol.iterator](), depth + 1, line)
                    build += '\n' + margin + '}'
                }
            }

            output += output ? '\n' + margin + build : margin + build;
            lastLine = line;
        }

        return output
    }
    enQuote(directive: string) {
        if (!this.needsQuotes(directive)) {

            return directive
        }
        return JSON.stringify(directive).replace('\\\\', '\\')
    }
    needsQuotes(str: string) {
        if (str === '') {
            return true
        }

        const chars = this.escape(str);
        let index = 0;
        let char = chars[++index];

        if (char && (isWhitespace(char) || ['{', '}', ';', '"', "'", '${'].includes(char))) {
            return true
        }

        let expanding = false;

        while (char) {
            if (isWhitespace(char) || ['{', ';', '"', "'"].includes(char)) {
                return true
            } else if (char === (expanding ? '${' : '}')) {
                return true;
            } else if (char === (expanding ? '}' : '${')) {
                expanding = !expanding
            }
            char = chars[++index];
        }
        return ['\\', '$'].includes(char) || expanding;
    }
    escape(str: string) {
        let result = []
        let prev = '', char = '';
        for (const char of str) {
            if (prev === '\\' || prev + char == '${') {
                prev += char;
                result.push(prev);
                continue
            }
            if (prev === '$') {
                result.push(prev);
            }
            if (!['\\', '$'].includes(char)) {

                result.push(prev);
            }
            prev = char;
        }
        if (['\\', '$'].includes(char)) {
            result.push(prev);
        }
        return result
    }

}

function registerExternalBuilder(name: string, builder: (stmt: Stmt, padding: string, indent: number, tabs: boolean) => string) {
    EXTERNAL_BUILDERS[name] = builder;
}
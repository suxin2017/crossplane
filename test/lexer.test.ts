import { FileInput, Input, Lexer } from '../src/lexer';
import { join } from 'path'

describe('lexer module', () => {
    test('simple config', () => {
        const config = join(__dirname, 'configs/simple/nginx.conf')
        const input = new FileInput(config)
        const lexer = new Lexer(input);
        const tokens = [...lexer.lex()]
        expect(tokens.map(token => [token[0], token[1]])).toEqual([
            ["events", 1], ["{", 1], ["worker_connections", 2], ["1024", 2], [";", 2], ["}", 3], ["http", 5], ["{", 5], ["server", 6], ["{", 6], ["listen", 7], ["127.0.0.1:8080", 7], [";", 7], ["server_name", 8], ["default_server", 8], [";", 8], ["location", 9], ["/", 9], ["{", 9], ["return", 10], ["200", 10], ["foo bar baz", 10], [";", 10], ["}", 11], ["}", 12], ["}", 13],
        ])
    });
    test('with config comments', () => {
        const config = join(__dirname, 'configs/with-comments/nginx.conf')
        const input = new FileInput(config)
        const lexer = new Lexer(input);
        const tokens = [...lexer.lex()]
        expect(tokens.map(token => [token[0], token[1]])).toEqual([["events", 1], ["{", 1], ["worker_connections", 2], ["1024", 2], [";", 2], ["}", 3], ["#comment", 4], ["http", 5], ["{", 5], ["server", 6], ["{", 6], ["listen", 7], ["127.0.0.1:8080", 7], [";", 7], ["#listen", 7], ["server_name", 8], ["default_server", 8], [";", 8], ["location", 9], ["/", 9], ["{", 9], ["## this is brace", 9], ["# location /", 10], ["return", 11], ["200", 11], ["foo bar baz", 11], [";", 11], ["}", 12], ["}", 13], ["}", 14],])
    });

    test('with messy config', () => {
        const config = join(__dirname, 'configs/messy/nginx.conf')
        const input = new FileInput(config)
        const lexer = new Lexer(input);
        const tokens = [...lexer.lex()]
        expect(tokens.map((token) => [token[0], token[1]])).toEqual([
            ['user', 1], ['nobody', 1], [';', 1],
            ['# hello\\n\\\\n\\\\\\n worlddd  \\#\\\\#\\\\\\# dfsf\\n \\\\n \\\\\\n ', 2],
            ['events', 3], ['{', 3], ['worker_connections', 3], ['2048', 3],
            [';', 3], ['}', 3], ['http', 5], ['{', 5], ['#forteen', 5],
            ['# this is a comment', 6], ['access_log', 7], ['off', 7], [';', 7],
            ['default_type', 7], ['text/plain', 7], [';', 7], ['error_log', 7],
            ['off', 7], [';', 7], ['server', 8], ['{', 8], ['listen', 9],
            ['8083', 9], [';', 9], ['return', 10], ['200', 10],
            ['Ser" \' \' ver\\\\ \\ $server_addr:\\$server_port\\n\\nTime: $time_local\\n\\n', 10],
            [';', 10], ['}', 11], ['server', 12], ['{', 12], ['listen', 12],
            ['8080', 12], [';', 12], ['root', 13], ['/usr/share/nginx/html', 13],
            [';', 13], ['location', 14], ['~', 14], ['/hello/world;', 14],
            ['{', 14], ['return', 14], ['301', 14], ['/status.html', 14],
            [';', 14], ['}', 14], ['location', 15], ['/foo', 15],
            ['{', 15], ['}', 15], ['location', 15], ['/bar', 15],
            ['{', 15], ['}', 15], ['location', 16], ['/\\{\\;\\}\\ #\\ ab', 16],
            ['{', 16], ['}', 16], ['# hello', 16], ['if', 17],
            ['($request_method', 17], ['=', 17], ['P\\{O\\)\\###\\;ST', 17],
            [')', 17], ['{', 17], ['}', 17], ['location', 18], ['/status.html', 18],
            ['{', 18], ['try_files', 19], ['/abc/${uri} /abc/${uri}.html', 19],
            ['=404', 19], [';', 19], ['}', 20], ['location', 21],
            ['/sta;\n                    tus', 21], ['{', 22], ['return', 22],
            ['302', 22], ['/status.html', 22], [';', 22], ['}', 22],
            ['location', 23], ['/upstream_conf', 23], ['{', 23],
            ['return', 23], ['200', 23], ['/status.html', 23], [';', 23],
            ['}', 23], ['}', 23], ['server', 24], ['{', 25], ['}', 25],
            ['}', 25]
        ]
        )
    });


    test("quote behavior", () => {
        const config = join(__dirname, 'configs/quote-behavior/nginx.conf')
        const input = new FileInput(config)
        const lexer = new Lexer(input);
        const tokens = [...lexer.lex()];
        expect(tokens.map(token => [token[0]]).flat()).toEqual([
            'outer-quote', 'left', '-quote', 'right-"quote"', 'inner"-"quote', ';',
            '', '', 'left-empty', 'right-empty""', 'inner""empty', 'right-empty-single"', ';',
        ])
    })

    test("quoted right brace",()=>{
        const config = join(__dirname, 'configs/quoted-right-brace/nginx.conf')
        const input = new FileInput(config)
        const lexer = new Lexer(input);
        const tokens = [...lexer.lex()];
        expect(tokens.map(token => [token[0]]).flat()).toEqual([
            'events', '{', '}', 'http', '{', 'log_format', 'main', 'escape=json',
            '{ "@timestamp": "$time_iso8601", ', '"server_name": "$server_name", ',
            '"host": "$host", ', '"status": "$status", ',
            '"request": "$request", ', '"uri": "$uri", ', '"args": "$args", ',
            '"https": "$https", ', '"request_method": "$request_method", ',
            '"referer": "$http_referer", ', '"agent": "$http_user_agent"', '}',
            ';', '}'
        ]) 
    })
});
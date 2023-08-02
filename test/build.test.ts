import { readdir, readFile } from "fs/promises";
import { Builder } from "../src/build"
import { Stmt } from "../src/parser";
import { compareParsedAndBuilt } from "./utils";
import { join } from "path";
const tmpdir = (scope?: string) => join(__dirname, 'tmpdir', scope ?? '')

describe('build module', () => {
    it('build nested and multiple arg', async () => {
        const payload = [
            {
                "directive": "events",
                "args": [],
                "block": [
                    {
                        "directive": "worker_connections",
                        "args": ["1024"]
                    }
                ]
            },
            {
                "directive": "http",
                "args": [],
                "block": [
                    {
                        "directive": "server",
                        "args": [],
                        "block": [
                            {
                                "directive": "listen",
                                "args": ["127.0.0.1:8080"]
                            },
                            {
                                "directive": "server_name",
                                "args": ["it(ault_server"]
                            },
                            {
                                "directive": "location",
                                "args": ["/"],
                                "block": [
                                    {
                                        "directive": "return",
                                        "args": ["200", "foo bar baz"]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ] as unknown as Stmt[]

        const builder = new Builder();
        const built = builder.build(payload)

        expect(built).toEqual([
            'events {',
            '    worker_connections 1024;',
            '}',
            'http {',
            '    server {',
            '        listen 127.0.0.1:8080;',
            '        server_name it(ault_server;',
            '        location / {',
            "            return 200 \"foo bar baz\";",
            '        }',
            '    }',
            '}'
        ].join('\n'))

    })

    it('build with comments', async () => {
        const payload = [
            {
                "directive": "events",
                "line": 1,
                "args": [],
                "block": [
                    {
                        "directive": "worker_connections",
                        "line": 2,
                        "args": ["1024"]
                    }
                ]
            },
            {
                "directive": "#",
                "line": 4,
                "args": [],
                "comment": "comment"
            },
            {
                "directive": "http",
                "line": 5,
                "args": [],
                "block": [
                    {
                        "directive": "server",
                        "line": 6,
                        "args": [],
                        "block": [
                            {
                                "directive": "listen",
                                "line": 7,
                                "args": ["127.0.0.1:8080"]
                            },
                            {
                                "directive": "#",
                                "line": 7,
                                "args": [],
                                "comment": "listen"
                            },
                            {
                                "directive": "server_name",
                                "line": 8,
                                "args": ["it(ault_server"]
                            },
                            {
                                "directive": "location",
                                "line": 9,
                                "args": ["/"],
                                "block": [
                                    {
                                        "directive": "#",
                                        "line": 9,
                                        "args": [],
                                        "comment": "# this is brace"
                                    },
                                    {
                                        "directive": "#",
                                        "line": 10,
                                        "args": [],
                                        "comment": " location /"
                                    },
                                    {
                                        "directive": "#",
                                        "line": 11,
                                        "args": [],
                                        "comment": " is here"
                                    },
                                    {
                                        "directive": "return",
                                        "line": 12,
                                        "args": ["200", "foo bar baz"]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ] as unknown as Stmt[]

        const builder = new Builder(4, false);
        const built = builder.build(payload)

        expect(built).toEqual([
            'events {',
            '    worker_connections 1024;',
            '}',
            '#comment',
            'http {',
            '    server {',
            '        listen 127.0.0.1:8080; #listen',
            '        server_name it(ault_server;',
            '        location / { ## this is brace',
            '            # location /',
            '            # is here',
            "            return 200 \"foo bar baz\";",
            '        }',
            '    }',
            '}'
        ].join('\n'))

    })

    it('build starts with comments', async () => {
        const payload = [
            {
                "directive": "#",
                "line": 1,
                "args": [],
                "comment": " foo"
            },
            {
                "directive": "user",
                "line": 5,
                "args": ["root"]
            }
        ] as unknown as Stmt[]
        const built = new Builder(4, false).build(payload);
        expect(built).toEqual('# foo\nuser root;')
    })

    it('build  with quoted unicode', async () => {
        const payload = [
            {
                "directive": "env",
                "line": 1,
                "args": ["русский текст"],
            }
        ] as unknown as Stmt[]
        const built = new Builder(4, false).build(payload);
        expect(built).toEqual('env "русский текст";')
    })

    it('build multiple comments one one line', async () => {
        const payload = [
            {
                "directive": "#",
                "line": 1,
                "args": [],
                "comment": "comment1"
            },
            {
                "directive": "user",
                "line": 2,
                "args": ["root"]
            },
            {
                "directive": "#",
                "line": 2,
                "args": [],
                "comment": "comment2"
            },
            {
                "directive": "#",
                "line": 2,
                "args": [],
                "comment": "comment3"
            }
        ] as unknown as Stmt[]
        const built = new Builder(4, false).build(payload);
        expect(built).toEqual('#comment1\nuser root; #comment2 #comment3')
    })

    it('build files with missing status and errors', async () => {
        const payload = {
            "config": [
                {
                    "file": "nginx.conf",
                    "parsed": [
                        {
                            "directive": "user",
                            "line": 1,
                            "args": ["nginx"],
                        }
                    ]
                }
            ]
        } as unknown as any;
        const tmp = tmpdir('missing-status-and-errors');
        await new Builder().buildFiles(payload, tmp)
        const builtFiles = await readdir(tmp);
        expect(builtFiles.length).toEqual(1)
        expect(builtFiles[0]).toEqual('nginx.conf');
        const context = await readFile(join(tmp, builtFiles[0]))
        expect(context.toString()).toEqual('user nginx;\n')
    })

    it('build files with unicode', async () => {
        const payload = {
            "status": "ok",
            "errors": [],
            "config": [
                {
                    "file": "nginx.conf",
                    "status": "ok",
                    "errors": [],
                    "parsed": [
                        {
                            "directive": "user",
                            "line": 1,
                            "args": ["測試"],
                        }
                    ]
                }
            ]
        }
        const tmp = tmpdir('unicode');
        await new Builder().buildFiles(payload, tmp)
        const builtFiles = await readdir(tmp);
        expect(builtFiles.length).toEqual(1)
        expect(builtFiles[0]).toEqual('nginx.conf');
        const context = await readFile(join(tmp, builtFiles[0]))
        expect(context.toString()).toEqual('user 測試;\n')
    })

    it('compare parsed and built simple', async () => {
        await compareParsedAndBuilt('simple', 'nginx.conf', tmpdir())
    })

    it("test compare parsed and built messy", async () => {
        await compareParsedAndBuilt('messy', 'nginx.conf', tmpdir())
    })
    it("test compare parsed and built messy with comments", async () => {
        await compareParsedAndBuilt('with-comments', 'nginx.conf', tmpdir())
    })
    it("test compare parsed and built empty map values", async () => {
        await compareParsedAndBuilt('empty-value-map', 'nginx.conf', tmpdir())
    })

    it("test compare parsed and built russian text", async () => {
        await compareParsedAndBuilt('russian-text', 'nginx.conf', tmpdir())
    })

    it("test compare parsed and built quoted right brace", async () => {
        await compareParsedAndBuilt('quoted-right-brace', 'nginx.conf', tmpdir())
    })
    it("test compare parsed and built directive with space", async () => {
        await compareParsedAndBuilt('directive-with-space', 'nginx.conf', tmpdir())
    })

})
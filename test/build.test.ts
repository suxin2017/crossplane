import { Builder } from "../src/build"
import { Stmt } from "../src/parser";

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
                                "args": ["default_server"]
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
            '        server_name default_server;',
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
                                "args": ["default_server"]
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
            '        server_name default_server;',
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
})
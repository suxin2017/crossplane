import { FileInput, Input, Lexer } from '../src/lexer';
import { join } from 'path'
import { Parser, Payload } from '../src/parser';

describe('parser module', () => {
    test('includes regular', async () => {
        const dirname = join(__dirname, 'configs/includes-regular')
        const config = join(dirname, 'nginx.conf')
        const parser = new Parser({
            filename: config,
            catchErrors: true,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            'status': 'failed',
            'errors': [
                {
                    'file': join(dirname, 'conf.d', 'server.conf'),
                    "error": `Error: ENOENT: no such file or directory, open '${join(dirname,'bar.conf')}'`,
                    'line': 5
                }
            ],
            'config': [
                {
                    'file': join(dirname, 'nginx.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'events',
                            'line': 1,
                            'args': [],
                            'block': []
                        },
                        {
                            'directive': 'http',
                            'line': 2,
                            'args': [],
                            'block': [
                                {
                                    'directive': 'include',
                                    'line': 3,
                                    'args': ['conf.d/server.conf'],
                                    'includes': [1]
                                }
                            ]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'conf.d', 'server.conf'),
                    'status': 'failed',
                    'errors': [
                        {
                            'error': `Error: ENOENT: no such file or directory, open '${join(dirname,'bar.conf')}'`,
                            'line': 5
                        }
                    ],
                    'parsed': [
                        {
                            'directive': 'server',
                            'line': 1,
                            'args': [],
                            'block': [
                                {
                                    'directive': 'listen',
                                    'line': 2,
                                    'args': ['127.0.0.1:8080']
                                },
                                {
                                    'directive': 'server_name',
                                    'line': 3,
                                    'args': ['default_server']
                                },
                                {
                                    'directive': 'include',
                                    'line': 4,
                                    'args': ['foo.conf'],
                                    'includes': [2]
                                },
                                {
                                    'directive': 'include',
                                    'line': 5,
                                    'args': ['bar.conf'],
                                    'includes': []
                                }
                            ]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'foo.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'location',
                            'line': 1,
                            'args': ['/foo'],
                            'block': [
                                {
                                    'directive': 'return',
                                    'line': 2,
                                    'args': ['200', 'foo']
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    });
    test('includes globed', async () => {
        const dirname = join(__dirname, 'configs/includes-globbed')
        const config = join(dirname, 'nginx.conf')
        const parser = new Parser({
            filename: config,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            'status': 'ok',
            'errors': [],
            'config': [
                {
                    'file': join(dirname, 'nginx.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'events',
                            'line': 1,
                            'args': [],
                            'block': []
                        },
                        {
                            'directive': 'include',
                            'line': 2,
                            'args': ['http.conf'],
                            'includes': [1]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'http.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'http',
                            'args': [],
                            'line': 1,
                            'block': [
                                {
                                    'directive': 'include',
                                    'line': 2,
                                    'args': ['servers/*.conf'],
                                    'includes': [2, 3]
                                }
                            ]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'servers', 'server1.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'server',
                            'args': [],
                            'line': 1,
                            'block': [
                                {
                                    'directive': 'listen',
                                    'args': ['8080'],
                                    'line': 2
                                },
                                {
                                    'directive': 'include',
                                    'args': ['locations/*.conf'],
                                    'line': 3,
                                    'includes': [4, 5]
                                }
                            ]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'servers', 'server2.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'server',
                            'args': [],
                            'line': 1,
                            'block': [
                                {
                                    'directive': 'listen',
                                    'args': ['8081'],
                                    'line': 2
                                },
                                {
                                    'directive': 'include',
                                    'args': ['locations/*.conf'],
                                    'line': 3,
                                    'includes': [4, 5]
                                }
                            ]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'locations', 'location1.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'location',
                            'args': ['/foo'],
                            'line': 1,
                            'block': [
                                {
                                    'directive': 'return',
                                    'args': ['200', 'foo'],
                                    'line': 2
                                }
                            ]
                        }
                    ]
                },
                {
                    'file': join(dirname, 'locations', 'location2.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'location',
                            'args': ['/bar'],
                            'line': 1,
                            'block': [
                                {
                                    'directive': 'return',
                                    'args': ['200', 'bar'],
                                    'line': 2
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    });

    test('includes globed combined', async () => {
        const dirname = join(__dirname, 'configs/includes-globbed')
        const config = join(dirname, 'nginx.conf')
        const parser = new Parser({
            filename: config,
            combine: true,
            catchErrors: false,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            "status": "ok",
            "errors": [],
            "config": [
                {
                    "file": join(dirname, "nginx.conf"),
                    "status": "ok",
                    "errors": [],
                    "parsed": [
                        {
                            "directive": "events",
                            "args": [],
                            "file": join(dirname, "nginx.conf"),
                            "line": 1,
                            "block": []
                        },
                        {
                            "directive": "http",
                            "args": [],
                            "file": join(dirname, "http.conf"),
                            "line": 1,
                            "block": [
                                {
                                    "directive": "server",
                                    "args": [],
                                    "file": join(dirname, "servers", "server1.conf"),
                                    "line": 1,
                                    "block": [
                                        {
                                            "directive": "listen",
                                            "args": ["8080"],
                                            "file": join(dirname, "servers", "server1.conf"),
                                            "line": 2
                                        },
                                        {
                                            "directive": "location",
                                            "args": ["/foo"],
                                            "file": join(dirname, "locations", "location1.conf"),
                                            "line": 1,
                                            "block": [
                                                {
                                                    "directive": "return",
                                                    "args": ["200", "foo"],
                                                    "file": join(dirname, "locations", "location1.conf"),
                                                    "line": 2
                                                }
                                            ]
                                        },
                                        {
                                            "directive": "location",
                                            "args": ["/bar"],
                                            "file": join(dirname, "locations", "location2.conf"),
                                            "line": 1,
                                            "block": [
                                                {
                                                    "directive": "return",
                                                    "args": ["200", "bar"],
                                                    "file": join(dirname, "locations", "location2.conf"),
                                                    "line": 2
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "directive": "server",
                                    "args": [],
                                    "file": join(dirname, "servers", "server2.conf"),
                                    "line": 1,
                                    "block": [
                                        {
                                            "directive": "listen",
                                            "args": ["8081"],
                                            "file": join(dirname, "servers", "server2.conf"),
                                            "line": 2
                                        },
                                        {
                                            "directive": "location",
                                            "args": ["/foo"],
                                            "file": join(dirname, "locations", "location1.conf"),
                                            "line": 1,
                                            "block": [
                                                {
                                                    "directive": "return",
                                                    "args": ["200", "foo"],
                                                    "file": join(dirname, "locations", "location1.conf"),
                                                    "line": 2
                                                }
                                            ]
                                        },
                                        {
                                            "directive": "location",
                                            "args": ["/bar"],
                                            "file": join(dirname, "locations", "location2.conf"),
                                            "line": 1,
                                            "block": [
                                                {
                                                    "directive": "return",
                                                    "args": ["200", "bar"],
                                                    "file": join(dirname, "locations", "location2.conf"),
                                                    "line": 2
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    });

    test('includes single', async () => {
        const config = join(__dirname, 'configs/includes-regular/nginx.conf')
        const parser = new Parser({
            filename: config,
            single: true,
            catchErrors: false,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            'status': 'ok',
            'errors': [],
            'config': [
                {
                    'file': join(config, 'nginx.conf'),
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'events',
                            'line': 1,
                            'args': [],
                            'block': []
                        },
                        {
                            'directive': 'http',
                            'line': 2,
                            'args': [],
                            'block': [
                                {
                                    'directive': 'include',
                                    'line': 3,
                                    'args': ['conf.d/server.conf']
                                    // # no 'includes' key
                                }
                            ]
                        }
                    ]
                }
                // # single config parsed
            ]
        })
    });

    test('ignore directives', async () => {
        const config = join(__dirname, 'configs/simple/nginx.conf')
        let parser = new Parser({
            filename: config,
            ignore: ['listen', 'server_name'],
            catchErrors: false,
        });
        let payload = await parser.parse();
        expect(payload).toEqual({
            "status": "ok",
            "errors": [],
            "config": [
                {
                    "file": config,
                    "status": "ok",
                    "errors": [],
                    "parsed": [
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
                                            "directive": "location",
                                            "line": 9,
                                            "args": ["/"],
                                            "block": [
                                                {
                                                    "directive": "return",
                                                    "line": 10,
                                                    "args": ["200", "foo bar baz"]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        })
        parser = new Parser({
            filename: config,
            ignore: ['events', 'server'],
            catchErrors: false,
        });
        payload = await parser.parse();
        expect(payload).toEqual({
            "status": "ok",
            "errors": [],
            "config": [
                {
                    "file": config,
                    "status": "ok",
                    "errors": [],
                    "parsed": [
                        {
                            "directive": "http",
                            "line": 5,
                            "args": [],
                            "block": []
                        }
                    ]
                }
            ]
        })
    });

    test('config with comments', async () => {
        const config = join(__dirname, 'configs/with-comments/nginx.conf')
        const parser = new Parser({
            filename: config,
            comments: true,
            catchErrors: false,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            "errors": [],
            "status": "ok",
            "config": [
                {
                    "errors": [],
                    "parsed": [
                        {
                            "block": [
                                {
                                    "directive": "worker_connections",
                                    "args": [
                                        "1024"
                                    ],
                                    "line": 2
                                }
                            ],
                            "line": 1,
                            "args": [],
                            "directive": "events"
                        },
                        {
                            "line": 4,
                            "directive": "#",
                            "args": [],
                            "comment": "comment"
                        },
                        {
                            "block": [
                                {
                                    "args": [],
                                    "directive": "server",
                                    "line": 6,
                                    "block": [
                                        {
                                            "args": [
                                                "127.0.0.1:8080"
                                            ],
                                            "directive": "listen",
                                            "line": 7
                                        },
                                        {
                                            "args": [],
                                            "directive": "#",
                                            "comment": "listen",
                                            "line": 7
                                        },
                                        {
                                            "args": [
                                                "default_server"
                                            ],
                                            "directive": "server_name",
                                            "line": 8
                                        },
                                        {
                                            "block": [
                                                {
                                                    "args": [],
                                                    "directive": "#",
                                                    "line": 9,
                                                    "comment": "# this is brace"
                                                },
                                                {
                                                    "args": [],
                                                    "directive": "#",
                                                    "line": 10,
                                                    "comment": " location /"
                                                },
                                                {
                                                    "line": 11,
                                                    "directive": "return",
                                                    "args": [
                                                        "200",
                                                        "foo bar baz"
                                                    ]
                                                }
                                            ],
                                            "line": 9,
                                            "directive": "location",
                                            "args": [
                                                "/"
                                            ]
                                        }
                                    ]
                                }
                            ],
                            "line": 5,
                            "args": [],
                            "directive": "http"
                        }
                    ],
                    "status": "ok",
                    "file": config
                }
            ]
        })
    })

    test('config without comments', async () => {
        const config = join(__dirname, 'configs/with-comments/nginx.conf')
        const parser = new Parser({
            filename: config,
            comments: false,
            catchErrors: false,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            "errors": [],
            "status": "ok",
            "config": [
                {
                    "errors": [],
                    "parsed": [
                        {
                            "block": [
                                {
                                    "directive": "worker_connections",
                                    "args": [
                                        "1024"
                                    ],
                                    "line": 2
                                }
                            ],
                            "line": 1,
                            "args": [],
                            "directive": "events"
                        },
                        {
                            "block": [
                                {
                                    "args": [],
                                    "directive": "server",
                                    "line": 6,
                                    "block": [
                                        {
                                            "args": [
                                                "127.0.0.1:8080"
                                            ],
                                            "directive": "listen",
                                            "line": 7
                                        },
                                        {
                                            "args": [
                                                "default_server"
                                            ],
                                            "directive": "server_name",
                                            "line": 8
                                        },
                                        {
                                            "block": [
                                                {
                                                    "line": 11,
                                                    "directive": "return",
                                                    "args": [
                                                        "200",
                                                        "foo bar baz"
                                                    ]
                                                }
                                            ],
                                            "line": 9,
                                            "directive": "location",
                                            "args": [
                                                "/"
                                            ]
                                        }
                                    ]
                                }
                            ],
                            "line": 5,
                            "args": [],
                            "directive": "http"
                        }
                    ],
                    "status": "ok",
                    "file": config
                }
            ]
        })
    })
    test('parse strict', async () => {
        const config = join(__dirname, 'configs/spelling-mistake/nginx.conf')
        const parser = new Parser({
            filename: config,
            comments: true,
            strict: true,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            'status': 'failed',
            'errors': [
                {
                    'file': config,
                    'error': `Error: unknown directive proxy_passs in ${config}:7`,
                    'line': 7
                }
            ],
            'config': [
                {
                    'file': config,
                    'status': 'failed',
                    'errors': [
                        {
                            'error': `Error: unknown directive proxy_passs in ${config}:7`,
                            'line': 7
                        }
                    ],
                    'parsed': [
                        {
                            'directive': 'events',
                            'line': 1,
                            'args': [],
                            'block': []
                        },
                        {
                            'directive': 'http',
                            'line': 3,
                            'args': [],
                            'block': [
                                {
                                    'directive': 'server',
                                    'line': 4,
                                    'args': [],
                                    'block': [
                                        {
                                            'directive': 'location',
                                            'line': 5,
                                            'args': ['/'],
                                            'block': [
                                                {
                                                    'directive': '#',
                                                    'line': 6,
                                                    'args': [],
                                                    'comment': 'directive is misspelled'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    })

    test('parse missing semicolon', async () => {
        const aboveConfig = join(__dirname, 'configs/missing-semicolon/broken-above.conf')
        const parser = new Parser({
            filename: aboveConfig,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            "status": "failed",
            "errors": [
                {
                    "file": aboveConfig,
                    "error": `Error: directive proxy_pass is not terminated by \";\" in ${aboveConfig}:4`,
                    "line": 4
                }
            ],
            "config": [
                {
                    "file": aboveConfig,
                    "status": "failed",
                    "errors": [
                        {
                            "error": `Error: directive proxy_pass is not terminated by \";\" in ${aboveConfig}:4`,
                            "line": 4
                        }
                    ],
                    "parsed": [
                        {
                            "directive": "http",
                            "line": 1,
                            "args": [],
                            "block": [
                                {
                                    "directive": "server",
                                    "line": 2,
                                    "args": [],
                                    "block": [
                                        {
                                            "directive": "location",
                                            "line": 3,
                                            "args": ["/is-broken"],
                                            "block": []
                                        },
                                        {
                                            "directive": "location",
                                            "line": 6,
                                            "args": ["/not-broken"],
                                            "block": [
                                                {
                                                    "directive": "proxy_pass",
                                                    "line": 7,
                                                    "args": ["http://not.broken.example"]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    })

    test('combine parsed missing values', async () => {
        const config = join(__dirname, 'configs/includes-regular/broken-above.conf')
        const parser = new Parser({
            filename: config,
        });
        let separate = {
            "config": [
                {
                    "file": "example1.conf",
                    "parsed": [
                        {
                            "directive": "include",
                            "line": 1,
                            "args": ["example2.conf"],
                            "includes": [1]
                        }
                    ]
                },
                {
                    "file": "example2.conf",
                    "parsed": [
                        {
                            "directive": "events",
                            "line": 1,
                            "args": [],
                            "block": []
                        },
                        {
                            "directive": "http",
                            "line": 2,
                            "args": [],
                            "block": []
                        }
                    ]
                }
            ]
        } as unknown as Payload;

        let combined = parser.combineParsedConfig(separate);

        expect(combined).toEqual({
            "status": "ok",
            "errors": [],
            "config": [
                {
                    "file": "example1.conf",
                    "status": "ok",
                    "errors": [],
                    "parsed": [
                        {
                            "directive": "events",
                            "line": 1,
                            "args": [],
                            "block": []
                        },
                        {
                            "directive": "http",
                            "line": 2,
                            "args": [],
                            "block": []
                        }
                    ]
                }
            ]
        })
    })

    test('comments between args', async () => {
        const config = join(__dirname, 'configs/comments-between-args/nginx.conf')
        const parser = new Parser({
            filename: config,
            comments: true,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            'status': 'ok',
            'errors': [],
            'config': [
                {
                    'file': config,
                    'status': 'ok',
                    'errors': [],
                    'parsed': [
                        {
                            'directive': 'http',
                            'line': 1,
                            'args': [],
                            'block': [
                                {
                                    'directive': '#',
                                    'line': 1,
                                    'args': [],
                                    'comment': 'comment 1'
                                },
                                {
                                    'directive': 'log_format',
                                    'line': 2,
                                    'args': ['\\#arg\\ 1', '#arg 2']
                                },
                                {
                                    'directive': '#',
                                    'line': 2,
                                    'args': [],
                                    'comment': 'comment 2'
                                },
                                {
                                    'directive': '#',
                                    'line': 2,
                                    'args': [],
                                    'comment': 'comment 3'
                                },
                                {
                                    'directive': '#',
                                    'line': 2,
                                    'args': [],
                                    'comment': 'comment 4'
                                },
                                {
                                    'directive': '#',
                                    'line': 2,
                                    'args': [],
                                    'comment': 'comment 5'
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    })


    test('non unicode', async () => {
        const config = join(__dirname, 'configs/non-unicode/nginx.conf')
        const parser = new Parser({
            filename: config,
            comments: true,
        });
        const payload = await parser.parse();
        expect(payload).toEqual({
            "errors": [],
            "status": "ok",
            "config": [
                {
                    "status": "ok",
                    "errors": [],
                    "file": config,
                    "parsed": [
                        {
                            "directive": "http",
                            "line": 1,
                            "args": [],
                            "block": [
                                {
                                    "directive": "server",
                                    "line": 2,
                                    "args": [],
                                    "block": [
                                        {
                                            "directive": "location",
                                            "line": 3,
                                            "args": [
                                                "/city"
                                            ],
                                            "block": [
                                                {
                                                    "directive": "#",
                                                    "line": 4,
                                                    "args": [],
                                                    "comment": " M\ufffdlln"
                                                },
                                                {
                                                    "directive": "return",
                                                    "line": 5,
                                                    "args": [
                                                        "200",
                                                        "M\ufffdlln\\n"
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    });
})
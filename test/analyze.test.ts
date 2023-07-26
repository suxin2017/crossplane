import { analyze } from '../src/analyzer';
import { CONTEXTS } from '../src/analyzerConstant';
import { NgxParserDirectiveContextError } from '../src/errors';
import { FileInput, Input, Lexer } from '../src/lexer';
import { join } from 'path'


describe('analyze module', () => {
    test('state directive', () => {
        let fname = '/path/to/nginx.conf'

        let stmt = {
            'directive': 'state',
            'args': ['/path/to/state/file.conf'],
            'line': 5
        }

        // # the state directive should not cause errors if it's in these contexts
        let goodContexts = [
            ['http', 'upstream'],
            ['stream', 'upstream'],
            ['some_third_party_context']
        ]

        for (const ctx of goodContexts) {
            analyze({
                fname,
                stmt,
                term: ';',
                ctx
            })
        }
        const badContexts = [['some_third_party_context']]

        for (const ctx of badContexts) {
            try {
                analyze({
                    fname,
                    stmt,
                    term: ';',
                    ctx
                })
            } catch (e) {
                expect(e).toBeInstanceOf(NgxParserDirectiveContextError)
            }
        }
    });

    test('flag directive', () => {
        let fname = '/path/to/nginx.conf'
        let ctx = ['events',];
        let stmt = {
            'directive': 'accept_mutex',
            'line': 2,
            'args': ['']
        }

        // # the state directive should not cause errors if it's in these contexts
        let goodArgs = [['on'], ['off'], ['On'], ['Off'], ['ON'], ['OFF']]


        for (const args of goodArgs) {
            stmt.args = args;
            analyze({
                fname,
                stmt,
                term: ';',
                ctx
            })
        }
        const badArgs = [['1'], ['0'], ['true'], ['okay'], ['']]

        for (const args of badArgs) {
            stmt.args = args;
            try {
                analyze({
                    fname,
                    stmt,
                    term: ';',
                    ctx
                })
            } catch (e) {
                expect((e.strerror as string).endsWith('it must be "on" or "off"')).toEqual(true)
            }
        }
    });
});

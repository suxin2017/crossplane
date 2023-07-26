import { CONTEXTS, DIRECTIVES, NGX_ANY_CONF, NGX_CONF_1MORE, NGX_CONF_2MORE, NGX_CONF_ANY, NGX_CONF_BLOCK, NGX_CONF_FLAG } from "./analyzerConstant";
import { NgxParserDirectiveArgumentsError, NgxParserDirectiveContextError, NgxParserDirectiveUnknownError } from "./errors";
import { Stmt, Ctx } from "./parser";


export function enterBlockCtx(stmt: Stmt, ctx?: Ctx): Ctx {
    if (ctx && ctx[0] === 'http' && stmt['directive'] == 'location') {
        return ['http', 'location'];
    }
    return [...(ctx ?? []), stmt['directive']];
}

export interface AnalyzeParams {
    fname: string,
    stmt: Stmt,
    term: any,
    ctx?: Ctx,
    strict?: boolean,
    checkCtx?: boolean,
    checkArgs?: boolean,
}

const defaultAnalyzerParams: Partial<AnalyzeParams> = {
    ctx: [],
    strict: false,
    checkCtx: true,
    checkArgs: true,
}
export function analyze(parameter: AnalyzeParams) {
    let { fname, stmt, term, ctx = [], strict, checkArgs, checkCtx } = { ...defaultAnalyzerParams, ...parameter }

    let { directive, line } = stmt;

    if (strict && !(directive in DIRECTIVES)) {
        throw new NgxParserDirectiveUnknownError(`unknown directive ${directive}`, fname, line)
    }

    if (!(ctx.toString() in CONTEXTS) || !(directive in DIRECTIVES)) {
        return;
    }


    let { args = [] } = stmt;

    let nArgs = args.length;

    let masks = DIRECTIVES[directive];

    if (checkCtx) {
        masks = masks.filter(mask => mask && CONTEXTS[ctx.toString()]);
        if (!masks) {
            throw new NgxParserDirectiveContextError(`${directive} directive is not allowed here`, fname, line)
        }
    }

    if (!checkArgs) {
        return
    }

    let validFlag = (x: string) => ['on', 'off'].includes(x.toLowerCase());

    let reason = '';
    for (let mask of masks.reverse()) {
        if (mask & NGX_CONF_BLOCK && term != '{') {
            reason = `directive ${directive} has no opening {`;
            continue;
        }

        if (!(mask & NGX_CONF_BLOCK) && term != ';') {
            reason = `directive ${directive} is not terminated by ";"`;
            continue;
        }

        if ((mask >> nArgs & 1 && nArgs <= 7) ||
            (mask & NGX_CONF_FLAG && nArgs == 1 && validFlag(args[0])) ||
            (mask & NGX_ANY_CONF && nArgs >= 0) ||
            (mask & NGX_CONF_1MORE && nArgs >= 1) ||
            (mask & NGX_CONF_2MORE && nArgs >= 2)
        ) {
            return
        }else if(mask & NGX_CONF_ANY && nArgs == 1 && !validFlag(args[0])){
             reason = `invalid value ${args[0]} in ${directive} directive, it must be "on" or "off"`;
            return
        }else{
            reason = `invalid number of arguments in ${directive} directive`;
        }
    }

    throw new NgxParserDirectiveArgumentsError(reason, fname, line);
};
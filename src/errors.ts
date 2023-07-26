export class NgxParserBaseException extends Error {
    filename: string;
    lineno?: number ;
    strerror: string;
    message: string;

    constructor(strerror: string, filename: string, lineno?: number ) {
        super();
        this.strerror = strerror;
        this.filename = filename;
        this.lineno = lineno;
        this.message = this.lineno !== null ? `${this.strerror} in ${this.filename}:${this.lineno}` : `${this.strerror} in ${this.filename}`;
    }
}

export class NgxParserSyntaxError extends NgxParserBaseException { }

export class NgxParserDirectiveError extends NgxParserBaseException { }

export class NgxParserDirectiveArgumentsError extends NgxParserDirectiveError { }

export class NgxParserDirectiveContextError extends NgxParserDirectiveError { }

export class NgxParserDirectiveUnknownError extends NgxParserDirectiveError { }
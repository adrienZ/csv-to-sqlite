/*
 * Copyright 2012-2013 Daniel Tillin
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * csvToArray v2.1 (Unminified for development)
 *
 * For documentation visit:
 * http://code.google.com/p/csv-to-array/
 *
 */

interface CsvToArrayOptions {
    fSep?: string[];
    rSep?: string;
    quot?: string;
    head?: boolean;
    trim?: boolean;
}

export function csvToArray(input: string, options?: CsvToArrayOptions): string[][] {
    const defaultOptions: CsvToArrayOptions = {
        fSep: [',', ';'],
        rSep: '\r\n',
        quot: '"',
        head: false,
        trim: false
    };

    const opts = { ...defaultOptions, ...options };

    let array: string[][] = [['']];
    let row = 0;
    let field = 0;
    let quote = 0;
    let char: string;

    for (let i = 0; i < input.length; i++) {
        char = input.charAt(i);
        switch (char) {
            case opts.quot:
                if (quote && input.charAt(i + 1) === opts.quot) {
                    array[row][field] += opts.quot;
                    i++;
                } else {
                    quote ^= 1;
                }
                break;
            default:
                if (opts.fSep.includes(char) && !quote) {
                    if (opts.trim) {
                        array[row][field] = array[row][field].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                    }
                    array[row][++field] = '';
                } else if (opts.rSep.charAt(0) === char && !quote && (!opts.rSep.charAt(1) || (opts.rSep.charAt(1) && opts.rSep.charAt(1) === input.charAt(i + 1)))) {
                    if (opts.trim) {
                        array[row][field] = array[row][field].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                    }
                    array[++row] = [''];
                    field = 0;
                    if (opts.rSep.charAt(1)) {
                        i++;
                    }
                } else {
                    array[row][field] += char;
                }
        }
    }

    if (opts.head) {
        array.shift();
    }

    if (array[array.length - 1].length < array[0].length) {
        array.pop();
    }

    return array;
}

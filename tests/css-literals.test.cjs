const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the actual page's Merge click handler without a browser dependency.
function app() {
    const elements = new Map();
    const storage = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            value: '', style: {}, parentElement: { style: {} }, listeners: {},
            classList: { add() {}, remove() {}, contains() { return false; } },
            addEventListener(event, callback) { this.listeners[event] = callback; },
            click() { this.listeners.click(); }
        });
        return elements.get(id);
    }
    const context = {
        console: { error() {} },
        document: {
            getElementById: element,
            addEventListener(event, callback) {
                if (event === 'DOMContentLoaded') this.ready = callback;
            }
        },
        localStorage: {
            getItem: key => storage.get(key),
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key)
        },
        requestAnimationFrame: callback => callback(),
        setTimeout: () => 1, clearTimeout() {}, navigator: {}, window: {}
    };
    const filename = process.env.CSS_MERGER_HTML || path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(filename, 'utf8');
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    context.document.ready();
    return {
        merge(oldCss, newCss = '') {
            element('old-css').value = oldCss;
            element('new-css').value = newCss;
            element('merge-btn').click();
            return element('result').value;
        },
        message: () => element('message').textContent,
        saved: () => storage.get('resultCss')
    };
}

const values = [
    '"left;right"', "'left;right'", '"}"', '"{"', '"/* visible */"',
    String.raw`"escaped \"; quote"`, String.raw`"backslash \\; value"`,
    '"@import url(other.css);"', '"CSSMERGER_LITERAL_0_END"'
];
for (const value of values) {
    test(`preserves content value ${value} and following declaration`, () => {
        const page = app();
        const output = page.merge(`.a::after { content: ${value}; color: red; }`);
        assert.ok(output.includes(`content: ${value};`), output);
        assert.ok(output.includes('color: red;'), output);
        assert.equal(page.saved(), output);
        assert.equal(page.message(), 'CSS successfully merged!');
    });
}
test('preserves a quoted data URL', () => {
    const value = 'url("data:image/svg+xml;utf8,<svg>{}</svg>")';
    assert.ok(app().merge(`.a { background-image: ${value}; color: red; }`).includes(`background-image: ${value};`));
});
test('new input overrides old value without damaging quoted punctuation', () => {
    const output = app().merge('.a { content: "old;value"; padding: 5px; }', '.a { content: "new;value"; }');
    assert.ok(output.includes('content: "new;value";'));
    assert.ok(output.includes('padding: 5px;'));
    assert.ok(!output.includes('old;value'));
});
test('new input alone preserves literals', () => {
    assert.ok(app().merge('', '.a { content: "a;b"; }').includes('content: "a;b";'));
});
test('quoted selector commas and repeated selectors preserve declarations', () => {
    const output = app().merge('[data-label="a,b"] { color: red; } [data-label="a,b"] { padding: 5px; }');
    assert.equal(output.match(/\[data-label="a,b"\]/g).length, 1);
    assert.ok(output.includes('color: red;'));
    assert.ok(output.includes('padding: 5px;'));
});
test('escaped selector punctuation is not a delimiter', () => {
    const output = app().merge(String.raw`.a\,b { color: red; } .c\{d { color: blue; }`);
    assert.ok(output.includes(String.raw`.a\,b {`));
    assert.ok(output.includes(String.raw`.c\{d {`));
});
test('actual comments are removed and ordinary merging still works', () => {
    const output = app().merge('/* comment */ .a { color: red; padding: 5px; }', '.a { color: blue; }');
    assert.ok(!output.includes('comment'));
    assert.ok(output.includes('color: blue;'));
    assert.ok(output.includes('padding: 5px;'));
});
test('quoted literals survive nested rule and at-rule storage', () => {
    const output = app().merge('@media screen { .a { content: "};"; } } .b { &::after { content: "/*x*/;"; } }');
    assert.ok(output.includes('content: "};";'));
    assert.ok(output.includes('content: "/*x*/;";'));
});
for (const invalid of ['.a { content: "unfinished; }']) {
    test(`refuses malformed input without replacing saved output: ${invalid}`, () => {
        const page = app();
        const previous = page.merge('.a { color: blue; }');
        assert.equal(page.merge(invalid), previous);
        assert.equal(page.saved(), previous);
        assert.match(page.message(), /Error merging CSS.*Unterminated CSS/);
    });
}
for (const value of ['url(https://example.com/*)', 'url(https://example.com/*/image.png)', 'url(data:image/png;base64,AAAA)', String.raw`url(image\).png)`]) {
    test(`preserves unquoted URL ${value}`, () => {
        const output = app().merge(`.a { background-image: ${value}; color: red; }`);
        assert.ok(output.includes(`background-image: ${value};`), output);
        assert.ok(output.includes('color: red;'), output);
    });
}
test('quoted URL functions allow comments containing quotes', () => {
    const output = app().merge(`.a { background: url("image.png" /* author's comment */); color: red; }`);
    assert.ok(output.includes('background: url("image.png" );'), output);
    assert.ok(output.includes('color: red;'), output);
    assert.ok(!output.includes('comment'), output);
});

test('does not reject an escaped URL function with a comment-looking marker', () => {
    const output = app().merge(String.raw`.a { background-image: u\72l(https://example.com/*); color: red; }`);
    assert.ok(output.includes(String.raw`background-image: u\72l(https://example.com/*);`), output);
    assert.ok(output.includes('color: red;'), output);
});

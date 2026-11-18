// Aria markdown parser regression tests (Node, no browser needed).
// Extracts the production parseMarkdownAndActions from decorators.js and
// exercises block/inline/streaming behavior directly.
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../extension/decorators.js', 'utf8');
const start = src.indexOf('function parseMarkdownAndActions(text, options) {');
const end = src.indexOf('async function submitAriaMessage() {');
assert(start >= 0 && end > start, 'parser anchors found');
eval(src.slice(start, end));

const md = (t) => parseMarkdownAndActions(t);
const stream = (t) => parseMarkdownAndActions(t, { streaming: true });
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; } else { failures.push(name); }
}

// Headings: every level, not just ## / ###
check('h1 renders', md('# Title').includes('<h1 class="aria-md-h1">Title</h1>'));
check('h2 renders', md('## Title').includes('<h2 class="aria-md-h2">Title</h2>'));
check('h3 renders', md('### Title').includes('<h3 class="aria-md-h3">Title</h3>'));
check('h4 renders (old parser dropped)', md('#### Deep').includes('<h4 class="aria-md-h4">Deep</h4>'));

// Lists: nesting, separation, ordered, tasks
const nested = md('- a\n  - b\n    - c\n- d');
check('nested lists produce 3 uls', (nested.match(/<ul>/g) || []).length === 3);
check('nested order preserved', nested.indexOf('a') < nested.indexOf('b') && nested.indexOf('b') < nested.indexOf('c'));
const separated = md('- a\n\nmiddle text\n\n- b');
check('separate lists are not merged', (separated.match(/<ul>/g) || []).length === 2);
check('paragraph between lists stays outside', separated.includes('<p>middle text</p>'));
check('ordered list renders', md('1. one\n2. two').includes('<ol><li>one</li><li>two</li></ol>'));
const tasks = md('- [ ] todo\n- [x] done');
check('task list checkboxes render', (tasks.match(/type="checkbox" disabled/g) || []).length === 2);
check('completed task is checked', tasks.includes('disabled checked'));
check('task marker text removed', !tasks.includes('[ ]') && !tasks.includes('[x]'));

// Tables: alignment, empty cells, inline formatting
const table = md('| Subject | Mark |\n| --- | --- |\n| Math | 90 |\n| Sci | |');
check('table renders with header', table.includes('<th>Subject</th>') && table.includes('<th>Mark</th>'));
check('empty body cell preserved', table.includes('<tr><td>Sci</td><td></td></tr>'));
check('table row count correct', (table.match(/<tr>/g) || []).length === 3);
check('bold inside table cell', md('| A |\n| --- |\n| **x** |').includes('<td><strong>x</strong></td>'));
check('non-table pipe text stays text', !md('a | b').includes('<table'));

// Code: fenced blocks and inline spans
const fenced = md('```js\nconst a = 1 < 2;\n```');
check('fenced block renders with language', fenced.includes('<pre class="aria-code-block" data-lang="js"><code>const a = 1 &lt; 2;</code></pre>'));
check('no stray backticks after fence', !fenced.includes('`'));
check('inline code escapes html', md('use `x < y` here').includes('<code>x &lt; y</code>'));
check('code content not emphasised', !md('`*not em*`').includes('<em>'));

// Links and inline styles
check('https link renders', md('[site](https://example.com)').includes('<a href="https://example.com" target="_blank" rel="noopener noreferrer">site</a>'));
check('javascript url blocked', !md('[bad](javascript:alert)').includes('<a '));
check('bold renders', md('**b**').includes('<strong>b</strong>'));
check('italic renders', md('*i*').includes('<em>i</em>'));
check('bold-italic renders', md('***bi***').includes('<strong><em>bi</em></strong>'));
check('strikethrough renders', md('~~d~~').includes('<del>d</del>'));
check('underscore italic renders', md('_u_').includes('<em>u</em>'));
check('snake_case untouched', !md('snake_case_name').includes('<em>'));
check('math stars untouched', !md('2 * 3 * 4').includes('<em>'));

// Blockquotes
check('blockquote renders', md('> line a\n> line b').includes('<blockquote class="aria-md-quote">line a<br>line b</blockquote>'));

// Chips and tools
check('action chip renders', md('[action:nav:attendance|View Attendance]').includes('class="aria-action-chip" data-action="nav:attendance"'));
check('tool card renders', md('[tool:getStudentDossier()]').includes('aria-thinking-card'));
check('chip label is escaped', !md('[action:nav:x|<img src=x>]').includes('<img'));

// Safety and structure
check('raw html escaped', !md('<img src=x onerror=alert(1)>').includes('<img'));
const blocks = md('## T\n\n| A |\n| --- |\n| 1 |\n\n- x\n\n```\ncode\n```');
check('no invalid p-wrapping of blocks', !/<p><(div|ul|ol|h\d|pre|blockquote)/.test(blocks));
check('plain numbers survive token restore', md('scored 85 marks in 2024 with 100 percent').includes('85') && md('scored 85 marks in 2024').includes('2024'));
check('single newline becomes br', md('line one\nline two').includes('line one<br>line two'));
check('crlf input works', md('a\r\nb').includes('a<br>b'));

// Streaming: partial tokens must not flash raw
check('partial chip hidden while streaming', !stream('thinking [action:nav:at').includes('[action'));
check('partial link hidden while streaming', !stream('see [docs](https://exa').includes('](https://exa'));
const openFence = stream('```py\nx = 1');
check('unclosed fence renders as code block', openFence.includes('data-lang="py"') && openFence.includes('x = 1') && !openFence.includes('```'));
check('unclosed inline code auto-closes', stream('some `code').includes('<code>code</code>'));
check('complete chip survives streaming', stream('[action:nav:fees|Fees]').includes('aria-action-chip'));
check('final mode keeps complete tokens', md('[docs](https://example.com)').includes('<a '));

if (failures.length) {
  console.error('FAIL:', failures.join(' | '));
  process.exit(1);
}
console.log(`PASS: ${passed} Aria markdown checks (headings, nested/ordered/task lists, tables, fenced + inline code, links, emphasis, blockquotes, chips, XSS escaping, streaming).`);

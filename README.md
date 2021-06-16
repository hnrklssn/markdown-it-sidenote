# markdown-it-sidenote

> Sidenotes plugin for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

This is a hard fork of [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote). A sidenote is displayed in the margin next to the main text instead of at the bottom of the page like a footnote. For examples of sidenotes, see [Tufte CSS](https://edwardtufte.github.io/tufte-css/). To display the sidenote next to the text you will need to apply CSS to the output HTML. Otherwise it will position itself as a "footnote" at the end of the current paragraph. Indeed, on mobile screens an inline note (potentially starting collapsed) may be preferable due to lack of horizontal screen space.
Versions 4.0.0+ have sidenotes support to avoid clashing with the previous versions of markdown-it-footnote before the fork.

__v2.+ requires `markdown-it` v5.+, see changelog.__

The only supported syntax is anonymous inline sidenotes. The syntax referred to as normal syntax in markdown-it-footnote is _not_ supported. PRs re-adding it are welcome, but I will not maintain the feature as I do not use it personally.

__Inline sidenote__:

```
Here is an inline note.^[Inlines notes are easier to write, since
you don't have to pick an identifier and move down to type the
note.] Here is the rest of the paragraph.

Here is another paragraph.
```

html:

```html
<p>Here is an inline note.<sup class="sidenote-ref"><a href="#fn1" id="fnref1">[1]</a></sup> Here is the rest of the paragraph.</p>
<aside id="fn1" class="sidenote" role="note">
    <output aria-hidden="true" class="highlight" id="fn1-content">
    <label role="presentation" for="fnref1"><p>Inlines notes are easier to write, since
you don't have to pick an identifier and move down to type the
note. <a href="#fnref1" class="sidenote-backref">↩︎</a></p>
</label></output></aside>
<p>Here is another paragraph.</p>
```


## Install

node.js, browser:

```bash
npm install markdown-it-sidenote --save
bower install markdown-it-sidenote --save
```

## Use

```js
var md = require('markdown-it')()
            .use(require('markdown-it-sidenote'));

md.render(/*...*/) // See examples above
```

_Differences in browser._ If you load script directly into the page, without
package system, module will add itself globally as `window.markdownitFootnote`.


### Customize

If you want to customize the output, you'll need to replace the template
functions. To see which templates exist and their default implementations,
look in [`index.js`](index.js). The API of these template functions is out of
scope for this plugin's documentation; you can read more about it [in the
markdown-it
documentation](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer).

For examples, see markdown-it-footnote.


## License

[MIT](https://github.com/hnrklssn/markdown-it-sidenote/blob/master/LICENSE)

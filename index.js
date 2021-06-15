// Process footnotes
//
'use strict';

////////////////////////////////////////////////////////////////////////////////
// Renderer partials

function render_footnote_anchor_name(tokens, idx, options, env/*, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();
  var prefix = '';

  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-';
  }

  return prefix + n;
}

function render_footnote_caption(tokens, idx/*, options, env, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();

  if (tokens[idx].meta.subId > 0) {
    n += ':' + tokens[idx].meta.subId;
  }

  return '[' + n + ']';
}

function render_footnote_ref(tokens, idx, options, env, slf) {
  var id      = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
  var caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
  var refid   = id;

  if (tokens[idx].meta.subId > 0) {
    refid += ':' + tokens[idx].meta.subId;
  }

  return '<sup class="footnote-ref"><a href="#fn' + id + '" id="fnref' + refid + '">' + caption + '</a></sup>';
}

function render_footnote_open(tokens, idx, options, env, slf) {
  var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  return `<aside id="fn${id}" class="sidenote" role="note">
    <output aria-hidden="true" class="highlight" id="fn${id}-content">
    <label role="presentation" for="fnref${id}">`;
}

function render_footnote_close() {
  return '</label></output></aside>\n';
}

function render_footnote_anchor(tokens, idx, options, env, slf) {
  var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  /* ↩ with escape code to prevent display as Apple Emoji on iOS */
  return ' <a href="#fnref' + id + '" class="footnote-backref">\u21a9\uFE0E</a>';
}


module.exports = function footnote_plugin(md) {
  var parseLinkLabel = md.helpers.parseLinkLabel;

  md.renderer.rules.footnote_ref          = render_footnote_ref;
  md.renderer.rules.footnote_open         = render_footnote_open;
  md.renderer.rules.footnote_close        = render_footnote_close;
  md.renderer.rules.footnote_anchor       = render_footnote_anchor;

  // helpers (only used in other rules, no tokens are attached to those)
  md.renderer.rules.footnote_caption      = render_footnote_caption;
  md.renderer.rules.footnote_anchor_name  = render_footnote_anchor_name;

  // Process inline footnotes (^[...])
  function footnote_inline(state, silent) {
    var labelStart,
        labelEnd,
        footnoteId,
        token,
        tokens = [],
        max = state.posMax,
        start = state.pos;

    if (start + 2 >= max) { return false; }
    if (state.src.charCodeAt(start) !== 0x5E/* ^ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5B/* [ */) { return false; }

    labelStart = start + 2;
    labelEnd = parseLinkLabel(state, start + 1);

    // parser failed to find ']', so it's not a valid note
    if (labelEnd < 0) { return false; }

    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      if (!state.env.footnotes) { state.env.footnotes = {}; }
      if (!state.env.footnotes.list) { state.env.footnotes.list = []; }
      footnoteId = state.env.footnotes.list.length;

      state.md.inline.parse(
        state.src.slice(labelStart, labelEnd),
        state.md,
        state.env,
        tokens
      );

      token      = state.push('footnote_ref', '', 0);
      token.meta = { id: footnoteId };

      state.env.footnotes.list[footnoteId] = {
        content: state.src.slice(labelStart, labelEnd),
        tokens
      };
    }

    state.pos = labelEnd + 1;
    state.posMax = max;
    return true;
  }

  function contains_footnote(tok) {
    return tok.children && tok.children.some(child => child.type === 'footnote_ref');
  }

  function create_footnote_list_element(state, footnote, i) {
    const tokens = [];
    var token      = new state.Token('footnote_open', '', 1);
    token.meta = { id: i, label: footnote.label };
    tokens.push(token);

    if (footnote.tokens) {
      token          = new state.Token('paragraph_open', 'p', 1);
      token.block    = true;
      tokens.push(token);

      token          = new state.Token('inline', '', 0);
      token.children = footnote.tokens;
      token.content  = footnote.content;
      tokens.push(token);

      token          = new state.Token('paragraph_close', 'p', -1);
      token.block    = true;
      tokens.push(token);
    }

    let lastParagraph;
    if (tokens[tokens.length - 1].type === 'paragraph_close') {
      lastParagraph = tokens.pop();
    } else {
      lastParagraph = null;
    }

    const t = footnote.count > 0 ? footnote.count : 1;
    for (let j = 0; j < t; j++) {
      token      = new state.Token('footnote_anchor', '', 0);
      token.meta = { id: i, subId: j, label: footnote.label };
      tokens.push(token);
    }

    if (lastParagraph) {
      tokens.push(lastParagraph);
    }

    token = new state.Token('footnote_close', '', -1);
    tokens.push(token);
    return tokens;
  }

  // Glue footnote tokens to end of paragraph
  function footnote_tail(state) {
    if (!state.env.footnotes) { return; }

    const footnotes = state.env.footnotes.list;
    const stack = [];
    while (footnotes.length) {
      const footnote = footnotes.pop();
      let tok = state.tokens.pop();
      // search backwards for footnote reference
      while (tok.type !== 'inline' || !contains_footnote(tok)) {
        stack.push(tok);
        tok = state.tokens.pop();
      }
      if (!contains_footnote(tok)) {
        throw new Error('missing footnote ref');
      }
      const stack2 = [ tok ];
      tok = stack.pop();
      // search forwards for end of paragraph containing footnote ref
      while (tok.type !== 'paragraph_close') {
        stack2.push(tok);
        tok = stack.tokens.pop();
      }
      stack2.push(tok); // push back paragraph close
      const footnote_tokens = create_footnote_list_element(state, footnote, footnotes.length);
      footnote_tokens.reverse();
      stack.push(...footnote_tokens); // insert footnote content after end of paragraph
      stack2.reverse();
      stack.push(...stack2); // save [footnote_ref,paragraph_close] range to on stack so we can search for the next ref
    }
    stack.reverse();
    state.tokens.push(...stack);
    //return true
  }

  md.inline.ruler.after('image', 'footnote_inline', footnote_inline);
  md.core.ruler.after('inline', 'footnote_tail', footnote_tail);
};

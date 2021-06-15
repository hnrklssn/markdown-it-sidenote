/*! markdown-it-sidenote 3.0.3 https://github.com//markdown-it/markdown-it-sidenote @license MIT */(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownitFootnote = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Process sidenotes
//
'use strict';

////////////////////////////////////////////////////////////////////////////////
// Renderer partials

function render_sidenote_anchor_name(tokens, idx, options, env/*, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();
  var prefix = '';

  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-';
  }

  return prefix + n;
}

function render_sidenote_caption(tokens, idx/*, options, env, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();

  if (tokens[idx].meta.subId > 0) {
    n += ':' + tokens[idx].meta.subId;
  }

  return '[' + n + ']';
}

function render_sidenote_ref(tokens, idx, options, env, slf) {
  var id      = slf.rules.sidenote_anchor_name(tokens, idx, options, env, slf);
  var caption = slf.rules.sidenote_caption(tokens, idx, options, env, slf);
  var refid   = id;

  if (tokens[idx].meta.subId > 0) {
    refid += ':' + tokens[idx].meta.subId;
  }

  return '<sup class="sidenote-ref"><a href="#fn' + id + '" id="fnref' + refid + '">' + caption + '</a></sup>';
}

function render_sidenote_open(tokens, idx, options, env, slf) {
  var id = slf.rules.sidenote_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  return `<aside id="fn${id}" class="sidenote" role="note">
    <output aria-hidden="true" class="highlight" id="fn${id}-content">
    <label role="presentation" for="fnref${id}">`;
}

function render_sidenote_close() {
  return '</label></output></aside>\n';
}

function render_sidenote_anchor(tokens, idx, options, env, slf) {
  var id = slf.rules.sidenote_anchor_name(tokens, idx, options, env, slf);

  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }

  /* ↩ with escape code to prevent display as Apple Emoji on iOS */
  return ' <a href="#fnref' + id + '" class="sidenote-backref">\u21a9\uFE0E</a>';
}


module.exports = function sidenote_plugin(md) {
  var parseLinkLabel = md.helpers.parseLinkLabel;

  md.renderer.rules.sidenote_ref          = render_sidenote_ref;
  md.renderer.rules.sidenote_open         = render_sidenote_open;
  md.renderer.rules.sidenote_close        = render_sidenote_close;
  md.renderer.rules.sidenote_anchor       = render_sidenote_anchor;

  // helpers (only used in other rules, no tokens are attached to those)
  md.renderer.rules.sidenote_caption      = render_sidenote_caption;
  md.renderer.rules.sidenote_anchor_name  = render_sidenote_anchor_name;

  // Process inline sidenotes (^[...])
  function sidenote_inline(state, silent) {
    var labelStart,
        labelEnd,
        sidenoteId,
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
      if (!state.env.sidenotes) { state.env.sidenotes = {}; }
      if (!state.env.sidenotes.list) { state.env.sidenotes.list = []; }
      sidenoteId = state.env.sidenotes.list.length;

      state.md.inline.parse(
        state.src.slice(labelStart, labelEnd),
        state.md,
        state.env,
        tokens
      );

      token      = state.push('sidenote_ref', '', 0);
      token.meta = { id: sidenoteId };

      state.env.sidenotes.list[sidenoteId] = {
        content: state.src.slice(labelStart, labelEnd),
        tokens
      };
    }

    state.pos = labelEnd + 1;
    state.posMax = max;
    return true;
  }

  function contains_sidenote(tok) {
    return tok.children && tok.children.some(child => child.type === 'sidenote_ref');
  }

  function create_sidenote_list_element(state, sidenote, i) {
    const tokens = [];
    var token      = new state.Token('sidenote_open', '', 1);
    token.meta = { id: i, label: sidenote.label };
    tokens.push(token);

    if (sidenote.tokens) {
      token          = new state.Token('paragraph_open', 'p', 1);
      token.block    = true;
      tokens.push(token);

      token          = new state.Token('inline', '', 0);
      token.children = sidenote.tokens;
      token.content  = sidenote.content;
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

    const t = sidenote.count > 0 ? sidenote.count : 1;
    for (let j = 0; j < t; j++) {
      token      = new state.Token('sidenote_anchor', '', 0);
      token.meta = { id: i, subId: j, label: sidenote.label };
      tokens.push(token);
    }

    if (lastParagraph) {
      tokens.push(lastParagraph);
    }

    token = new state.Token('sidenote_close', '', -1);
    tokens.push(token);
    return tokens;
  }

  // Glue sidenote tokens to end of paragraph
  function sidenote_tail(state) {
    if (!state.env.sidenotes) { return; }

    const sidenotes = state.env.sidenotes.list;
    const stack = [];
    while (sidenotes.length) {
      const sidenote = sidenotes.pop();
      let tok = state.tokens.pop();
      // search backwards for sidenote reference
      while (tok.type !== 'inline' || !contains_sidenote(tok)) {
        stack.push(tok);
        tok = state.tokens.pop();
      }
      if (!contains_sidenote(tok)) {
        throw new Error('missing sidenote ref');
      }
      const stack2 = [ tok ];
      tok = stack.pop();
      // search forwards for end of paragraph containing sidenote ref
      while (tok.type !== 'paragraph_close') {
        stack2.push(tok);
        tok = stack.tokens.pop();
      }
      stack2.push(tok); // push back paragraph close
      const sidenote_tokens = create_sidenote_list_element(state, sidenote, sidenotes.length);
      sidenote_tokens.reverse();
      stack.push(...sidenote_tokens); // insert sidenote content after end of paragraph
      stack2.reverse();
      stack.push(...stack2); // save [sidenote_ref,paragraph_close] range to on stack so we can search for the next ref
    }
    stack.reverse();
    state.tokens.push(...stack);
    //return true
  }

  md.inline.ruler.after('image', 'sidenote_inline', sidenote_inline);
  md.core.ruler.after('inline', 'sidenote_tail', sidenote_tail);
};

},{}]},{},[1])(1)
});

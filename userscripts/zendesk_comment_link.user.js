// ==UserScript==
// @name           ZenDesk Comment Permalinks
// @namespace      holatuwol
// @license        0BSD
// @version        1.6
// @updateURL      https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/zendesk_comment_link.user.js
// @downloadURL    https://raw.githubusercontent.com/holatuwol/liferay-faster-deploy/master/userscripts/zendesk_comment_link.user.js
// @match          https://*.zendesk.com/agent/*
// @grant          none
// ==/UserScript==

var styleElement = document.createElement('style');

styleElement.textContent = `
.lesa-ui-event-highlighted {
  background-color: #eee;
}

.lesa-ui-permalink {
  margin-bottom: 1em;
}

.lesa-ui-permalink > input {
  background-color: transparent;
  width: 100%;
}
`;

document.querySelector('head').appendChild(styleElement);

/**
 * Removes the highlight class from all comments.
 */

function clearHighlightedComments() {
  var highlightedComments = document.querySelectorAll('.lesa-ui-event-highlighted');

  for (var i = 0; i < highlightedComments.length; i++) {
    highlightedComments[i].classList.remove('lesa-ui-event-highlighted');
  }
}

/**
 * Scroll to a specific comment if its comment ID is included in a
 * query string parameter.
 */

var integerRegex = /^[0-9]*$/

function highlightComment(commentId, event) {
  if (!commentId && !document.location.search) {
    clearHighlightedComments();

    return;
  }

  if (!commentId && document.location.search && document.location.search.indexOf('?comment=') == 0) {
    commentId = document.location.search.substring(9);

    var pos = commentId.indexOf('&');

    if (pos != -1) {
      commentId = commentId.substring(0, pos);
    }
  }

  if (!commentId || !integerRegex.test(commentId)) {
    return;
  }

  var comment = document.querySelector('div[data-comment-id="' + commentId + '"]');

  if (!comment) {
    return;
  }

  var event = comment.closest('.event');

  if (event.classList.contains('lesa-ui-event-highlighted')) {
    return;
  }

  var commentURL = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;

  history.pushState({path: commentURL}, '', commentURL);

  clearHighlightedComments();

  event.classList.add('lesa-ui-event-highlighted');
  event.scrollIntoView();
}

/**
 * Creates a self-highlighting input field.
 */

function createPermaLinkInputField(permalinkHREF) {
  var permalink = document.createElement('input');

  permalink.value = permalinkHREF;

  permalink.onclick = function() {
    this.setSelectionRange(0, this.value.length);
  };

  return permalink;
}

/**
 * Add the comment ID as a query string parameter to function as a
 * pseudo permalink (since this script scrolls to it).
 */

function addPermaLinks(ticketId, ticketInfo, conversation) {
  var permalinks = conversation.querySelectorAll('div[data-comment-id] div.lesa-ui-permalink');

  if (permalinks.length > 0) {
    return;
  }

  var comments = conversation.querySelectorAll('div[data-comment-id]');

  for (var i = 0; i < comments.length; i++) {
    var commentId = comments[i].getAttribute('data-comment-id');

    var permalinkContainer = document.createElement('div');
    permalinkContainer.classList.add('lesa-ui-permalink');

    var permalinkHREF = 'https://' + document.location.host + document.location.pathname + '?comment=' + commentId;
    var permalink = createPermaLinkInputField(permalinkHREF);

    permalinkContainer.appendChild(permalink);

    var commentHeader = comments[i].querySelector('.content .header');
    commentHeader.appendChild(permalinkContainer);
  }
}

/**
 * Attempt to bypass the single page application framework used by
 * ZenDesk and force a page reload.
 */

function skipSinglePageApplication(href) {
  document.location.href = href;

  return false;
}

/**
 * If it's a regular ZenDesk link, fix it by making the anchor's onclick
 * event scroll to the comment (if applicable).
 */

function fixZenDeskLink(anchor) {
  var href = anchor.href;

  var x = href.indexOf('/tickets/');

  if (x == -1) {
    return;
  }

  var y = href.indexOf('?comment=');

  if (y == -1) {
    return;
  }

  anchor.removeAttribute('href');

  if (href.substring(x + 9, y) == ticketId) {
    var commentId = href.substring(y + 9);

    anchor.onclick = highlightComment.bind(null, commentId);
  }
  else {
    var commentURL = 'https://' + document.location.host + '/agent' + href.substring(x);

    anchor.onclick = skipSinglePageApplication.bind(null, commentURL);
  }
}

/**
 * Detect any existing permalinks on the page, and make them open in
 * a new tab (if they are an existing ticket) or auto-scroll.
 */

function fixPermaLinkAnchors(ticketId, ticketInfo, conversation) {
  var permalinks = conversation.querySelectorAll('div[data-comment-id] div.lesa-ui-permalink');

  if (permalinks.length > 0) {
    return;
  }

  var anchors = conversation.querySelectorAll('a');

  for (var i = 0; i < anchors.length; i++) {
    var anchor = anchors[i];

    fixZenDeskLink(anchor);
  }
}

/**
 * Since there's an SPA framework in place that I don't fully understand, attempt to
 * apply updates once per second, once we have the ticket information.
 */

function checkForConversations() {
  var ticketPath = '/agent/tickets/';

  if (document.location.pathname.indexOf(ticketPath) == 0) {
    var ticketId = document.location.pathname.substring(ticketPath.length);

    var pos = ticketId.indexOf('/');

    if (pos != -1) {

    }
    else {
      var conversation = document.querySelector('div[data-side-conversations-anchor-id="' + ticketId + '"]');

      if (conversation) {
        fixPermaLinkAnchors(ticketId, null, conversation);
        addPermaLinks(ticketId, null, conversation);
      }

      highlightComment();
    }
  }
  else {

  }
}

setInterval(checkForConversations, 1000);
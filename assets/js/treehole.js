(function () {
  'use strict';

  var config = {
    supabaseUrl: 'https://wdszjpxvelycmohewvgk.supabase.co',
    publishableKey: 'sb_publishable_5I7bn53-MdadL1aTjddfNw_-GlgDUfu',
    table: 'treehole_messages',
    submitFunction: 'treehole-submit'
  };

  var root = document.querySelector('[data-treehole-root]');
  if (!root) return;

  var form = root.querySelector('[data-treehole-form]');
  var nicknameInput = root.querySelector('[data-treehole-nickname]');
  var moodInput = root.querySelector('[data-treehole-mood]');
  var contentInput = root.querySelector('[data-treehole-content]');
  var countLabel = root.querySelector('[data-treehole-count]');
  var statusLabel = root.querySelector('[data-treehole-status]');
  var submitButton = root.querySelector('[data-treehole-submit]');
  var refreshButton = root.querySelector('[data-treehole-refresh]');
  var list = root.querySelector('[data-treehole-list]');

  var moodLabels = {
    whisper: 'Whisper',
    spark: 'Spark',
    rain: 'Rain',
    memory: 'Memory',
    question: 'Question'
  };

  function setStatus(message, type) {
    statusLabel.textContent = message || '';
    statusLabel.dataset.state = type || '';
  }

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Posting...' : 'Post';
  }

  function getSessionId() {
    var key = 'treehole_session_id';
    var saved = window.localStorage.getItem(key);
    if (saved) return saved;

    var id = window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    window.localStorage.setItem(key, id);
    return id;
  }

  function updateCount() {
    countLabel.textContent = String(contentInput.value.length) + ' / 800';
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderEmpty(message) {
    clearNode(list);
    var empty = document.createElement('p');
    empty.className = 'treehole-empty';
    empty.textContent = message;
    list.appendChild(empty);
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (_) {
      return '';
    }
  }

  function renderMessages(messages) {
    clearNode(list);
    if (!messages.length) {
      renderEmpty('No notes yet.');
      return;
    }

    var fragment = document.createDocumentFragment();
    messages.forEach(function (message) {
      var article = document.createElement('article');
      article.className = 'treehole-note';
      article.dataset.mood = message.mood || 'whisper';

      var meta = document.createElement('div');
      meta.className = 'treehole-note__meta';

      var name = document.createElement('span');
      name.className = 'treehole-note__name';
      name.textContent = message.nickname || 'Anonymous';

      var mood = document.createElement('span');
      mood.className = 'treehole-note__mood';
      mood.textContent = moodLabels[message.mood] || moodLabels.whisper;

      var time = document.createElement('time');
      time.dateTime = message.created_at || '';
      time.textContent = formatDate(message.created_at);

      meta.appendChild(name);
      meta.appendChild(mood);
      meta.appendChild(time);

      var content = document.createElement('p');
      content.className = 'treehole-note__content';
      content.textContent = message.content || '';

      article.appendChild(meta);
      article.appendChild(content);
      fragment.appendChild(article);
    });

    list.appendChild(fragment);
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(payload.error || 'Request failed.');
    }
    return payload;
  }

  async function loadMessages() {
    renderEmpty('Loading...');
    var endpoint = config.supabaseUrl +
      '/rest/v1/' +
      config.table +
      '?select=id,nickname,content,mood,created_at&status=eq.published&order=created_at.desc&limit=60';

    try {
      var messages = await requestJson(endpoint, {
        headers: {
          apikey: config.publishableKey
        }
      });
      renderMessages(Array.isArray(messages) ? messages : []);
    } catch (error) {
      renderEmpty('The board is unavailable right now.');
    }
  }

  async function submitMessage(event) {
    event.preventDefault();

    var content = contentInput.value.trim();
    if (content.length < 2) {
      setStatus('Leave at least two characters.', 'error');
      return;
    }

    setLoading(true);
    setStatus('', '');

    try {
      var endpoint = config.supabaseUrl + '/functions/v1/' + config.submitFunction;
      var payload = await requestJson(endpoint, {
        method: 'POST',
        headers: {
          apikey: config.publishableKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nickname: nicknameInput.value,
          mood: moodInput.value,
          content: content,
          sessionId: getSessionId()
        })
      });

      contentInput.value = '';
      updateCount();
      setStatus(payload.message && payload.message.status === 'hidden'
        ? 'Saved.'
        : 'Posted.',
      'success');
      await loadMessages();
    } catch (error) {
      setStatus(error.message || 'Unable to post.', 'error');
    } finally {
      setLoading(false);
    }
  }

  contentInput.addEventListener('input', updateCount);
  form.addEventListener('submit', submitMessage);
  refreshButton.addEventListener('click', loadMessages);
  updateCount();
  loadMessages();
}());

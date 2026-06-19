(function () {
  'use strict';

  var config = {
    supabaseUrl: 'https://wdszjpxvelycmohewvgk.supabase.co',
    anonKey: 'sb_publishable_5I7bn53-MdadL1aTjddfNw_-GlgDUfu',
    table: 'treehole_messages',
    submitFunction: 'treehole-submit',
    secretLookupFunction: 'treehole-secret-lookup'
  };

  var maxContentLength = 100;

  var copy = {
    zh: {
      kicker: '何人斯',
      heroTitle: '究竟是什么人？在外面的声音',
      heroLead: '只可能在外面。你的心地幽深莫测',
      formTitle: '留下你的话',
      formLead: '公开留言会在审核后出现在右侧。秘密留言只凭四位密码查看。',
      nameLabel: '名字',
      emailLabel: '邮箱（可选）',
      messageLabel: '留言',
      secretLabel: '秘密',
      passcodeLabel: '四位数密码',
      passcodeHint: '请留下四位数密码。',
      boardTitle: '回声',
      boardLead: '审核后的公开留言会在这里慢慢浮上来。',
      refresh: '刷新',
      loading: '正在听...',
      empty: '还没有公开留言。',
      submit: '投递',
      submitting: '投递中...',
      posted: '已投递。',
      secretPosted: '已投递。请记住四位数密码。',
      hiddenPosted: '已投递，审核后公开。',
      invalidContent: '留言需要 2 到 100 个字。',
      invalidEmail: '邮箱格式不太对。',
      invalidPasscode: '请输入四位数字。',
      submitError: '暂时投递不了。',
      loadError: '暂时听不到回声。',
      duplicate: '这句话刚刚已经投递过。',
      tooMany: '投递太频繁了，稍后再试。',
      anonymous: '匿名',
      languageButton: 'English',
      namePlaceholder: 'Anonymous',
      emailPlaceholder: 'you@example.com',
      messagePlaceholder: '写在这里',
      passcodePlaceholder: '0000',
      secretReaderTitle: '查看秘密回复',
      secretReaderLead: '输入四位数密码。',
      secretLookupLabel: '四位数密码',
      secretLookupSubmit: '查看',
      secretLookupLoading: '查询中...',
      secretLookupEmpty: '没有找到对应的秘密留言。',
      secretLookupFound: '找到了。',
      secretLookupError: '暂时无法查看。',
      noReplyYet: '尚未回复。',
      replyLabel: '回复'
    },
    en: {
      kicker: 'TreeHole',
      heroTitle: 'Who is there? The outside voice',
      heroLead: 'can only remain outside. Your inner ground is deep and unknowable.',
      formTitle: 'Leave a note',
      formLead: 'Public notes appear on the right after review. Secret notes can be opened only with a four-digit code.',
      nameLabel: 'Name',
      emailLabel: 'Email (optional)',
      messageLabel: 'Message',
      secretLabel: 'Secret',
      passcodeLabel: 'Four-digit code',
      passcodeHint: 'Leave a four-digit code.',
      boardTitle: 'Echoes',
      boardLead: 'Reviewed public notes will surface here.',
      refresh: 'Refresh',
      loading: 'Listening...',
      empty: 'No public notes yet.',
      submit: 'Send',
      submitting: 'Sending...',
      posted: 'Sent.',
      secretPosted: 'Sent. Remember the four-digit code.',
      hiddenPosted: 'Sent and waiting for review.',
      invalidContent: 'Message must be 2 to 100 characters.',
      invalidEmail: 'Email format looks wrong.',
      invalidPasscode: 'Enter four digits.',
      submitError: 'Could not send right now.',
      loadError: 'Could not load echoes.',
      duplicate: 'This note was just sent.',
      tooMany: 'Too many messages. Try again later.',
      anonymous: 'Anonymous',
      languageButton: '中文',
      namePlaceholder: 'Anonymous',
      emailPlaceholder: 'you@example.com',
      messagePlaceholder: 'Write here',
      passcodePlaceholder: '0000',
      secretReaderTitle: 'Read Secret Reply',
      secretReaderLead: 'Enter the four-digit code.',
      secretLookupLabel: 'Four-digit code',
      secretLookupSubmit: 'Read',
      secretLookupLoading: 'Checking...',
      secretLookupEmpty: 'No secret note was found for that code.',
      secretLookupFound: 'Found.',
      secretLookupError: 'Could not check right now.',
      noReplyYet: 'No reply yet.',
      replyLabel: 'Reply'
    }
  };

  var root = document.querySelector('[data-treehole-root]');
  if (!root) return;

  var form = root.querySelector('[data-treehole-form]');
  var nicknameInput = root.querySelector('[data-treehole-nickname]');
  var emailInput = root.querySelector('[data-treehole-email]');
  var contentInput = root.querySelector('[data-treehole-content]');
  var websiteInput = root.querySelector('[data-treehole-website]');
  var secretCheckbox = root.querySelector('[data-treehole-secret]');
  var passcodeField = root.querySelector('[data-treehole-passcode-field]');
  var passcodeInput = root.querySelector('[data-treehole-passcode]');
  var countLabel = root.querySelector('[data-treehole-count]');
  var statusLabel = root.querySelector('[data-treehole-status]');
  var submitButton = root.querySelector('[data-treehole-submit]');
  var refreshButton = root.querySelector('[data-treehole-refresh]');
  var languageToggle = root.querySelector('[data-treehole-lang-toggle]');
  var list = root.querySelector('[data-treehole-list]');
  var secretLookupForm = root.querySelector('[data-treehole-secret-lookup-form]');
  var lookupPasscodeInput = root.querySelector('[data-treehole-lookup-passcode]');
  var lookupButton = root.querySelector('[data-treehole-secret-lookup-submit]');
  var secretStatus = root.querySelector('[data-treehole-secret-status]');
  var secretResults = root.querySelector('[data-treehole-secret-results]');

  var language = root.dataset.treeholeLang === 'en' ? 'en' : 'zh';

  function text(key) {
    return copy[language][key] || copy.zh[key] || key;
  }

  function applyLanguage() {
    root.dataset.treeholeLang = language;

    root.querySelectorAll('[data-i18n]').forEach(function (node) {
      var key = node.getAttribute('data-i18n');
      node.textContent = text(key);
    });

    if (languageToggle) {
      languageToggle.textContent = text('languageButton');
      languageToggle.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换到中文');
    }

    if (nicknameInput) nicknameInput.placeholder = text('namePlaceholder');
    if (emailInput) emailInput.placeholder = text('emailPlaceholder');
    if (contentInput) contentInput.placeholder = text('messagePlaceholder');
    if (passcodeInput) passcodeInput.placeholder = text('passcodePlaceholder');
    if (lookupPasscodeInput) lookupPasscodeInput.placeholder = text('passcodePlaceholder');
    if (submitButton) submitButton.textContent = text('submit');

    var visibleEmpty = list && list.querySelector('.treehole-empty');
    if (visibleEmpty) {
      var emptyKey = visibleEmpty.dataset.emptyKey || 'empty';
      visibleEmpty.textContent = text(emptyKey);
    }

    var visibleReplyPlaceholders = root.querySelectorAll('[data-treehole-no-reply]');
    visibleReplyPlaceholders.forEach(function (node) {
      node.textContent = text('noReplyYet');
    });
  }

  function setStatus(message, type) {
    if (!statusLabel) return;
    statusLabel.textContent = message || '';
    statusLabel.dataset.state = type || '';
  }

  function setSecretStatus(message, type) {
    if (!secretStatus) return;
    secretStatus.textContent = message || '';
    secretStatus.dataset.state = type || '';
  }

  function setSubmitting(isSubmitting) {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? text('submitting') : text('submit');
  }

  function setLookingUp(isLookingUp) {
    if (!lookupButton) return;
    lookupButton.disabled = isLookingUp;
    lookupButton.textContent = isLookingUp ? text('secretLookupLoading') : text('secretLookupSubmit');
  }

  function getSessionId() {
    var key = 'treehole_session_id';
    try {
      var existing = window.localStorage.getItem(key);
      if (existing) return existing;
      var created =
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      window.localStorage.setItem(key, created);
      return created;
    } catch (_error) {
      return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    }
  }

  function getClientMeta() {
    var screenSize = window.screen
      ? String(window.screen.width) + 'x' + String(window.screen.height) + '@' + String(window.devicePixelRatio || 1)
      : '';
    var viewport = String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0);

    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      language: navigator.language || '',
      languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 6) : [],
      platform: navigator.platform || '',
      screen: screenSize,
      viewport: viewport,
      hardwareConcurrency: navigator.hardwareConcurrency || '',
      deviceMemory: navigator.deviceMemory || ''
    };
  }

  function normalizeContent(value) {
    return String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(function (line) {
        return line.trim();
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function normalizePasscodeInput(input) {
    if (!input) return '';
    var normalized = String(input.value || '').replace(/\D/g, '').slice(0, 4);
    if (input.value !== normalized) input.value = normalized;
    return normalized;
  }

  function validateEmail(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePasscode(value) {
    return /^\d{4}$/.test(String(value || '').trim());
  }

  function updateCount() {
    if (!countLabel || !contentInput) return;
    countLabel.textContent = String(contentInput.value.length) + ' / ' + String(maxContentLength);
    resizeContentInput();
  }

  function resizeContentInput() {
    if (!contentInput) return;
    if (!contentInput.value) {
      contentInput.style.height = '';
      return;
    }
    contentInput.style.height = 'auto';
    contentInput.style.height = String(contentInput.scrollHeight) + 'px';
  }

  function toggleSecret() {
    if (!secretCheckbox || !passcodeField || !passcodeInput) return;
    var enabled = secretCheckbox.checked;
    passcodeField.hidden = !enabled;
    passcodeInput.required = enabled;
    if (!enabled) {
      passcodeInput.value = '';
    }
  }

  function resetSecretDefault() {
    if (!secretCheckbox || !passcodeInput) return;
    secretCheckbox.checked = false;
    passcodeInput.value = '';
  }

  function authHeaders() {
    return {
      apikey: config.anonKey,
      Authorization: 'Bearer ' + config.anonKey,
      'Content-Type': 'application/json'
    };
  }

  function renderEmpty(key) {
    if (!list) return;
    var empty = document.createElement('p');
    empty.className = 'treehole-empty';
    empty.dataset.emptyKey = key || 'empty';
    empty.textContent = text(empty.dataset.emptyKey);
    list.replaceChildren(empty);
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (_error) {
      return '';
    }
  }

  function renderMessages(messages) {
    if (!list) return;
    if (!messages || !messages.length) {
      renderEmpty('empty');
      return;
    }

    var fragment = document.createDocumentFragment();
    messages.forEach(function (message) {
      var article = document.createElement('article');
      article.className = 'treehole-note';

      var meta = document.createElement('div');
      meta.className = 'treehole-note__meta';

      var name = document.createElement('strong');
      name.className = 'treehole-note__name';
      name.textContent = message.nickname || text('anonymous');

      var time = document.createElement('time');
      time.dateTime = message.created_at || '';
      time.textContent = formatDate(message.created_at);

      meta.append(name, time);

      var content = document.createElement('p');
      content.className = 'treehole-note__content';
      content.textContent = message.content || '';

      article.append(meta, content);

      if (message.owner_reply) {
        var reply = document.createElement('div');
        reply.className = 'treehole-note__reply';

        var replyLabel = document.createElement('span');
        replyLabel.className = 'treehole-note__reply-label';
        replyLabel.textContent = text('replyLabel');

        var replyText = document.createElement('p');
        replyText.textContent = message.owner_reply;

        reply.append(replyLabel, replyText);

        if (message.owner_reply_at) {
          var replyTime = document.createElement('time');
          replyTime.dateTime = message.owner_reply_at;
          replyTime.textContent = formatDate(message.owner_reply_at);
          reply.append(replyTime);
        }

        article.append(reply);
      }

      fragment.append(article);
    });

    list.replaceChildren(fragment);
  }

  function renderSecretResults(messages) {
    if (!secretResults) return;

    if (!messages || !messages.length) {
      secretResults.replaceChildren();
      setSecretStatus(text('secretLookupEmpty'), 'error');
      return;
    }

    var fragment = document.createDocumentFragment();
    messages.forEach(function (message) {
      var article = document.createElement('article');
      article.className = 'treehole-secret-card';

      var meta = document.createElement('div');
      meta.className = 'treehole-note__meta';

      var name = document.createElement('strong');
      name.className = 'treehole-note__name';
      name.textContent = message.nickname || text('anonymous');

      var time = document.createElement('time');
      time.dateTime = message.created_at || '';
      time.textContent = formatDate(message.created_at);

      meta.append(name, time);

      var content = document.createElement('p');
      content.className = 'treehole-note__content';
      content.textContent = message.content || '';

      var reply = document.createElement('div');
      reply.className = 'treehole-secret-card__reply';

      var replyLabel = document.createElement('span');
      replyLabel.className = 'treehole-secret-card__reply-label';
      replyLabel.textContent = text('replyLabel');

      var replyText = document.createElement('p');
      if (message.owner_reply) {
        replyText.textContent = message.owner_reply;
      } else {
        replyText.dataset.treeholeNoReply = 'true';
        replyText.textContent = text('noReplyYet');
      }

      reply.append(replyLabel, replyText);

      if (message.owner_reply_at) {
        var replyTime = document.createElement('time');
        replyTime.dateTime = message.owner_reply_at;
        replyTime.textContent = formatDate(message.owner_reply_at);
        reply.append(replyTime);
      }

      article.append(meta, content, reply);
      fragment.append(article);
    });

    secretResults.replaceChildren(fragment);
    setSecretStatus(text('secretLookupFound'), 'success');
  }

  async function loadMessages() {
    if (!list) return;
    renderEmpty('loading');
    try {
      var url =
        config.supabaseUrl +
        '/rest/v1/' +
        config.table +
        '?select=id,nickname,content,created_at,owner_reply,owner_reply_at&status=eq.published&order=created_at.desc&limit=60';
      var response = await fetch(url, {
        headers: {
          apikey: config.anonKey,
          Authorization: 'Bearer ' + config.anonKey
        }
      });

      if (!response.ok) throw new Error('load failed');

      var messages = await response.json();
      renderMessages(messages);
    } catch (_error) {
      renderEmpty('loadError');
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    setStatus('', '');

    var content = normalizeContent(contentInput && contentInput.value);
    var email = emailInput && emailInput.value ? emailInput.value.trim().toLowerCase() : '';
    var isSecret = Boolean(secretCheckbox && secretCheckbox.checked);
    var passcode = normalizePasscodeInput(passcodeInput);

    if (content.length < 2 || content.length > maxContentLength) {
      setStatus(text('invalidContent'), 'error');
      return;
    }

    if (!validateEmail(email)) {
      setStatus(text('invalidEmail'), 'error');
      return;
    }

    if (isSecret && !validatePasscode(passcode)) {
      setStatus(text('invalidPasscode'), 'error');
      if (passcodeInput) passcodeInput.focus();
      return;
    }

    setSubmitting(true);

    try {
      var response = await fetch(config.supabaseUrl + '/functions/v1/' + config.submitFunction, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          nickname: nicknameInput && nicknameInput.value ? nicknameInput.value.trim() : '',
          email: email,
          content: content,
          isSecret: isSecret,
          passcode: isSecret ? passcode : '',
          website: websiteInput && websiteInput.value ? websiteInput.value : '',
          sessionId: getSessionId(),
          clientMeta: getClientMeta()
        })
      });

      var payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        if (response.status === 409) throw new Error('duplicate');
        if (response.status === 429) throw new Error('tooMany');
        if (response.status === 400 && payload.error === 'Invalid passcode.') throw new Error('invalidPasscode');
        throw new Error('submit');
      }

      if (form) form.reset();
      updateCount();
      toggleSecret();

      if (isSecret) {
        setStatus(text('secretPosted'), 'success');
      } else if (payload.message && payload.message.status === 'hidden') {
        setStatus(text('hiddenPosted'), 'success');
      } else {
        setStatus(text('posted'), 'success');
        await loadMessages();
      }
    } catch (error) {
      var key = error && error.message === 'duplicate'
        ? 'duplicate'
        : error && error.message === 'tooMany'
          ? 'tooMany'
          : error && error.message === 'invalidPasscode'
            ? 'invalidPasscode'
            : 'submitError';
      setStatus(text(key), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function lookupSecret(event) {
    event.preventDefault();
    setSecretStatus('', '');
    if (secretResults) secretResults.replaceChildren();

    var passcode = normalizePasscodeInput(lookupPasscodeInput);
    if (!validatePasscode(passcode)) {
      setSecretStatus(text('invalidPasscode'), 'error');
      if (lookupPasscodeInput) lookupPasscodeInput.focus();
      return;
    }

    setLookingUp(true);

    try {
      var response = await fetch(config.supabaseUrl + '/functions/v1/' + config.secretLookupFunction, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          passcode: passcode,
          sessionId: getSessionId(),
          clientMeta: getClientMeta()
        })
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error('tooMany');
        throw new Error('lookup');
      }

      var payload = await response.json();
      renderSecretResults(payload.messages || []);
    } catch (error) {
      var key = error && error.message === 'tooMany' ? 'tooMany' : 'secretLookupError';
      setSecretStatus(text(key), 'error');
    } finally {
      setLookingUp(false);
    }
  }

  if (contentInput) {
    contentInput.addEventListener('input', updateCount);
    updateCount();
  }

  if (passcodeInput) {
    passcodeInput.addEventListener('input', function () {
      normalizePasscodeInput(passcodeInput);
    });
  }

  if (lookupPasscodeInput) {
    lookupPasscodeInput.addEventListener('input', function () {
      normalizePasscodeInput(lookupPasscodeInput);
    });
  }

  if (secretCheckbox) {
    resetSecretDefault();
    secretCheckbox.addEventListener('change', toggleSecret);
    toggleSecret();
  }

  if (form) form.addEventListener('submit', submitMessage);
  if (secretLookupForm) secretLookupForm.addEventListener('submit', lookupSecret);
  if (refreshButton) refreshButton.addEventListener('click', loadMessages);
  if (languageToggle) {
    languageToggle.addEventListener('click', function () {
      language = language === 'zh' ? 'en' : 'zh';
      applyLanguage();
    });
  }

  applyLanguage();
  loadMessages();
})();

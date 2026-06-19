(function () {
  'use strict';

  var config = {
    supabaseUrl: 'https://wdszjpxvelycmohewvgk.supabase.co',
    publishableKey: 'sb_publishable_5I7bn53-MdadL1aTjddfNw_-GlgDUfu',
    table: 'treehole_messages',
    submitFunction: 'treehole-submit'
  };

  var copy = {
    zh: {
      htmlLang: 'zh-CN',
      kicker: '何人斯',
      heroTitle: '究竟是什么人？在外面的声音',
      heroLead: '只可能在外面。你的心地幽深莫测',
      toggle: 'EN',
      toggleLabel: 'Switch to English',
      writeTitle: '写一张纸条',
      writeMeta: '邮箱选填',
      nameLabel: '署名',
      emailLabel: '邮箱（选填）',
      noteLabel: '内容',
      namePlaceholder: '匿名',
      emailPlaceholder: 'you@example.com',
      notePlaceholder: '写下你要留下的话。',
      post: '投递',
      posting: '投递中...',
      boardTitle: '留言',
      boardLead: '最近提交',
      refresh: '刷新',
      refreshLabel: '刷新留言',
      loading: '加载中...',
      empty: '暂无留言。',
      unavailable: '暂时无法读取留言。',
      tooShort: '再多写一点点。',
      invalidEmail: '邮箱格式不正确。',
      posted: '已提交。',
      saved: '已保存。',
      requestFailed: '提交失败，请稍后再试。',
      cooldown: '请稍等一分钟再留言。',
      dailyLimit: '今天的留言次数已达到上限。',
      invalidSession: '会话状态失效，请刷新页面后再试。',
      anonymous: '匿名'
    },
    en: {
      htmlLang: 'en',
      kicker: 'Who is there',
      heroTitle: 'Who is it? The voice outside',
      heroLead: 'Can only remain outside. Your inner ground is deep and unknowable.',
      toggle: '中',
      toggleLabel: '切换到中文',
      writeTitle: 'Write a note',
      writeMeta: 'Email optional',
      nameLabel: 'Name',
      emailLabel: 'Email (optional)',
      noteLabel: 'Note',
      namePlaceholder: 'Anonymous',
      emailPlaceholder: 'you@example.com',
      notePlaceholder: 'Write what you want to leave here.',
      post: 'Post',
      posting: 'Posting...',
      boardTitle: 'Messages',
      boardLead: 'Recent submissions',
      refresh: 'Refresh',
      refreshLabel: 'Refresh notes',
      loading: 'Loading...',
      empty: 'No messages yet.',
      unavailable: 'The board is unavailable right now.',
      tooShort: 'Leave at least two characters.',
      invalidEmail: 'Use a valid email address.',
      posted: 'Posted.',
      saved: 'Saved.',
      requestFailed: 'Unable to post. Please try again later.',
      cooldown: 'Please wait a minute before leaving another note.',
      dailyLimit: 'Daily note limit reached.',
      invalidSession: 'Session expired. Refresh and try again.',
      anonymous: 'Anonymous'
    }
  };

  var root = document.querySelector('[data-treehole-root]');
  if (!root) return;

  var form = root.querySelector('[data-treehole-form]');
  var nicknameInput = root.querySelector('[data-treehole-nickname]');
  var emailInput = root.querySelector('[data-treehole-email]');
  var contentInput = root.querySelector('[data-treehole-content]');
  var countLabel = root.querySelector('[data-treehole-count]');
  var statusLabel = root.querySelector('[data-treehole-status]');
  var submitButton = root.querySelector('[data-treehole-submit]');
  var refreshButton = root.querySelector('[data-treehole-refresh]');
  var languageToggle = root.querySelector('[data-treehole-lang-toggle]');
  var list = root.querySelector('[data-treehole-list]');
  var language = 'zh';
  var lastMessages = [];
  var isLoading = false;

  function text(key) {
    return copy[language][key] || copy.zh[key] || key;
  }

  function applyLanguage() {
    root.dataset.treeholeLang = language;
    document.documentElement.lang = text('htmlLang');

    root.querySelectorAll('[data-i18n]').forEach(function (element) {
      var key = element.getAttribute('data-i18n');
      element.textContent = text(key);
    });

    nicknameInput.placeholder = text('namePlaceholder');
    emailInput.placeholder = text('emailPlaceholder');
    contentInput.placeholder = text('notePlaceholder');
    submitButton.textContent = isLoading ? text('posting') : text('post');
    refreshButton.setAttribute('aria-label', text('refreshLabel'));
    languageToggle.textContent = text('toggle');
    languageToggle.setAttribute('aria-label', text('toggleLabel'));
    renderMessages(lastMessages);
  }

  function setStatus(message, type) {
    statusLabel.textContent = message || '';
    statusLabel.dataset.state = type || '';
  }

  function setLoading(nextIsLoading) {
    isLoading = nextIsLoading;
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? text('posting') : text('post');
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

  function isValidEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function collectClientMeta() {
    var screenInfo = window.screen || {};
    var nav = window.navigator || {};
    var connection = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    return {
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      timezone_offset: new Date().getTimezoneOffset(),
      language: nav.language || '',
      languages: Array.isArray(nav.languages) ? nav.languages.slice(0, 12) : [],
      platform: nav.platform || '',
      vendor: nav.vendor || '',
      user_agent: nav.userAgent || '',
      cookie_enabled: Boolean(nav.cookieEnabled),
      do_not_track: nav.doNotTrack || window.doNotTrack || '',
      hardware_concurrency: nav.hardwareConcurrency || null,
      device_memory: nav.deviceMemory || null,
      max_touch_points: nav.maxTouchPoints || 0,
      connection: {
        effective_type: connection.effectiveType || '',
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        save_data: Boolean(connection.saveData)
      },
      screen: {
        width: screenInfo.width || null,
        height: screenInfo.height || null,
        avail_width: screenInfo.availWidth || null,
        avail_height: screenInfo.availHeight || null,
        color_depth: screenInfo.colorDepth || null,
        pixel_depth: screenInfo.pixelDepth || null
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        device_pixel_ratio: window.devicePixelRatio || 1
      }
    };
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
      return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
        month: language === 'zh' ? 'long' : 'short',
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
      renderEmpty(text('empty'));
      return;
    }

    var fragment = document.createDocumentFragment();
    messages.forEach(function (message) {
      var article = document.createElement('article');
      article.className = 'treehole-note';

      var meta = document.createElement('div');
      meta.className = 'treehole-note__meta';

      var name = document.createElement('span');
      name.className = 'treehole-note__name';
      name.textContent = message.nickname || text('anonymous');

      var time = document.createElement('time');
      time.dateTime = message.created_at || '';
      time.textContent = formatDate(message.created_at);

      meta.appendChild(name);
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

  function localizeError(error) {
    var message = error && error.message ? error.message : '';
    if (message.indexOf('Please wait a minute') !== -1) return text('cooldown');
    if (message.indexOf('Daily note limit') !== -1) return text('dailyLimit');
    if (message.indexOf('Message is too short') !== -1) return text('tooShort');
    if (message.indexOf('Invalid email') !== -1) return text('invalidEmail');
    if (message.indexOf('Invalid session') !== -1) return text('invalidSession');
    return text('requestFailed');
  }

  async function loadMessages() {
    renderEmpty(text('loading'));
    var endpoint = config.supabaseUrl +
      '/rest/v1/' +
      config.table +
      '?select=id,nickname,content,created_at&status=eq.published&order=created_at.desc&limit=60';

    try {
      var messages = await requestJson(endpoint, {
        headers: {
          apikey: config.publishableKey
        }
      });
      lastMessages = Array.isArray(messages) ? messages : [];
      renderMessages(lastMessages);
    } catch (error) {
      lastMessages = [];
      renderEmpty(text('unavailable'));
    }
  }

  async function submitMessage(event) {
    event.preventDefault();

    var content = contentInput.value.trim();
    var email = emailInput.value.trim();
    if (content.length < 2) {
      setStatus(text('tooShort'), 'error');
      return;
    }
    if (!isValidEmail(email)) {
      setStatus(text('invalidEmail'), 'error');
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
          email: email,
          content: content,
          sessionId: getSessionId(),
          clientMeta: collectClientMeta()
        })
      });

      contentInput.value = '';
      updateCount();
      setStatus(payload.message && payload.message.status === 'hidden'
        ? text('saved')
        : text('posted'),
      'success');
      await loadMessages();
    } catch (error) {
      setStatus(localizeError(error), 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleLanguage() {
    language = language === 'zh' ? 'en' : 'zh';
    applyLanguage();
  }

  contentInput.addEventListener('input', updateCount);
  form.addEventListener('submit', submitMessage);
  refreshButton.addEventListener('click', loadMessages);
  languageToggle.addEventListener('click', toggleLanguage);
  updateCount();
  applyLanguage();
  loadMessages();
}());

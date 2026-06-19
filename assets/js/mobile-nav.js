(function () {
  'use strict';

  var mobileQuery = window.matchMedia('(max-width: 640px)');
  var nav = document.getElementById('site-nav');

  if (!nav) return;

  var button = nav.querySelector('button');
  var visibleLinks = nav.querySelector('.visible-links');
  var hiddenLinks = nav.querySelector('.hidden-links');
  var masthead = document.querySelector('.masthead');
  var scheduledTimers = [];

  if (!button || !visibleLinks || !hiddenLinks) return;

  function getTailItem() {
    return visibleLinks.querySelector('.persist.tail');
  }

  function moveVisibleItemsToMenu() {
    Array.prototype.slice.call(visibleLinks.children).forEach(function (item) {
      if (!item.classList.contains('persist')) {
        hiddenLinks.appendChild(item);
      }
    });
  }

  function restoreMenuItems() {
    var tail = getTailItem();
    Array.prototype.slice.call(hiddenLinks.children).forEach(function (item) {
      if (tail) {
        visibleLinks.insertBefore(item, tail);
      } else {
        visibleLinks.appendChild(item);
      }
    });
  }

  function syncTopPadding() {
    if (!masthead) return;
    document.body.style.paddingTop = masthead.offsetHeight + 'px';
  }

  function closeMenu() {
    button.classList.remove('close');
    hiddenLinks.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
  }

  function updateMobileNav() {
    nav.setAttribute('data-mobile-nav', mobileQuery.matches ? 'mobile' : 'desktop');

    if (mobileQuery.matches) {
      moveVisibleItemsToMenu();
      if (hiddenLinks.children.length) {
        button.classList.remove('hidden');
        button.setAttribute('count', String(hiddenLinks.children.length));
        button.setAttribute('aria-expanded', String(!hiddenLinks.classList.contains('hidden')));
      }
    } else {
      restoreMenuItems();
      button.classList.add('hidden');
      button.setAttribute('count', '0');
      closeMenu();
    }

    syncTopPadding();
  }

  function scheduleUpdateMobileNav() {
    scheduledTimers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    scheduledTimers = [];

    updateMobileNav();
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(updateMobileNav);
    }

    [80, 240, 700, 1400].forEach(function (delay) {
      scheduledTimers.push(window.setTimeout(updateMobileNav, delay));
    });
  }

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', scheduleUpdateMobileNav);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(scheduleUpdateMobileNav);
  }

  window.addEventListener('resize', scheduleUpdateMobileNav);
  window.addEventListener('orientationchange', scheduleUpdateMobileNav);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleUpdateMobileNav);
  }
  button.addEventListener('click', function () {
    window.setTimeout(function () {
      button.setAttribute('aria-expanded', String(!hiddenLinks.classList.contains('hidden')));
    }, 0);
  });
  document.addEventListener('DOMContentLoaded', scheduleUpdateMobileNav);
  window.addEventListener('load', scheduleUpdateMobileNav);
  scheduleUpdateMobileNav();
})();

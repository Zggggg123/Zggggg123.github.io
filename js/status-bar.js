(function () {
  'use strict';

  function init() {
    const wrapper = document.querySelector('.wrapper');
    const explorer = document.querySelector('.sidebar-explorer');
    const explorerButton = document.getElementById('status-explorer-toggle');
    const mobileExplorerButton = document.querySelector('.mobile-menu-toggle');
    const themeButton = document.getElementById('status-theme-toggle');
    const location = document.getElementById('status-location');
    const friendsButton = document.getElementById('status-friends-toggle');
    const announcementsButton = document.getElementById('status-announcements-toggle');
    const friendsDrawer = document.getElementById('status-friends-drawer');
    const announcementsDrawer = document.getElementById('status-announcements-drawer');
    const scrim = document.getElementById('status-drawer-scrim');
    const mobile = window.matchMedia('(max-width: 768px)');
    let openDrawer = null;
    let returnFocus = null;

    function syncExplorer() {
      if (!explorer) {
        explorerButton.hidden = true;
        return;
      }
      const visible = mobile.matches
        ? explorer.classList.contains('show')
        : !wrapper.classList.contains('explorer-hidden');
      explorerButton.setAttribute('aria-expanded', String(visible));
      explorerButton.setAttribute('aria-label', visible ? '隐藏 Explorer' : '显示 Explorer');
      explorerButton.title = visible ? '隐藏 Explorer' : '显示 Explorer';
    }

    explorerButton.addEventListener('click', function () {
      if (!explorer) return;
      if (mobile.matches) {
        mobileExplorerButton.click();
      } else {
        wrapper.classList.toggle('explorer-hidden');
      }
      syncExplorer();
    });
    if (explorer) {
      new MutationObserver(syncExplorer).observe(explorer, { attributes: true, attributeFilter: ['class'] });
    }
    if (mobile.addEventListener) mobile.addEventListener('change', syncExplorer);
    else mobile.addListener(syncExplorer);
    syncExplorer();

    function updateThemeButton() {
      const isWhite = document.documentElement.getAttribute('data-theme') === 'white';
      const label = isWhite ? '切换到深色主题' : '切换到浅色主题';
      themeButton.setAttribute('aria-label', label);
      themeButton.setAttribute('aria-pressed', String(isWhite));
      themeButton.title = label;
    }

    themeButton.addEventListener('click', function () {
      const next = document.documentElement.getAttribute('data-theme') === 'white' ? 'dark' : 'white';
      window.dispatchEvent(new CustomEvent('manual-theme-switch', { detail: { theme: next } }));
      updateThemeButton();
    });
    window.addEventListener('theme-changed', updateThemeButton);
    updateThemeButton();

    const drawerMap = new Map([
      [friendsButton, friendsDrawer],
      [announcementsButton, announcementsDrawer]
    ]);

    function closeDrawer(restoreFocus) {
      if (!openDrawer) return;
      openDrawer.hidden = true;
      openDrawer = null;
      scrim.hidden = true;
      document.body.classList.remove('status-drawer-open');
      drawerMap.forEach((_, button) => button.setAttribute('aria-expanded', 'false'));
      if (restoreFocus && returnFocus) returnFocus.focus();
      returnFocus = null;
    }

    drawerMap.forEach((drawer, button) => {
      button.addEventListener('click', function () {
        if (openDrawer === drawer) {
          closeDrawer(true);
          return;
        }
        closeDrawer(false);
        if (mobile.matches && explorer && explorer.classList.contains('show')) {
          mobileExplorerButton.click();
        }
        openDrawer = drawer;
        returnFocus = button;
        drawer.hidden = false;
        scrim.hidden = false;
        document.body.classList.add('status-drawer-open');
        button.setAttribute('aria-expanded', 'true');
        drawer.querySelector('.status-drawer-close').focus();
      });
      drawer.querySelector('.status-drawer-close').addEventListener('click', () => closeDrawer(true));
    });
    scrim.addEventListener('click', () => closeDrawer(true));
    document.addEventListener('pointerdown', function (event) {
      if (openDrawer && event.target !== scrim && !openDrawer.contains(event.target) && !event.target.closest('#status-friends-toggle, #status-announcements-toggle')) {
        closeDrawer(false);
      }
    });
    document.addEventListener('keydown', function (event) {
      if (!openDrawer) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer(true);
      } else if (event.key === 'Tab') {
        const focusable = Array.from(openDrawer.querySelectorAll('a[href], button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    if (location && location.dataset.article === 'true') {
      const contentArea = document.querySelector('.content-area');
      const postBody = document.querySelector('.post-body.vscode-markdown');
      const percent = document.getElementById('status-reading-percent');
      const fill = document.getElementById('reading-progress-fill');
      let pending = false;

      function updateProgress() {
        pending = false;
        if (!postBody) return;
        let scrollTop;
        let bodyStart;
        let bodyEnd;
        let visibleHeight;
        let topOffset = 0;

        if (mobile.matches || !contentArea) {
          scrollTop = window.scrollY;
          const rect = postBody.getBoundingClientRect();
          bodyStart = rect.top + scrollTop;
          bodyEnd = rect.bottom + scrollTop;
          ['.vs-header', '.activity-bar', '.tab-bar'].forEach(selector => {
            const element = document.querySelector(selector);
            if (element) topOffset += element.offsetHeight;
          });
          visibleHeight = window.innerHeight - document.querySelector('.footer').offsetHeight;
        } else {
          scrollTop = contentArea.scrollTop;
          const scrollerTop = contentArea.getBoundingClientRect().top;
          const rect = postBody.getBoundingClientRect();
          bodyStart = rect.top - scrollerTop + scrollTop;
          bodyEnd = rect.bottom - scrollerTop + scrollTop;
          visibleHeight = contentArea.clientHeight;
        }

        const start = bodyStart - topOffset;
        const end = bodyEnd - visibleHeight;
        const value = end > start
          ? Math.min(100, Math.max(0, Math.round((scrollTop - start) / (end - start) * 100)))
          : (scrollTop + visibleHeight >= bodyEnd ? 100 : 0);
        percent.textContent = value + '%';
        fill.style.width = value + '%';
      }

      function requestProgress() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(updateProgress);
      }

      if (contentArea) contentArea.addEventListener('scroll', requestProgress, { passive: true });
      window.addEventListener('scroll', requestProgress, { passive: true });
      window.addEventListener('resize', requestProgress);
      if (postBody && window.ResizeObserver) new ResizeObserver(requestProgress).observe(postBody);
      if (mobile.addEventListener) mobile.addEventListener('change', requestProgress);
      else mobile.addListener(requestProgress);
      requestProgress();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

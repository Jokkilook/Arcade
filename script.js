document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    const highwayFrame = document.getElementById('highwayFrame');
    const highwayControls = document.querySelector('#game3 .panel-controls--highway');

    function getActivePanel() {
        return document.querySelector('.tab-panel.active');
    }

    function isMobileLayout() {
        if (!window.matchMedia) return false;
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.matchMedia('(max-width: 768px)').matches;
    }

    function getNativeSize(iframe) {
        const nativeWidth = Number(iframe?.dataset?.nativeWidth);
        const nativeHeight = Number(iframe?.dataset?.nativeHeight);

        if (Number.isFinite(nativeWidth) && nativeWidth > 0 && Number.isFinite(nativeHeight) && nativeHeight > 0) {
            return { nativeWidth, nativeHeight };
        }

        return { nativeWidth: 1280, nativeHeight: 720 };
    }

    function getViewportForPanel(panel) {
        return panel?.querySelector?.('.panel-viewport') || panel;
    }

    function layoutActiveIframe() {
        const activePanel = getActivePanel();
        if (!activePanel) return;

        const iframe = activePanel.querySelector('iframe');
        if (!iframe) return;

        const viewport = getViewportForPanel(activePanel);
        const rect = viewport.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) return;

        if (isMobileLayout()) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.left = '0px';
            iframe.style.top = '0px';
            iframe.style.transformOrigin = '';
            iframe.style.transform = '';
            return;
        }

        const { nativeWidth, nativeHeight } = getNativeSize(iframe);
        const scale = Math.min(rect.width / nativeWidth, rect.height / nativeHeight);
        const scaledWidth = nativeWidth * scale;
        const scaledHeight = nativeHeight * scale;

        const offsetLeft = (rect.width - scaledWidth) / 2;
        const offsetTop = (rect.height - scaledHeight) / 2;

        iframe.style.width = `${nativeWidth}px`;
        iframe.style.height = `${nativeHeight}px`;
        iframe.style.left = `${Math.max(0, offsetLeft)}px`;
        iframe.style.top = `${Math.max(0, offsetTop)}px`;
        iframe.style.transformOrigin = 'top left';
        iframe.style.transform = `scale(${scale})`;
    }

    function postToHighway(data) {
        if (!highwayFrame?.contentWindow) return;
        highwayFrame.contentWindow.postMessage({ type: 'arcade-control', ...data }, '*');
    }

    function syncHighwayControlMode() {
        if (!highwayFrame) return;
        postToHighway({ action: 'config', externalControls: isMobileLayout() });
    }

    function activateTab(tabId) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        panels.forEach(p => p.classList.toggle('active', p.id === tabId));

        try {
            history.replaceState(null, '', `#${tabId}`);
        } catch {
            // ignore
        }

        // display:none -> block 변경 직후에는 측정값이 0일 수 있어서 한 프레임 미룸
        requestAnimationFrame(() => {
            layoutActiveIframe();
            if (tabId === 'game3') syncHighwayControlMode();
            const iframe = document.getElementById(tabId)?.querySelector('iframe');
            iframe?.focus?.();
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            if (!targetTab) return;
            activateTab(targetTab);
        });
    });

    window.addEventListener('resize', () => {
        layoutActiveIframe();
        syncHighwayControlMode();
    });

    if (highwayFrame) {
        highwayFrame.addEventListener('load', () => {
            syncHighwayControlMode();
        });
    }

    if (highwayControls) {
        const keyButtons = highwayControls.querySelectorAll('button[data-key]');
        keyButtons.forEach(button => {
            const key = button.dataset.key;
            if (!key) return;

            const press = (event) => {
                event.preventDefault();
                if (button.setPointerCapture && typeof event.pointerId === 'number') {
                    try { button.setPointerCapture(event.pointerId); } catch { /* ignore */ }
                }
                postToHighway({ action: 'setKey', key, pressed: true });
            };

            const release = (event) => {
                event.preventDefault();
                postToHighway({ action: 'setKey', key, pressed: false });
            };

            button.addEventListener('pointerdown', press);
            button.addEventListener('pointerup', release);
            button.addEventListener('pointercancel', release);
            button.addEventListener('lostpointercapture', release);
        });

        const actionButton = highwayControls.querySelector('button[data-action="screenAction"]');
        actionButton?.addEventListener('click', (event) => {
            event.preventDefault();
            postToHighway({ action: 'screenAction' });
        });
    }

    const initialTabId = (window.location.hash || '').replace('#', '');
    const hasInitialTab = Boolean(initialTabId && document.getElementById(initialTabId)?.classList?.contains('tab-panel'));

    // 초기 로딩 시: 해시가 있으면 해당 탭, 없으면 기본(첫 탭)
    if (hasInitialTab) {
        activateTab(initialTabId);
    } else {
        requestAnimationFrame(() => {
            layoutActiveIframe();
            syncHighwayControlMode();
        });
    }
});

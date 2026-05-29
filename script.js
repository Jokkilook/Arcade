document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    // 현재 활성화된 패널 가져오기
    function getActivePanel() {
        return document.querySelector('.tab-panel.active');
    }

    // 각 가상 게임의 오리지널 해상도 가져오기
    function getNativeSize(iframe) {
        const nativeWidth = Number(iframe?.dataset?.nativeWidth) || 1280;
        const nativeHeight = Number(iframe?.dataset?.nativeHeight) || 720;
        return { nativeWidth, nativeHeight };
    }

    // 💡 화면 크기 및 반응형 레이아웃 계산 함수
    function layoutActiveIframe() {
        const activePanel = getActivePanel();
        if (!activePanel) return;

        const iframe = activePanel.querySelector('iframe');
        const viewport = activePanel.querySelector('.panel-viewport');
        if (!iframe || !viewport) return;

        const { nativeWidth, nativeHeight } = getNativeSize(iframe);
        
        // 뷰포트가 가질 수 있는 최대 가로폭 확보
        const containerWidth = viewport.parentElement.clientWidth - 30; // 패딩값 제외
        
        // 원본 해상도 대비 현재 늘어날 수 있는 스케일 비율 계산
        let scale = containerWidth / nativeWidth;
        
        // 만약 화면이 너무 커서 원본 게임 크기를 초과한다면 1배수로 고정 (깨짐 방지)
        if (scale > 1) scale = 1;

        // 원본 크기 설정 후 CSS Scale 적용
        iframe.style.width = `${nativeWidth}px`;
        iframe.style.height = `${nativeHeight}px`;
        iframe.style.transform = `scale(${scale})`;

        // 💡 중요: 비율대로 찌그러진 iframe만큼 부모 뷰포트 영역의 크기도 강제 설정해줌 (잘림 방지)
        viewport.style.width = `${nativeWidth * scale}px`;
        viewport.style.height = `${nativeHeight * scale}px`;
    }

    // 탭 전환 기능
    function activateTab(tabId) {
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        panels.forEach(panel => {
            if (panel.id === tabId) {
                panel.classList.add('active');
                // 포커스를 주어 키보드 이벤트 조작성 향상
                setTimeout(() => {
                    panel.querySelector('iframe')?.focus();
                }, 50);
            } else {
                panel.classList.remove('active');
            }
        });

        // 탭이 바뀌었으므로 레이아웃 리사이즈 재계산
        layoutActiveIframe();
    }

    // 탭 이벤트 리스너 바인딩
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            activateTab(target);
        });
    });

    // 브라우저 크기가 바뀔 때마다 실시간으로 게임 화면 스케일 조작
    window.addEventListener('resize', layoutActiveIframe);

    // 초기 실행
    layoutActiveIframe();

    // 💡 모바일 가상 패드 연동 코드 (기존 작성하신 로직 유지 및 Highway 보완)
    const highwayControls = document.querySelector('.panel-controls--highway');
    const highwayFrame = document.getElementById('highwayFrame');

    if (highwayControls && highwayFrame) {
        const postToHighway = (data) => {
            highwayFrame.contentWindow?.postMessage(data, '*');
        };

        highwayControls.querySelectorAll('.control-btn[data-key]').forEach(button => {
            const key = button.dataset.key;

            const press = (e) => {
                e.preventDefault();
                postToHighway({ action: 'setKey', key, pressed: true });
            };
            const release = (e) => {
                e.preventDefault();
                postToHighway({ action: 'setKey', key, pressed: false });
            };

            button.addEventListener('pointerdown', press);
            button.addEventListener('pointerup', release);
            button.addEventListener('pointercancel', release);
        });

        const actionBtn = highwayControls.querySelector('[data-action="screenAction"]');
        actionBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            postToHighway({ action: 'screenAction' });
        });
    }
});
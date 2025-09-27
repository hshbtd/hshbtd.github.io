document.addEventListener('DOMContentLoaded', () => {
    // ---- Constants ----
    const BIRTHDAY_MONTH = 9; // 0부터 시작 (10월 = 9)
    const BIRTHDAY_DAY = 6; // 6일
    const COUNTDOWN_SCREEN = document.getElementById('countdown-screen');
    const MAIN_CONTENT_SCREEN = document.getElementById('main-content-screen');
    const ENTER_BUTTON = document.getElementById('enter-button');
    const PASSWORD_INPUT = document.getElementById('password-input');
    const LOADING_MESSAGE = document.getElementById('loading-message');
    const DAYS_SPAN = document.getElementById('days');
    const HOURS_SPAN = document.getElementById('hours');
    const MINUTES_SPAN = document.getElementById('minutes');
    const SECONDS_SPAN = document.getElementById('seconds');

    const BGM = document.getElementById('bgm');
    const NEXT_PAGE_BUTTON = document.getElementById('next-page-button');

    const SLIDES_CONTAINER = document.getElementById('slides-container');
    let mainPages = Array.from(document.querySelectorAll('.main-page'));
    let currentPageIndex = 0;

    let isPlaying = false;
    let countdownInterval;
    let typingTimeout;
    let audioLoaded = false;

    // ---- Functions ----

    // BGM 로딩 상태 확인
    function preloadAllAssets() {
        LOADING_MESSAGE.style.display = 'block';
        
        // 1. 모든 이미지/비디오 소스 목록 생성
        const mediaAssets = mainPages.map(page => ({
            src: page.getAttribute('data-media-src'),
            type: page.getAttribute('data-media-type')
        })).filter(asset => asset.src); // src가 있는 요소만 필터링

        // 2. 각 미디어 파일에 대한 로딩 Promise 생성
        const promises = mediaAssets.map(asset => {
            return new Promise((resolve, reject) => {
                if (asset.type === 'image') {
                    const img = new Image();
                    img.onload = () => resolve(asset.src);
                    img.onerror = () => reject(new Error(`이미지 로딩 실패: ${asset.src}`));
                    img.src = asset.src;
                } else if (asset.type === 'video') {
                    const video = document.createElement('video');
                    video.addEventListener('canplaythrough', () => resolve(asset.src), { once: true });
                    video.addEventListener('error', () => reject(new Error(`비디오 로딩 실패: ${asset.src}`)), { once: true });
                    video.src = asset.src;
                    video.load();
                } else {
                    resolve(); // 미디어 타입이 없는 경우 즉시 해결
                }
            });
        });

        // 3. BGM 로딩 Promise 추가
        promises.push(new Promise((resolve, reject) => {
            BGM.addEventListener('canplaythrough', resolve, { once: true });
            BGM.addEventListener('error', (e) => reject(new Error('BGM 로딩 실패')), { once: true });
            BGM.load();
        }));

        // 4. 모든 파일이 로드될 때까지 기다림
        Promise.allSettled(promises).then((results) => {
            results.forEach(result => {
                if (result.status === 'rejected') {
                    console.warn(result.reason); // 로딩 실패한 파일 로그 출력
                }
            });
            
            console.log('모든 미디어 에셋 프리로딩 완료.');
            audioLoaded = true; // 로딩 완료 플래그 설정
            LOADING_MESSAGE.style.display = 'none'; // "음악을 불러오는 중..." 메시지 숨김
            checkPassword(); // 비밀번호가 미리 입력되었을 경우를 대비해 버튼 상태 재확인
        });
    }

    // 비밀번호 확인 및 버튼 활성화
    function checkPassword() {
        const password = PASSWORD_INPUT.value;
        // 모든 에셋 로딩이 완료되고 비밀번호가 일치할 때만 버튼 활성화
        if (password === '1006' && audioLoaded) {
            ENTER_BUTTON.disabled = false;
            ENTER_BUTTON.classList.remove('disabled');
        } else {
            ENTER_BUTTON.disabled = true;
            ENTER_BUTTON.classList.add('disabled');
        }
    }

    // 메인 페이지로 전환하는 함수
    function showMainContent() {
        if (PASSWORD_INPUT.value !== '1006') {
            alert('올바른 비밀번호를 입력해주세요!');
            return;
        }

        // 부드러운 전환 효과
        COUNTDOWN_SCREEN.classList.add('fade-out');
        
        setTimeout(() => {
            COUNTDOWN_SCREEN.classList.remove('active');
            MAIN_CONTENT_SCREEN.classList.add('active');
            COUNTDOWN_SCREEN.classList.remove('fade-out');
            
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }

            // BGM 재생
            if (audioLoaded && !isPlaying) {
                BGM.play().then(() => {
                    isPlaying = true;
                }).catch(error => {
                    console.warn('BGM 자동 재생 실패:', error);
                });
            }
            
            showPage(currentPageIndex);
        }, 500);
    }

    // 특정 페이지를 보여주는 함수
    function showPage(index) {
        // 기존 비디오 오버레이 제거
        const existingOverlay = document.getElementById('video-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // 기존 페이지 숨기기
        mainPages.forEach((page, i) => {
            if (page.classList.contains('active')) {
                page.classList.add('fade-out');
                setTimeout(() => {
                    page.classList.remove('active', 'fade-out');
                    page.innerHTML = '';
                }, 300);
            } else {
                page.classList.remove('active');
                page.innerHTML = '';
            }
        });

        // 새 페이지 표시
        setTimeout(() => {
            const currentPage = mainPages[index];
            currentPage.classList.add('active');
            currentPageIndex = index;

            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            renderPageContent(currentPage);

            // 마지막 페이지가 아닌 경우만 다음 버튼 표시
            if (!currentPage.classList.contains('last-page')) {
                NEXT_PAGE_BUTTON.style.display = 'block';
            }
        }, 300);
    }

    // 페이지 컨텐츠를 렌더링 (텍스트와 미디어)
    // renderPageContent 함수에서 마지막 페이지 비디오 처리 부분만 수정

    function renderPageContent(pageElement) {
        let text = pageElement.getAttribute('data-text');
        const mediaType = pageElement.getAttribute('data-media-type');
        const mediaSrc = pageElement.getAttribute('data-media-src');

        // 마지막 페이지인 경우 특별 처리
        if (pageElement.classList.contains('last-page')) {
            // 컨테이너에서 벗어나서 body에 직접 추가
            const videoOverlay = document.createElement('div');
            videoOverlay.id = 'video-overlay';
            videoOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #000;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const video = document.createElement('video');
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.autoplay = true;
            video.preload = 'auto';
            video.controls = false;
            video.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
            `;

            video.addEventListener('loadeddata', () => {
                console.log('비디오 로드 성공');
                video.play().catch(error => {
                    console.warn('비디오 자동 재생 실패:', error);
                    video.controls = true;
                });
            });

            video.addEventListener('error', (e) => {
                console.warn('비디오 로드 실패:', mediaSrc);
                video.controls = true;
            });

            video.src = mediaSrc;
            videoOverlay.appendChild(video);
            // 하단에 생일 축하 메시지 추가
            const birthdayMessage = document.createElement('div');
            birthdayMessage.style.cssText = `
                position: absolute;
                bottom: 50px;
                left: 50%;
                transform: translateX(-50%);
                color: black;
                font-size: 2em;
                font-weight: bold;
                text-align: center;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                font-family: 'Gaegu', 'Cute Font', 'Noto Sans KR', sans-serif;
                z-index: 10001;
                animation: fadeInUp 2s ease-out, pulse 3s infinite;
                white-space: nowrap;
            `;
            birthdayMessage.innerHTML = '🎉 생일 축하해 우리 꼬!! 🎉';

            // 애니메이션 CSS를 동적으로 추가
            if (!document.getElementById('birthday-animation-style')) {
                const style = document.createElement('style');
                style.id = 'birthday-animation-style';
                style.textContent = `
                    @keyframes fadeInUp {
                        from { 
                            opacity: 0; 
                            transform: translateX(-50%) translateY(30px); 
                        }
                        to { 
                            opacity: 1; 
                            transform: translateX(-50%) translateY(0); 
                        }
                    }
                    @keyframes pulse {
                        0%, 100% { 
                            transform: translateX(-50%) scale(1); 
                        }
                        50% { 
                            transform: translateX(-50%) scale(1.05); 
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            videoOverlay.appendChild(birthdayMessage);
            document.body.appendChild(videoOverlay);

            // 다음 페이지 버튼 숨기기
            NEXT_PAGE_BUTTON.style.display = 'none';
            
            return; // 일반 처리 로직 건너뛰기
        }
            

        // 일반 페이지 처리 로직 (기존과 동일)
        if (text) {
            text = text.replace(/\n/g, '<br>');
        }

        const textWrapper = document.createElement('p');
        textWrapper.classList.add('page-message', 'typed-text');
        pageElement.appendChild(textWrapper);

        if (mediaSrc) {
            const mediaWrapper = document.createElement('div');
            mediaWrapper.classList.add('page-media');

            if (mediaType === 'image') {
                const img = document.createElement('img');
                img.src = mediaSrc;
                img.alt = '추억이 담긴 사진';
                mediaWrapper.appendChild(img);
            } else if (mediaType === 'video') {
                const video = document.createElement('video');
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.preload = 'auto';
                video.controls = true;
                video.src = mediaSrc;
                mediaWrapper.appendChild(video);
            }
            pageElement.appendChild(mediaWrapper);
        }

        // 타이핑 효과 시작
        typeWriter(textWrapper, text, 120, () => {
            if (!pageElement.classList.contains('last-page')) {
                NEXT_PAGE_BUTTON.disabled = false;
                NEXT_PAGE_BUTTON.classList.remove('disabled');
            }
        });
        
        if (!pageElement.classList.contains('last-page')) {
            NEXT_PAGE_BUTTON.disabled = true;
            NEXT_PAGE_BUTTON.classList.add('disabled');
        }
    }


    // 필기체 효과 함수
    function typeWriter(element, text, delay = 120, callback) {
        let i = 0;
        element.innerHTML = '';
        element.classList.add('typing-active');

        function type() {
            if (i < text.length) {
                if (text.substring(i, i + 4) === '<br>') {
                    element.innerHTML += '<br>';
                    i += 4;
                } else {
                    element.innerHTML += text.charAt(i);
                    i++;
                }
                // requestAnimationFrame을 사용하여 더 부드러운 애니메이션
                typingTimeout = setTimeout(() => {
                    requestAnimationFrame(type);
                }, delay);
            } else {
                element.classList.remove('typing-active');
                if (callback) callback();
            }
        }
        
        // 초기 실행도 requestAnimationFrame으로 감싸기
        requestAnimationFrame(type);
    }

    // 카운트다운 업데이트 함수
    function updateCountdown() {
        const now = new Date();
        let currentYear = now.getFullYear();

        let birthdayThisYear = new Date(currentYear, BIRTHDAY_MONTH, BIRTHDAY_DAY);
        if (now > birthdayThisYear) {
            currentYear++;
        }
        let targetDate = new Date(currentYear, BIRTHDAY_MONTH, BIRTHDAY_DAY, 0, 0, 0);

        const distance = targetDate - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            DAYS_SPAN.textContent = '00';
            HOURS_SPAN.textContent = '00';
            MINUTES_SPAN.textContent = '00';
            SECONDS_SPAN.textContent = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        DAYS_SPAN.textContent = String(days).padStart(2, '0');
        HOURS_SPAN.textContent = String(hours).padStart(2, '0');
        MINUTES_SPAN.textContent = String(minutes).padStart(2, '0');
        SECONDS_SPAN.textContent = String(seconds).padStart(2, '0');
    }

    // 다음 페이지로 넘어가는 함수
    function goToNextPage() {
        if (currentPageIndex < mainPages.length - 1) {
            currentPageIndex++;
            showPage(currentPageIndex);
        }
    }

    // 배경에 흩날리는 효과 생성
    function createFallingElement() {
        const body = document.body;
        const element = document.createElement('div');
        element.classList.add('falling-element');
        element.style.width = Math.random() * 8 + 4 + 'px';
        element.style.height = element.style.width;
        element.style.left = Math.random() * 100 + 'vw';
        element.style.animationDuration = Math.random() * 8 + 4 + 's';
        element.style.animationDelay = Math.random() * 4 + 's';
        element.style.backgroundColor = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.4})`;
        body.appendChild(element);

        element.addEventListener('animationend', () => {
            element.remove();
        });
    }

    // ---- Event Listeners ----
    PASSWORD_INPUT.addEventListener('input', checkPassword);
    ENTER_BUTTON.addEventListener('click', showMainContent);
    NEXT_PAGE_BUTTON.addEventListener('click', goToNextPage);

    // Enter 키로도 입장 가능
    PASSWORD_INPUT.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !ENTER_BUTTON.disabled) {
            showMainContent();
        }
    });

    // Initial setup
    preloadAllAssets();
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);

    // 흩날리는 요소 주기적으로 생성
    setInterval(createFallingElement, 250);

    // BGM 볼륨 설정
    BGM.volume = 0.6;
});

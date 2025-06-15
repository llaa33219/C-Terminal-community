// Global variables
let currentUser = null;
let currentPage = 'home';
let posts = [];
let projects = [];

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up navigation
    setupNavigation();
    
    // Set up modals
    setupModals();
    
    // Load initial data
    loadPosts();
    loadProjects();
    
    // Show home page by default
    showPage('home');
    
    // Initialize Google Sign-In after ensuring the API is loaded
    waitForGoogleAPI();
}

function waitForGoogleAPI() {
    if (typeof window.google !== 'undefined' && window.google.accounts) {
        // Load config from server and initialize Google Sign-In
        loadConfigAndInitialize();
    } else {
        // Wait and check again
        setTimeout(waitForGoogleAPI, 100);
    }
}

async function loadConfigAndInitialize() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (config.googleClientId) {
            initializeGoogleSignIn(config.googleClientId);
        } else {
            console.error('Google Client ID not configured');
        }
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

// Google Sign-In Setup
function initializeGoogleSignIn(clientId) {
    try {
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: false,
            use_fedcm_for_prompt: false
        });

        const signInDiv = document.getElementById('g_id_signin');
        if (signInDiv) {
            window.google.accounts.id.renderButton(signInDiv, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: 200
            });
        }
    } catch (error) {
        console.error('Google Sign-In initialization failed:', error);
        // Show fallback login message
        const loginDiv = document.getElementById('login-button');
        if (loginDiv) {
            loginDiv.innerHTML = '<span style="color: #666;">로그인 준비 중...</span>';
        }
    }

    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateUserInterface();
    }
}

function handleGoogleSignIn(response) {
    // Decode the JWT token
    const token = response.credential;
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    currentUser = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        loginTime: new Date().toISOString()
    };
    
    // Store user data
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update UI
    updateUserInterface();
    
    // Send user data to backend
    saveUserToBackend(currentUser);
}

function updateUserInterface() {
    const loginButton = document.getElementById('login-button');
    const userMenu = document.getElementById('user-menu');
    
    if (currentUser) {
        loginButton.style.display = 'none';
        userMenu.style.display = 'flex';
        
        document.getElementById('user-avatar').src = currentUser.picture;
        document.getElementById('user-name').textContent = currentUser.name;
    } else {
        loginButton.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserInterface();
    
    // Sign out from Google
    google.accounts.id.disableAutoSelect();
}

// Navigation System
function setupNavigation() {
    // Navigation links
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageName;
        
        // Load page-specific content
        switch(pageName) {
            case 'community':
                loadPosts();
                break;
            case 'projects':
                loadProjects();
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }
}

// Modal System
function setupModals() {
    // Post creation modal
    const createPostBtn = document.getElementById('create-post-btn');
    const postModal = document.getElementById('post-modal');
    const postForm = document.getElementById('post-form');
    
    createPostBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        showModal('post-modal');
    });
    
    postForm.addEventListener('submit', handlePostSubmit);
    
    // Project upload modal
    const uploadProjectBtn = document.getElementById('upload-project-btn');
    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    
    uploadProjectBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        showModal('project-modal');
    });
    
    projectForm.addEventListener('submit', handleProjectSubmit);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close, #cancel-post, #cancel-project, #cancel-profile-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });
    
    // Profile edit modal
    const profileEditForm = document.getElementById('profile-edit-form');
    profileEditForm.addEventListener('submit', handleProfileEdit);
    
    // Avatar selection
    setupAvatarSelection();
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
}

// Community Functions
async function loadPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>게시글을 불러오는 중...</div>';
    
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        if (data.posts && data.posts.length > 0) {
            posts = data.posts;
            renderPosts(posts);
        } else {
            // If no posts, show sample posts for demo
            posts = getSamplePosts();
            renderPosts(posts);
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
        // Fallback to sample posts
        posts = getSamplePosts();
        renderPosts(posts);
    }
}

function getSamplePosts() {
    return [
        {
            id: 1,
            category: 'question',
            title: 'C-Terminal에서 반복문 블록 사용법이 궁금해요',
            content: '안녕하세요! C-Terminal을 처음 사용하는데 반복문 블록을 어떻게 사용하는지 궁금합니다. 특히 for문과 while문의 차이점도 알고 싶어요.',
            author: {
                name: '코딩초보',
                avatar: 'data:image/svg+xml;charset=utf-8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="%23667eea"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-family="Arial">👨‍💻</text></svg>'
            },
            time: '2시간 전',
            likes: 5,
            comments: 3,
            liked: false
        },
        {
            id: 2,
            category: 'showcase',
            title: '간단한 계산기 프로젝트 만들어봤어요!',
            content: 'C-Terminal로 사칙연산이 가능한 계산기를 만들어봤습니다. 블록 코딩으로 이런 것도 만들 수 있다니 정말 신기하네요!',
            author: {
                name: '프로그래머지망생',
                avatar: 'data:image/svg+xml;charset=utf-8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="%2328a745"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-family="Arial">👩‍💻</text></svg>'
            },
            time: '5시간 전',
            likes: 12,
            comments: 7,
            liked: true
        },
        {
            id: 3,
            category: 'discussion',
            title: 'C-Terminal의 장점과 단점에 대한 의견',
            content: 'C-Terminal을 사용해보니 블록 코딩의 직관성은 좋지만, 복잡한 로직을 구현할 때는 한계가 있는 것 같아요. 여러분은 어떻게 생각하시나요?',
            author: {
                name: '개발자김씨',
                avatar: 'data:image/svg+xml;charset=utf-8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="%23dc3545"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-family="Arial">🧑‍💻</text></svg>'
            },
            time: '1일 전',
            likes: 8,
            comments: 15,
            liked: false
        }
    ];
}

function renderPosts(postsToRender) {
    const container = document.getElementById('posts-container');
    
    if (postsToRender.length === 0) {
        container.innerHTML = '<p class="text-center">게시글이 없습니다.</p>';
        return;
    }
    
    container.innerHTML = postsToRender.map(post => `
        <div class="post-card">
            <div class="post-header">
                <span class="post-category">${getCategoryName(post.category)}</span>
                <span class="post-time">${post.time}</span>
            </div>
            <h3 class="post-title" onclick="showPostDetail('${post.id}')">${post.title}</h3>
            <div class="post-author">
                <img src="${post.author.avatar}" alt="${post.author.name}" class="post-author-avatar">
                <span class="post-author-name">${post.author.name}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <span class="post-action ${post.liked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    ❤️ ${post.likes}
                </span>
                <span class="post-action" onclick="showPostDetail('${post.id}')">
                    💬 ${post.comments}
                </span>
                <span class="post-action">
                    📎 첨부파일
                </span>
            </div>
        </div>
    `).join('');
}

function getCategoryName(category) {
    const categories = {
        'question': '질문',
        'showcase': '프로젝트 공유',
        'discussion': '토론',
        'help': '도움말'
    };
    return categories[category] || category;
}

async function toggleLike(postId) {
    if (!currentUser) {
        await showCustomAlert('로그인 필요', '로그인이 필요합니다.');
        return;
    }
    
    try {
        const response = await fetch('/api/likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                type: 'post',
                targetId: postId
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Update local post data
            const post = posts.find(p => p.id === postId);
            if (post) {
                post.liked = data.liked;
                post.likes += data.liked ? 1 : -1;
                renderPosts(posts);
            }
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
        // Fallback to local toggle
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.liked = !post.liked;
            post.likes += post.liked ? 1 : -1;
            renderPosts(posts);
        }
    }
}

function handlePostSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const postData = {
        category: formData.get('category'),
        title: formData.get('title'),
        content: formData.get('content'),
        files: formData.getAll('files')
    };
    
    // Send to backend
    createPost(postData);
    
    // Close modal
    document.getElementById('post-modal').classList.remove('show');
    
    // Reset form
    e.target.reset();
}

// Projects Functions
async function loadProjects() {
    const container = document.getElementById('projects-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>프로젝트를 불러오는 중...</div>';
    
    try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        if (data.projects && data.projects.length > 0) {
            projects = data.projects;
            renderProjects(projects);
        } else {
            // If no projects, show sample projects for demo
            projects = getSampleProjects();
            renderProjects(projects);
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
        // Fallback to sample projects
        projects = getSampleProjects();
        renderProjects(projects);
    }
}

function getSampleProjects() {
    return [
        {
            id: 1,
            name: '간단한 계산기',
            description: '사칙연산이 가능한 계산기 프로그램입니다. 블록 코딩으로 만들어졌으며 터미널에서 실행됩니다.',
            author: '프로그래머지망생',
            uploadDate: '2024-01-15',
            downloads: 25,
            likes: 12,
            tags: ['초급', '계산기', '수학']
        },
        {
            id: 2,
            name: '구구단 출력기',
            description: '1단부터 9단까지 구구단을 출력하는 프로그램입니다. 반복문 학습에 좋습니다.',
            author: '코딩선생님',
            uploadDate: '2024-01-14',
            downloads: 18,
            likes: 8,
            tags: ['초급', '반복문', '교육']
        },
        {
            id: 3,
            name: '숫자 맞추기 게임',
            description: '컴퓨터가 생각한 숫자를 맞추는 간단한 게임입니다. 조건문과 반복문을 활용합니다.',
            author: '게임메이커',
            uploadDate: '2024-01-13',
            downloads: 42,
            likes: 20,
            tags: ['중급', '게임', '알고리즘']
        }
    ];
}

function renderProjects(projectsToRender) {
    const container = document.getElementById('projects-container');
    
    if (projectsToRender.length === 0) {
        container.innerHTML = '<p class="text-center">프로젝트가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = projectsToRender.map(project => `
        <div class="project-card">
            <div class="project-thumbnail">
                📁
            </div>
            <div class="project-info">
                <h3 class="project-title">${project.name}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-meta">
                    <span>작성자: ${project.author}</span>
                    <span>다운로드: ${project.downloads}</span>
                </div>
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
                </div>
                <div class="project-actions" style="margin-top: 1rem;">
                    <button class="btn-primary" onclick="downloadProject(${project.id})">다운로드</button>
                    <span class="post-action" onclick="toggleProjectLike(${project.id})">
                        ❤️ ${project.likes}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

async function downloadProject(projectId) {
    if (!currentUser) {
        await showCustomAlert('로그인 필요', '로그인이 필요합니다.');
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
        // Simulate download
        await showCustomAlert('다운로드', `${project.name} 프로젝트를 다운로드합니다.`);
        project.downloads += 1;
        renderProjects(projects);
    }
}

function toggleProjectLike(projectId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
        project.likes += 1;
        renderProjects(projects);
    }
}

function handleProjectSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const projectData = {
        name: formData.get('name'),
        description: formData.get('description'),
        file: formData.get('file'),
        tags: formData.get('tags').split(',').map(tag => tag.trim())
    };
    
    // Validate CTM file
    const file = projectData.file;
    if (file && !file.name.endsWith('.ctm')) {
        alert('.ctm 파일만 업로드 가능합니다.');
        return;
    }
    
    // Send to backend
    uploadProject(projectData);
    
    // Close modal
    document.getElementById('project-modal').classList.remove('show');
    
    // Reset form
    e.target.reset();
}

// Profile Functions
async function loadProfile() {
    const profileContent = document.getElementById('profile-content');
    
    if (!currentUser) {
        profileContent.innerHTML = `
            <div class="text-center">
                <h2>로그인이 필요합니다</h2>
                <p>프로필을 보려면 먼저 로그인해주세요.</p>
            </div>
        `;
        return;
    }
    
    // Load user stats
    const stats = await loadUserStats();
    
    profileContent.innerHTML = `
        <div class="profile-header">
            <img src="${currentUser.picture}" alt="${currentUser.name}" class="profile-avatar">
            <div class="profile-info">
                <h1>${currentUser.name}</h1>
                <p>${currentUser.email}</p>
                <button class="btn-secondary" onclick="showProfileEditModal()" style="margin-top: 10px;">프로필 편집</button>
                <div class="profile-stats">
                    <div class="profile-stat">
                        <div class="profile-stat-number">${stats.postsCount}</div>
                        <div class="profile-stat-label">게시글</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">${stats.projectsCount}</div>
                        <div class="profile-stat-label">프로젝트</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">${stats.likesReceived}</div>
                        <div class="profile-stat-label">받은 좋아요</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="profile-tabs">
            <button class="btn-secondary profile-tab-btn active" onclick="loadUserPosts()" data-tab="posts">내 게시글</button>
            <button class="btn-secondary profile-tab-btn" onclick="loadUserProjects()" data-tab="projects">내 프로젝트</button>
            <button class="btn-secondary profile-tab-btn" onclick="loadUserActivity()" data-tab="activity">활동 내역</button>
        </div>
        
        <div id="profile-tab-content" class="mt-4">
            <div class="loading"><div class="spinner"></div>데이터를 불러오는 중...</div>
        </div>
    `;
    
    // Load first tab content
    loadUserPosts();
}

async function loadUserStats() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/stats`, {
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
    
    // Fallback stats
    return {
        postsCount: 0,
        projectsCount: 0,
        likesReceived: 0
    };
}

async function loadUserPosts() {
    updateProfileTabActive('posts');
    const content = document.getElementById('profile-tab-content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div>내 게시글을 불러오는 중...</div>';
    
    try {
        const response = await fetch(`/api/posts?author=${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.posts && data.posts.length > 0) {
                content.innerHTML = `
                    <h3>내 게시글</h3>
                    <div class="posts-container">
                        ${data.posts.map(post => `
                            <div class="post-card">
                                <div class="post-header">
                                    <span class="post-category">${getCategoryName(post.category)}</span>
                                    <span class="post-time">${formatDate(post.createdAt)}</span>
                                </div>
                                <h3 class="post-title">${post.title}</h3>
                                <p class="post-content">${post.content.substring(0, 100)}...</p>
                                <div class="post-actions">
                                    <span class="post-action">❤️ ${post.likes}</span>
                                    <span class="post-action">💬 ${post.comments}</span>
                                    <button class="btn-secondary" onclick="editPost('${post.id}')">편집</button>
                                    <button class="btn-danger" onclick="deletePost('${post.id}')">삭제</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <h3>내 게시글</h3>
                    <p class="text-center">아직 작성한 게시글이 없습니다.</p>
                    <div class="text-center">
                        <button class="btn-primary" onclick="showPage('community')">첫 게시글 작성하기</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load user posts:', error);
        content.innerHTML = `
            <h3>내 게시글</h3>
            <p class="text-center">게시글을 불러오는 중 오류가 발생했습니다.</p>
        `;
    }
}

async function loadUserProjects() {
    updateProfileTabActive('projects');
    const content = document.getElementById('profile-tab-content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div>내 프로젝트를 불러오는 중...</div>';
    
    try {
        const response = await fetch(`/api/projects?author=${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.projects && data.projects.length > 0) {
                content.innerHTML = `
                    <h3>내 프로젝트</h3>
                    <div class="projects-grid">
                        ${data.projects.map(project => `
                            <div class="project-card">
                                <div class="project-thumbnail">📁</div>
                                <div class="project-info">
                                    <h3 class="project-title">${project.name}</h3>
                                    <p class="project-description">${project.description}</p>
                                    <div class="project-meta">
                                        <span>업로드: ${formatDate(project.createdAt)}</span>
                                        <span>다운로드: ${project.downloads}</span>
                                    </div>
                                    <div class="project-tags">
                                        ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
                                    </div>
                                    <div class="project-actions" style="margin-top: 1rem;">
                                        <span class="post-action">❤️ ${project.likes}</span>
                                        <button class="btn-secondary" onclick="editProject('${project.id}')">편집</button>
                                        <button class="btn-danger" onclick="deleteProject('${project.id}')">삭제</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <h3>내 프로젝트</h3>
                    <p class="text-center">아직 업로드한 프로젝트가 없습니다.</p>
                    <div class="text-center">
                        <button class="btn-primary" onclick="showPage('projects')">첫 프로젝트 업로드하기</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load user projects:', error);
        content.innerHTML = `
            <h3>내 프로젝트</h3>
            <p class="text-center">프로젝트를 불러오는 중 오류가 발생했습니다.</p>
        `;
    }
}

async function loadUserActivity() {
    updateProfileTabActive('activity');
    const content = document.getElementById('profile-tab-content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div>활동 내역을 불러오는 중...</div>';
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/activity`, {
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            content.innerHTML = `
                <h3>활동 내역</h3>
                <div class="activity-timeline">
                    ${data.activities ? data.activities.map(activity => `
                        <div class="activity-item">
                            <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                            <div class="activity-content">
                                <p>${activity.description}</p>
                                <span class="activity-time">${formatDate(activity.createdAt)}</span>
                            </div>
                        </div>
                    `).join('') : '<p class="text-center">아직 활동 내역이 없습니다.</p>'}
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load user activity:', error);
        content.innerHTML = `
            <h3>활동 내역</h3>
            <p class="text-center">활동 내역을 불러오는 중 오류가 발생했습니다.</p>
        `;
    }
}

function updateProfileTabActive(activeTab) {
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === activeTab) {
            btn.classList.add('active');
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
        const diffHours = Math.floor(diff / (1000 * 60 * 60));
        return diffHours < 1 ? '방금 전' : `${diffHours}시간 전`;
    } else if (diffDays < 7) {
        return `${diffDays}일 전`;
    } else {
        return date.toLocaleDateString('ko-KR');
    }
}

function getActivityIcon(type) {
    const icons = {
        'post': '📝',
        'project': '📁',
        'like': '❤️',
        'comment': '💬',
        'download': '⬇️'
    };
    return icons[type] || '📌';
}

// Profile Edit Functions
function showProfileEditModal() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    // Load current profile data
    loadProfileData();
    showModal('profile-edit-modal');
}

function setupAvatarSelection() {
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const selectedAvatarInput = document.getElementById('selected-avatar');
    const currentAvatarPreview = document.getElementById('current-avatar-preview');
    
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove previous selection
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Select current option
            option.classList.add('selected');
            
            // Update hidden input
            const avatarEmoji = option.getAttribute('data-avatar');
            selectedAvatarInput.value = avatarEmoji;
            
            // Update preview
            const avatarSvg = generateAvatarSvg(avatarEmoji);
            currentAvatarPreview.src = avatarSvg;
        });
    });
}

function generateAvatarSvg(emoji) {
    const colors = ['#667eea', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    return `data:image/svg+xml;charset=utf-8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="${randomColor}"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-family="Arial">${emoji}</text></svg>`;
}

async function loadProfileData() {
    try {
        const response = await fetch(`/api/users/${currentUser.id}/profile`, {
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            document.getElementById('profile-display-name').value = profile.displayName || currentUser.name || '';
            document.getElementById('profile-bio').value = profile.bio || '';
            document.getElementById('profile-website').value = profile.website || '';
            document.getElementById('profile-github').value = profile.github || '';
            document.getElementById('profile-skills').value = profile.skills ? profile.skills.join(', ') : '';
            document.getElementById('profile-location').value = profile.location || '';
            
            // Set current avatar
            if (profile.avatar) {
                document.getElementById('current-avatar-preview').src = profile.avatar;
                document.getElementById('selected-avatar').value = profile.avatarEmoji || '';
                
                // Select the corresponding avatar option
                if (profile.avatarEmoji) {
                    const avatarOption = document.querySelector(`[data-avatar="${profile.avatarEmoji}"]`);
                    if (avatarOption) {
                        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                        avatarOption.classList.add('selected');
                    }
                }
            } else {
                // Use current user's avatar
                document.getElementById('current-avatar-preview').src = currentUser.picture;
            }
        } else {
            // Load default values
            document.getElementById('profile-display-name').value = currentUser.name || '';
            document.getElementById('current-avatar-preview').src = currentUser.picture;
        }
    } catch (error) {
        console.error('Failed to load profile data:', error);
        // Load default values
        document.getElementById('profile-display-name').value = currentUser.name || '';
        document.getElementById('current-avatar-preview').src = currentUser.picture;
    }
}

async function handleProfileEdit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const selectedAvatar = formData.get('avatar');
    
    const profileData = {
        displayName: formData.get('displayName') || '',
        bio: formData.get('bio') || '',
        website: formData.get('website') || '',
        github: formData.get('github') || '',
        skills: formData.get('skills') ? formData.get('skills').split(',').map(s => s.trim()) : [],
        location: formData.get('location') || ''
    };
    
    // Add avatar data if selected
    if (selectedAvatar) {
        profileData.avatarEmoji = selectedAvatar;
        profileData.avatar = generateAvatarSvg(selectedAvatar);
    }
    
    try {
        const response = await fetch(`/api/users/${currentUser.id}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            // Update current user data if display name or avatar changed
            if (profileData.displayName) {
                currentUser.name = profileData.displayName;
                updateUserInterface();
            }
            if (profileData.avatar) {
                currentUser.picture = profileData.avatar;
                updateUserInterface();
            }
            
            // Close modal
            document.getElementById('profile-edit-modal').classList.remove('show');
            
            // Reload profile page
            if (currentPage === 'profile') {
                loadProfile();
            }
            
            await showCustomAlert('성공', '프로필이 성공적으로 업데이트되었습니다!');
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        await showCustomAlert('오류', '프로필 업데이트 중 오류가 발생했습니다.');
    }
}

// Post and Project Management Functions
async function editPost(postId) {
    // Implementation for editing posts
    await showCustomAlert('알림', '게시글 편집 기능은 곧 구현예정입니다.');
}

async function deletePost(postId) {
    const confirmed = await showCustomConfirm('삭제 확인', '정말로 이 게시글을 삭제하시겠습니까?');
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            await showCustomAlert('성공', '게시글이 삭제되었습니다.');
            loadUserPosts(); // Reload posts
        } else {
            throw new Error('Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        await showCustomAlert('오류', '게시글 삭제 중 오류가 발생했습니다.');
    }
}

async function editProject(projectId) {
    // Implementation for editing projects
    await showCustomAlert('알림', '프로젝트 편집 기능은 곧 구현예정입니다.');
}

async function deleteProject(projectId) {
    const confirmed = await showCustomConfirm('삭제 확인', '정말로 이 프로젝트를 삭제하시겠습니까?');
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            }
        });
        
        if (response.ok) {
            await showCustomAlert('성공', '프로젝트가 삭제되었습니다.');
            loadUserProjects(); // Reload projects
        } else {
            throw new Error('Failed to delete project');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        await showCustomAlert('오류', '프로젝트 삭제 중 오류가 발생했습니다.');
    }
}

// Custom Alert/Confirm Functions
function showCustomAlert(title, message) {
    return new Promise((resolve) => {
        document.getElementById('alert-title').textContent = title;
        document.getElementById('alert-message').textContent = message;
        
        const modal = document.getElementById('custom-alert-modal');
        const okBtn = document.getElementById('alert-ok-btn');
        
        const handleOk = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            resolve();
        };
        
        okBtn.addEventListener('click', handleOk);
        modal.classList.add('show');
    });
}

function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        const modal = document.getElementById('custom-confirm-modal');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        
        const handleOk = () => {
            modal.classList.remove('show');
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.classList.remove('show');
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        modal.classList.add('show');
    });
}

// Post Detail Functions
async function showPostDetail(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) {
        await showCustomAlert('오류', '게시글을 찾을 수 없습니다.');
        return;
    }
    
    // Populate post detail modal
    document.getElementById('post-detail-title').textContent = post.title;
    document.getElementById('post-detail-avatar').src = post.author.avatar;
    document.getElementById('post-detail-author-name').textContent = post.author.name;
    document.getElementById('post-detail-time').textContent = post.time;
    document.getElementById('post-detail-category').textContent = getCategoryName(post.category);
    document.getElementById('post-detail-body').textContent = post.content;
    document.getElementById('post-detail-likes').textContent = post.likes;
    document.getElementById('post-detail-comments-count').textContent = post.comments;
    
    // Set up like button
    const likeBtn = document.getElementById('post-detail-like-btn');
    likeBtn.className = `action-btn ${post.liked ? 'liked' : ''}`;
    likeBtn.onclick = () => toggleLike(postId);
    
    // Load comments
    await loadPostComments(postId);
    
    // Set up comment form
    setupCommentForm(postId);
    
    // Show modal
    document.getElementById('post-detail-modal').classList.add('show');
}

async function loadPostComments(postId) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '<div class="loading"><div class="spinner"></div>댓글을 불러오는 중...</div>';
    
    try {
        const response = await fetch(`/api/comments?postId=${postId}`);
        const data = await response.json();
        
        if (data.comments && data.comments.length > 0) {
            commentsList.innerHTML = data.comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">${comment.authorName || '익명'}</span>
                        <span class="comment-time">${formatDate(comment.createdAt)}</span>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                </div>
            `).join('');
        } else {
            commentsList.innerHTML = '<p class="text-center">아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        commentsList.innerHTML = '<p class="text-center">댓글을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

function setupCommentForm(postId) {
    const commentInput = document.getElementById('comment-input');
    const submitBtn = document.getElementById('comment-submit-btn');
    
    // Clear previous event listeners
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    newSubmitBtn.addEventListener('click', async () => {
        if (!currentUser) {
            await showCustomAlert('로그인 필요', '댓글을 작성하려면 로그인이 필요합니다.');
            return;
        }
        
        const content = commentInput.value.trim();
        if (!content) {
            await showCustomAlert('입력 오류', '댓글 내용을 입력해주세요.');
            return;
        }
        
        await createComment(postId, content);
        commentInput.value = '';
    });
}

async function createComment(postId, content) {
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                postId: postId,
                content: content
            })
        });
        
        if (response.ok) {
            await showCustomAlert('성공', '댓글이 작성되었습니다!');
            
            // Reload comments
            await loadPostComments(postId);
            
            // Update comment count in post
            const post = posts.find(p => p.id == postId);
            if (post) {
                post.comments += 1;
                document.getElementById('post-detail-comments-count').textContent = post.comments;
                
                // Update posts list if visible
                if (currentPage === 'community') {
                    renderPosts(posts);
                } else if (currentPage === 'profile') {
                    loadUserPosts();
                }
            }
        } else {
            throw new Error('Failed to create comment');
        }
    } catch (error) {
        console.error('Error creating comment:', error);
        await showCustomAlert('오류', '댓글 작성 중 오류가 발생했습니다.');
    }
}

// Filter Functions
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active filter
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Filter posts
            const filter = e.target.getAttribute('data-filter');
            if (filter === 'all') {
                renderPosts(posts);
            } else {
                const filteredPosts = posts.filter(post => post.category === filter);
                renderPosts(filteredPosts);
            }
        });
    });
});

// Backend API Functions (to be implemented with Cloudflare Workers)
async function saveUserToBackend(userData) {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save user data');
        }
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

async function createPost(postData) {
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                ...postData,
                author: currentUser
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create post');
        }
        
        // Reload posts
        loadPosts();
        await showCustomAlert('성공', '게시글이 성공적으로 작성되었습니다!');
    } catch (error) {
        console.error('Error creating post:', error);
        await showCustomAlert('오류', '게시글 작성 중 오류가 발생했습니다.');
    }
}

async function uploadProject(projectData) {
    try {
        const formData = new FormData();
        formData.append('name', projectData.name);
        formData.append('description', projectData.description);
        formData.append('file', projectData.file);
        formData.append('tags', JSON.stringify(projectData.tags));
        formData.append('author', JSON.stringify(currentUser));
        
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload project');
        }
        
        // Reload projects
        loadProjects();
        await showCustomAlert('성공', '프로젝트가 성공적으로 업로드되었습니다!');
    } catch (error) {
        console.error('Error uploading project:', error);
        await showCustomAlert('오류', '프로젝트 업로드 중 오류가 발생했습니다.');
    }
} 
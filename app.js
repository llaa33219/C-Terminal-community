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
    window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: false
    });

    window.google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular'
        }
    );

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
    document.querySelectorAll('.modal-close, #cancel-post, #cancel-project').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });
    
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
function loadPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>게시글을 불러오는 중...</div>';
    
    // Simulate API call
    setTimeout(() => {
        posts = getSamplePosts();
        renderPosts(posts);
    }, 1000);
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
                avatar: 'https://via.placeholder.com/32x32?text=👨‍💻'
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
                avatar: 'https://via.placeholder.com/32x32?text=👩‍💻'
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
                avatar: 'https://via.placeholder.com/32x32?text=🧑‍💻'
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
            <h3 class="post-title">${post.title}</h3>
            <div class="post-author">
                <img src="${post.author.avatar}" alt="${post.author.name}" class="post-author-avatar">
                <span class="post-author-name">${post.author.name}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <span class="post-action ${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    ❤️ ${post.likes}
                </span>
                <span class="post-action" onclick="showComments(${post.id})">
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

function toggleLike(postId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        renderPosts(posts);
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
function loadProjects() {
    const container = document.getElementById('projects-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>프로젝트를 불러오는 중...</div>';
    
    // Simulate API call
    setTimeout(() => {
        projects = getSampleProjects();
        renderProjects(projects);
    }, 1000);
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

function downloadProject(projectId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
        // Simulate download
        alert(`${project.name} 프로젝트를 다운로드합니다.`);
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
function loadProfile() {
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
    
    profileContent.innerHTML = `
        <div class="profile-header">
            <img src="${currentUser.picture}" alt="${currentUser.name}" class="profile-avatar">
            <div class="profile-info">
                <h1>${currentUser.name}</h1>
                <p>${currentUser.email}</p>
                <div class="profile-stats">
                    <div class="profile-stat">
                        <div class="profile-stat-number">12</div>
                        <div class="profile-stat-label">게시글</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">5</div>
                        <div class="profile-stat-label">프로젝트</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">28</div>
                        <div class="profile-stat-label">좋아요</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="profile-tabs">
            <button class="btn-secondary" onclick="loadUserPosts()">내 게시글</button>
            <button class="btn-secondary" onclick="loadUserProjects()">내 프로젝트</button>
            <button class="btn-secondary" onclick="loadUserActivity()">활동 내역</button>
        </div>
        
        <div id="profile-tab-content" class="mt-4">
            <p class="text-center text-secondary">탭을 선택해주세요.</p>
        </div>
    `;
}

function loadUserPosts() {
    document.getElementById('profile-tab-content').innerHTML = `
        <h3>내 게시글</h3>
        <p>여기에 사용자의 게시글 목록이 표시됩니다.</p>
    `;
}

function loadUserProjects() {
    document.getElementById('profile-tab-content').innerHTML = `
        <h3>내 프로젝트</h3>
        <p>여기에 사용자의 프로젝트 목록이 표시됩니다.</p>
    `;
}

function loadUserActivity() {
    document.getElementById('profile-tab-content').innerHTML = `
        <h3>활동 내역</h3>
        <p>여기에 사용자의 활동 내역이 표시됩니다.</p>
    `;
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
        alert('게시글이 성공적으로 작성되었습니다!');
    } catch (error) {
        console.error('Error creating post:', error);
        alert('게시글 작성 중 오류가 발생했습니다.');
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
        alert('프로젝트가 성공적으로 업로드되었습니다!');
    } catch (error) {
        console.error('Error uploading project:', error);
        alert('프로젝트 업로드 중 오류가 발생했습니다.');
    }
} 
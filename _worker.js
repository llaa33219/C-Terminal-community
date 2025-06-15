// Cloudflare Worker for C-Terminal Community
// This worker handles all backend functionality for the community platform

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path.startsWith('/api/')) {
        const response = await handleAPIRequest(request, env, path, method);
        // Add CORS headers to all API responses
        Object.keys(corsHeaders).forEach(key => {
          response.headers.set(key, corsHeaders[key]);
        });
        return response;
      }

      // Serve static files
      return await handleStaticFiles(request, env);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

async function handleAPIRequest(request, env, path, method) {
  const segments = path.split('/').filter(Boolean);
  const resource = segments[1]; // api/[resource]
  const id = segments[2]; // api/resource/[id]

  switch (resource) {
    case 'config':
      return await getConfig(env);
    case 'users':
      return await handleUsers(request, env, method, id);
    case 'posts':
      return await handlePosts(request, env, method, id);
    case 'projects':
      return await handleProjects(request, env, method, id);
    case 'comments':
      return await handleComments(request, env, method, id);
    case 'likes':
      return await handleLikes(request, env, method, id);
    default:
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

// Config API
async function getConfig(env) {
  try {
    const config = {
      googleClientId: env.GOOGLE_CLIENT_ID || ''
    };
    
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// User Management
async function handleUsers(request, env, method, id) {
  switch (method) {
    case 'POST':
      return await createOrUpdateUser(request, env);
    case 'GET':
      if (id) {
        return await getUser(env, id);
      }
      return await getUsers(env);
    case 'PUT':
      return await updateUser(request, env, id);
    default:
      return methodNotAllowed();
  }
}

async function createOrUpdateUser(request, env) {
  try {
    const userData = await request.json();
    
    // Validate required fields
    if (!userData.id || !userData.email || !userData.name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add timestamp
    userData.createdAt = userData.createdAt || new Date().toISOString();
    userData.updatedAt = new Date().toISOString();

    // Store in KV
    await env.USERS.put(userData.id, JSON.stringify(userData));

    return new Response(JSON.stringify({ success: true, user: userData }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getUser(env, userId) {
  try {
    const userData = await env.USERS.get(userId);
    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(userData, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Posts Management
async function handlePosts(request, env, method, id) {
  switch (method) {
    case 'POST':
      return await createPost(request, env);
    case 'GET':
      if (id) {
        return await getPost(env, id);
      }
      return await getPosts(request, env);
    case 'PUT':
      return await updatePost(request, env, id);
    case 'DELETE':
      return await deletePost(request, env, id);
    default:
      return methodNotAllowed();
  }
}

async function createPost(request, env) {
  try {
    const postData = await request.json();
    const userId = await getUserIdFromAuth(request);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate post ID
    const postId = generateId();
    
    const post = {
      id: postId,
      ...postData,
      authorId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
      comments: 0
    };

    // Store in KV
    await env.POSTS.put(postId, JSON.stringify(post));
    
    // Update posts index
    await updatePostsIndex(env, postId, post);

    return new Response(JSON.stringify({ success: true, post }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getPosts(request, env) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get posts index
    const indexData = await env.POSTS.get('__index__') || '[]';
    let posts = JSON.parse(indexData);

    // Filter by category if specified
    if (category && category !== 'all') {
      posts = posts.filter(post => post.category === category);
    }

    // Sort by creation date (newest first)
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedPosts = posts.slice(offset, offset + limit);

    // Get full post data
    const fullPosts = await Promise.all(
      paginatedPosts.map(async (postMeta) => {
        const postData = await env.POSTS.get(postMeta.id);
        return postData ? JSON.parse(postData) : null;
      })
    );

    return new Response(JSON.stringify({
      posts: fullPosts.filter(post => post !== null),
      total: posts.length,
      hasMore: offset + limit < posts.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get posts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Projects Management
async function handleProjects(request, env, method, id) {
  switch (method) {
    case 'POST':
      return await uploadProject(request, env);
    case 'GET':
      if (id) {
        return await getProject(env, id);
      }
      return await getProjects(request, env);
    case 'PUT':
      return await updateProject(request, env, id);
    case 'DELETE':
      return await deleteProject(request, env, id);
    default:
      return methodNotAllowed();
  }
}

async function uploadProject(request, env) {
  try {
    const formData = await request.formData();
    const userId = await getUserIdFromAuth(request);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const name = formData.get('name');
    const description = formData.get('description');
    const file = formData.get('file');
    const tags = JSON.parse(formData.get('tags') || '[]');

    if (!name || !description || !file) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (!file.name.endsWith('.ctm')) {
      return new Response(JSON.stringify({ error: 'Only .ctm files are allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const projectId = generateId();
    const fileKey = `projects/${projectId}/${file.name}`;

    // Store file in R2 bucket
    await env.FILES.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: 'application/octet-stream'
      }
    });

    const project = {
      id: projectId,
      name,
      description,
      authorId: userId,
      fileName: file.name,
      fileKey,
      fileSize: file.size,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      downloads: 0,
      likes: 0
    };

    // Store project metadata
    await env.PROJECTS.put(projectId, JSON.stringify(project));
    
    // Update projects index
    await updateProjectsIndex(env, projectId, project);

    return new Response(JSON.stringify({ success: true, project }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to upload project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getProjects(request, env) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const tag = url.searchParams.get('tag');

    // Get projects index
    const indexData = await env.PROJECTS.get('__index__') || '[]';
    let projects = JSON.parse(indexData);

    // Filter by tag if specified
    if (tag) {
      projects = projects.filter(project => project.tags && project.tags.includes(tag));
    }

    // Sort by creation date (newest first)
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedProjects = projects.slice(offset, offset + limit);

    // Get full project data
    const fullProjects = await Promise.all(
      paginatedProjects.map(async (projectMeta) => {
        const projectData = await env.PROJECTS.get(projectMeta.id);
        return projectData ? JSON.parse(projectData) : null;
      })
    );

    return new Response(JSON.stringify({
      projects: fullProjects.filter(project => project !== null),
      total: projects.length,
      hasMore: offset + limit < projects.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Comments Management
async function handleComments(request, env, method, id) {
  switch (method) {
    case 'POST':
      return await createComment(request, env);
    case 'GET':
      return await getComments(request, env, id);
    case 'DELETE':
      return await deleteComment(request, env, id);
    default:
      return methodNotAllowed();
  }
}

async function createComment(request, env) {
  try {
    const commentData = await request.json();
    const userId = await getUserIdFromAuth(request);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commentId = generateId();
    const comment = {
      id: commentId,
      postId: commentData.postId,
      content: commentData.content,
      authorId: userId,
      createdAt: new Date().toISOString()
    };

    await env.COMMENTS.put(commentId, JSON.stringify(comment));
    
    // Update post comment count
    await incrementPostComments(env, commentData.postId);

    return new Response(JSON.stringify({ success: true, comment }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Likes Management
async function handleLikes(request, env, method, id) {
  switch (method) {
    case 'POST':
      return await toggleLike(request, env);
    default:
      return methodNotAllowed();
  }
}

async function toggleLike(request, env) {
  try {
    const likeData = await request.json();
    const userId = await getUserIdFromAuth(request);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const likeKey = `${likeData.type}_${likeData.targetId}_${userId}`;
    const existingLike = await env.LIKES.get(likeKey);

    let liked = false;
    if (existingLike) {
      // Unlike
      await env.LIKES.delete(likeKey);
      liked = false;
    } else {
      // Like
      const like = {
        userId,
        targetId: likeData.targetId,
        type: likeData.type, // 'post' or 'project'
        createdAt: new Date().toISOString()
      };
      await env.LIKES.put(likeKey, JSON.stringify(like));
      liked = true;
    }

    // Update like count
    if (likeData.type === 'post') {
      await updatePostLikes(env, likeData.targetId, liked ? 1 : -1);
    } else if (likeData.type === 'project') {
      await updateProjectLikes(env, likeData.targetId, liked ? 1 : -1);
    }

    return new Response(JSON.stringify({ success: true, liked }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to toggle like' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Utility Functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function getUserIdFromAuth(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Remove 'Bearer ' prefix
}

async function updatePostsIndex(env, postId, post) {
  try {
    const indexData = await env.POSTS.get('__index__') || '[]';
    const index = JSON.parse(indexData);
    
    // Add post metadata to index
    const postMeta = {
      id: postId,
      title: post.title,
      category: post.category,
      authorId: post.authorId,
      createdAt: post.createdAt
    };
    
    index.push(postMeta);
    await env.POSTS.put('__index__', JSON.stringify(index));
  } catch (error) {
    console.error('Failed to update posts index:', error);
  }
}

async function updateProjectsIndex(env, projectId, project) {
  try {
    const indexData = await env.PROJECTS.get('__index__') || '[]';
    const index = JSON.parse(indexData);
    
    // Add project metadata to index
    const projectMeta = {
      id: projectId,
      name: project.name,
      authorId: project.authorId,
      tags: project.tags,
      createdAt: project.createdAt
    };
    
    index.push(projectMeta);
    await env.PROJECTS.put('__index__', JSON.stringify(index));
  } catch (error) {
    console.error('Failed to update projects index:', error);
  }
}

async function incrementPostComments(env, postId) {
  try {
    const postData = await env.POSTS.get(postId);
    if (postData) {
      const post = JSON.parse(postData);
      post.comments = (post.comments || 0) + 1;
      await env.POSTS.put(postId, JSON.stringify(post));
    }
  } catch (error) {
    console.error('Failed to increment post comments:', error);
  }
}

async function updatePostLikes(env, postId, increment) {
  try {
    const postData = await env.POSTS.get(postId);
    if (postData) {
      const post = JSON.parse(postData);
      post.likes = Math.max(0, (post.likes || 0) + increment);
      await env.POSTS.put(postId, JSON.stringify(post));
    }
  } catch (error) {
    console.error('Failed to update post likes:', error);
  }
}

async function updateProjectLikes(env, projectId, increment) {
  try {
    const projectData = await env.PROJECTS.get(projectId);
    if (projectData) {
      const project = JSON.parse(projectData);
      project.likes = Math.max(0, (project.likes || 0) + increment);
      await env.PROJECTS.put(projectId, JSON.stringify(project));
    }
  } catch (error) {
    console.error('Failed to update project likes:', error);
  }
}

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleStaticFiles(request, env) {
  // Serve static files from Cloudflare Pages
  try {
    return await env.ASSETS.fetch(request);
  } catch (error) {
    // If ASSETS is not available or file not found, return 404
    return new Response('File not found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
} 
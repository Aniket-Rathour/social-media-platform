import React, { useState, useEffect } from 'react'
import { 
  Users, 
  MessageSquare, 
  Terminal, 
  ShieldCheck, 
  UserPlus, 
  UserMinus, 
  UserX, 
  Send, 
  LogOut, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('auth')
  const [apiOnline, setApiOnline] = useState(false)
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [logs, setLogs] = useState([])

  const [signupForm, setSignupForm] = useState({ username: '', email: '', password: '' })
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  const [postForm, setPostForm] = useState({ title: '', content: '', user_id: '' })
  const [filterUserId, setFilterUserId] = useState('')

  const [followTarget, setFollowTarget] = useState('')
  const [unfollowTarget, setUnfollowTarget] = useState('')
  const [removeFollowerTarget, setRemoveFollowerTarget] = useState('')
  const [socialSearch, setSocialSearch] = useState('')
  const [socialStats, setSocialStats] = useState({ followers_count: 0, following_count: 0 })
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])

  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 4000)
  }

  const logCall = (method, url, status, data, isError = false) => {
    setLogs(prev => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        method,
        url,
        status,
        data,
        isError
      },
      ...prev
    ])
  }

  const apiRequest = async (url, options = {}) => {
    const method = options.method || 'GET'
    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      })
      let data
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }

      if (!res.ok) {
        const errorMsg = data?.error || `HTTP ${res.status}`
        logCall(method, url, res.status, data, true)
        throw new Error(errorMsg)
      }

      logCall(method, url, res.status, data, false)
      return data
    } catch (err) {
      if (!err.message.startsWith('HTTP')) {
        logCall(method, url, 'FAIL', err.message, true)
      }
      throw err
    }
  }

  const checkHealth = async () => {
    try {
      await apiRequest('/health')
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    }
  }

  const checkSession = async () => {
    try {
      const data = await apiRequest('/me')
      setUser(data)
      loadSocial(data.username)
    } catch {
      setUser(null)
    }
  }

  const loadPosts = async (uid = '') => {
    setLoadingPosts(true)
    try {
      const url = uid ? `/posts?user_id=${encodeURIComponent(uid)}` : '/posts'
      const data = await apiRequest(url)
      setPosts(data.posts || [])
    } catch (err) {
      showToast(err.message, true)
    } finally {
      setLoadingPosts(false)
    }
  }

  const loadSocial = async (username = '') => {
    const query = username ? `?username=${encodeURIComponent(username)}` : ''
    try {
      const statsRes = await apiRequest(`/users/stats${query}`)
      setSocialStats(statsRes.stats || { followers_count: 0, following_count: 0 })

      const followersRes = await apiRequest(`/users/followers${query}`)
      setFollowers(followersRes.followers || [])

      const followingRes = await apiRequest(`/users/following${query}`)
      setFollowing(followingRes.following || [])
    } catch (err) {
      showToast(err.message, true)
    }
  }

  useEffect(() => {
    checkHealth()
    checkSession()
    loadPosts()
  }, [])

  const handleSignup = async (e) => {
    e.preventDefault()
    try {
      const data = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(signupForm)
      })
      showToast(`Account created for @${data.user.username}!`)
      setSignupForm({ username: '', email: '', password: '' })
      await checkSession()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      })
      showToast(`Welcome back, @${data.user.username}!`)
      setLoginForm({ identifier: '', password: '' })
      await checkSession()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleLogout = async () => {
    try {
      await apiRequest('/logout', { method: 'POST' })
      showToast('Logged out successfully')
      setUser(null)
      setSocialStats({ followers_count: 0, following_count: 0 })
      setFollowers([])
      setFollowing([])
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    const payload = {
      title: postForm.title.trim(),
      content: postForm.content.trim()
    }
    if (postForm.user_id.trim() !== '') {
      payload.user_id = parseInt(postForm.user_id, 10)
    }
    try {
      await apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      showToast('Post published successfully!')
      setPostForm({ title: '', content: '', user_id: '' })
      loadPosts()
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleFollow = async (e) => {
    e.preventDefault()
    try {
      const res = await apiRequest('/users/follow', {
        method: 'POST',
        body: JSON.stringify({ target_username: followTarget.trim() })
      })
      showToast(res.message)
      setFollowTarget('')
      if (user) loadSocial(user.username)
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleUnfollow = async (e) => {
    e.preventDefault()
    try {
      const res = await apiRequest('/users/unfollow', {
        method: 'POST',
        body: JSON.stringify({ target_username: unfollowTarget.trim() })
      })
      showToast(res.message)
      setUnfollowTarget('')
      if (user) loadSocial(user.username)
    } catch (err) {
      showToast(err.message, true)
    }
  }

  const handleRemoveFollower = async (e) => {
    e.preventDefault()
    try {
      const res = await apiRequest('/users/remove-follower', {
        method: 'POST',
        body: JSON.stringify({ follower_username: removeFollowerTarget.trim() })
      })
      showToast(res.message)
      setRemoveFollowerTarget('')
      if (user) loadSocial(user.username)
    } catch (err) {
      showToast(err.message, true)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 p-5 mb-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
            ⚡
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Social Media Platform</h1>
            <p className="text-xs text-slate-400">Go &bull; pgxpool &bull; Argon2id &bull; JWT Cookies &bull; Tailwind v4</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${apiOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            <Activity className="w-3.5 h-3.5" />
            {apiOnline ? 'API Online' : 'API Offline'}
          </div>

          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            {user ? `@${user.username} (#${user.user_id})` : 'Guest Session'}
          </div>

          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          )}
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-3">
        {[
          { id: 'auth', label: 'Authentication', icon: ShieldCheck },
          { id: 'posts', label: 'Posts Feed', icon: MessageSquare },
          { id: 'social', label: 'Social Graph', icon: Users },
          { id: 'console', label: 'API Inspector', icon: Terminal },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <main>
        {activeTab === 'auth' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <h2 className="text-lg font-bold text-white mb-1">Create Account</h2>
              <p className="text-xs text-slate-400 mb-5">Hashes password with Argon2id and sets JWT cookie.</p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={signupForm.username}
                    onChange={e => setSignupForm({ ...signupForm, username: e.target.value })}
                    placeholder="e.g. dev_user"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="dev@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={signupForm.password}
                    onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition"
                >
                  Sign Up & Save Cookie
                </button>
              </form>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <h2 className="text-lg font-bold text-white mb-1">User Login</h2>
              <p className="text-xs text-slate-400 mb-5">Verifies password hash and returns session cookie.</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Identifier</label>
                  <input
                    type="text"
                    required
                    value={loginForm.identifier}
                    onChange={e => setLoginForm({ ...loginForm, identifier: e.target.value })}
                    placeholder="Username or email"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Your password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm transition"
                >
                  Log In
                </button>
              </form>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Session Diagnostics</h2>
                <p className="text-xs text-slate-400 mb-4">Cryptographically authenticated via <code>GET /me</code>.</p>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 min-h-28">
                  {user ? (
                    <div className="space-y-1.5">
                      <div><strong className="text-slate-400">Username:</strong> @{user.username}</div>
                      <div><strong className="text-slate-400">User ID:</strong> {user.user_id}</div>
                      <div className="text-emerald-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 inline" /> Active JWT Cookie
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500">No active session. Please register or log in.</p>
                  )}
                </div>
              </div>

              <button
                onClick={checkSession}
                className="mt-4 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Session Status
              </button>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg h-fit">
              <h2 className="text-lg font-bold text-white mb-1">Create Post</h2>
              <p className="text-xs text-slate-400 mb-5">Auto-binds to authenticated session with nullable cascade.</p>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={postForm.title}
                    onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="What is happening?"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Content</label>
                  <textarea
                    rows={4}
                    required
                    value={postForm.content}
                    onChange={e => setPostForm({ ...postForm, content: e.target.value })}
                    placeholder="Write post content here..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">User ID Override (Optional)</label>
                  <input
                    type="number"
                    value={postForm.user_id}
                    onChange={e => setPostForm({ ...postForm, user_id: e.target.value })}
                    placeholder="Leave empty for cookie user"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition"
                >
                  <Send className="w-4 h-4" />
                  Publish Post
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Posts Feed</h2>
                  <p className="text-xs text-slate-400">Queried directly from PostgreSQL via pgxpool.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="User ID"
                    value={filterUserId}
                    onChange={e => setFilterUserId(e.target.value)}
                    className="w-28 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  />
                  <button
                    onClick={() => loadPosts(filterUserId)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    Filter
                  </button>
                  <button
                    onClick={() => { setFilterUserId(''); loadPosts(); }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    All
                  </button>
                </div>
              </div>

              {loadingPosts ? (
                <p className="text-xs text-slate-500 py-8 text-center">Loading posts...</p>
              ) : posts.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">No posts found.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {posts.map(post => (
                    <div key={post.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white text-base">{post.title}</span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                            {post.user_id !== null ? `User #${post.user_id}` : 'Unlinked'}
                          </span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{post.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Follow User</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">Follow creators by their unique username.</p>
                <form onSubmit={handleFollow} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={followTarget}
                    onChange={e => setFollowTarget(e.target.value)}
                    placeholder="e.g. john_doe"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition"
                  >
                    Follow User
                  </button>
                </form>
              </div>

              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <UserMinus className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Unfollow User</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">Stop following a creator.</p>
                <form onSubmit={handleUnfollow} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={unfollowTarget}
                    onChange={e => setUnfollowTarget(e.target.value)}
                    placeholder="e.g. john_doe"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-lg text-sm transition"
                  >
                    Unfollow
                  </button>
                </form>
              </div>

              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <UserX className="w-5 h-5 text-rose-400" />
                  <h2 className="text-lg font-bold text-white">Remove Follower</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">Remove an account from your followers list.</p>
                <form onSubmit={handleRemoveFollower} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={removeFollowerTarget}
                    onChange={e => setRemoveFollowerTarget(e.target.value)}
                    placeholder="e.g. spammer_user"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold rounded-lg text-sm transition"
                  >
                    Remove From Followers
                  </button>
                </form>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Social Graph Inspector</h2>
                  <p className="text-xs text-slate-400">View graph connections & follower metrics.</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search username (@me default)"
                    value={socialSearch}
                    onChange={e => setSocialSearch(e.target.value)}
                    className="w-56 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  />
                  <button
                    onClick={() => loadSocial(socialSearch)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white transition"
                  >
                    Inspect
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 font-semibold text-sm">
                  {socialStats.followers_count} <span className="text-slate-400 text-xs font-normal">Followers</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 font-semibold text-sm">
                  {socialStats.following_count} <span className="text-slate-400 text-xs font-normal">Following</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Followers List</h3>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-36 max-h-60 overflow-y-auto space-y-2">
                    {followers.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No followers yet.</p>
                    ) : (
                      followers.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <span className="font-semibold text-white">@{f.username}</span>
                          <span className="text-slate-400">{f.email}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Following List</h3>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-36 max-h-60 overflow-y-auto space-y-2">
                    {following.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">Not following anyone yet.</p>
                    ) : (
                      following.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <span className="font-semibold text-white">@{f.username}</span>
                          <span className="text-slate-400">{f.email}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Live API Traffic Inspector</h2>
                <p className="text-xs text-slate-400">Captures real-time request methods, endpoints, status codes, and JSON responses.</p>
              </div>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 text-slate-300 transition"
              >
                Clear Console
              </button>
            </div>

            <div className="p-4 bg-black border border-slate-800 rounded-xl font-mono text-xs h-[480px] overflow-y-auto space-y-2.5">
              {logs.length === 0 ? (
                <p className="text-slate-600">No network calls captured yet. Perform actions to see traffic...</p>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      log.isError 
                        ? 'border-rose-500 bg-rose-500/5 text-rose-300' 
                        : 'border-emerald-500 bg-emerald-500/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{log.time}</span>
                        <span className="font-bold text-white">{log.method} {log.url}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.isError ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {log.status}
                      </span>
                    </div>
                    <pre className="text-[11px] overflow-x-auto text-slate-400">
                      {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : String(log.data)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium z-50 flex items-center gap-2 transition-all ${
            toast.isError
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {toast.isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

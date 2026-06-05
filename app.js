// Placeholder comment for second commit
/**
 * VibeStudy - 核心业务逻辑控制器 (Core App Controller)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. 全局状态与配置
  // ==========================================
  let tasks = [];
  let currentUserId = null;
  let supabaseClient = null;
  
  // 番茄钟状态
  let timerInterval = null;
  let timerDuration = 1500; // 默认 25 分钟 (秒)
  let timerTimeLeft = 1500;
  let timerIsRunning = false;
  let timerCurrentMode = 'focus'; // focus, short, long
  
  // 专注统计数据
  let statTodayFocusMinutes = parseInt(localStorage.getItem('vibe_stat_focus_minutes') || '0', 10);
  let statTotalSessions = parseInt(localStorage.getItem('vibe_stat_total_sessions') || '0', 10);
  let statEfficiencyIndex = parseInt(localStorage.getItem('vibe_stat_efficiency') || '75', 10);

  // AI 暂存拆解结果
  let lastDecomposedTasks = [];

  // ==========================================
  // 2. DOM 元素引用
  // ==========================================
  const toastContainer = document.getElementById('toast-container');
  
  // 统计看板
  const statCompletedEl = document.getElementById('stat-completed');
  const statFocusTimeEl = document.getElementById('stat-focus-time');
  const statFocusRatioEl = document.getElementById('stat-focus-ratio');

  // 账户与同步状态
  const githubLoginBtn = document.getElementById('github-login-btn');
  const githubBtnText = document.getElementById('github-btn-text');
  const syncStatusEl = document.getElementById('sync-status');
  const syncDotEl = document.getElementById('sync-dot');
  const syncTextEl = document.getElementById('sync-text');

  // 注册/登录模态框
  const authModal = document.getElementById('auth-modal');
  const authModalOverlay = document.getElementById('auth-modal-overlay');
  const authModalClose = document.getElementById('auth-modal-close');
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabRegister = document.getElementById('auth-tab-register');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authConfirmWrap = document.getElementById('auth-confirm-wrap');
  const authConfirm = document.getElementById('auth-confirm');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authSubmitText = document.getElementById('auth-submit-text');
  const authSpinner = document.getElementById('auth-spinner');
  const authMessage = document.getElementById('auth-message');
  const authSwitchHint = document.getElementById('auth-switch-hint');
  const authSwitchBtn = document.getElementById('auth-switch-btn');
  let authMode = 'login'; // 'login' | 'register'

  // 反重力控制
  const gravityToggleBtn = document.getElementById('gravity-toggle-btn');
  const gravityRecoverBar = document.getElementById('gravity-recover-bar');
  const gravityRecoverBtn = document.getElementById('gravity-recover-btn');

  // 番茄钟组件
  const timerTimeEl = document.getElementById('timer-time');
  const timerStatusEl = document.getElementById('timer-status');
  const timerProgressCircle = document.getElementById('timer-progress');
  const timerStartBtn = document.getElementById('timer-start');
  const timerPauseBtn = document.getElementById('timer-pause');
  const timerResetBtn = document.getElementById('timer-reset');
  const timerModeBtns = document.querySelectorAll('.timer-mode-btn');

  // AI 拆解器组件
  const aiInputEl = document.getElementById('ai-input');
  const aiDecomposeBtn = document.getElementById('ai-decompose-btn');
  const aiResultPanel = document.getElementById('ai-result-panel');
  const aiSubtasksPreview = document.getElementById('ai-subtasks-preview');
  const aiImportBtn = document.getElementById('ai-import-btn');
  const suggestChips = document.querySelectorAll('.suggest-chip');
  const decomposerSpinner = document.getElementById('decomposer-spinner');

  // 日程看板组件
  const taskForm = document.getElementById('task-form');
  const taskTitleInput = document.getElementById('task-title-input');
  const taskPrioritySelect = document.getElementById('task-priority');
  const taskDdlInput = document.getElementById('task-ddl');
  const scheduleList = document.getElementById('schedule-list');
  const emptyPlaceholder = document.getElementById('empty-placeholder');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

  // 设置面板组件
  const settingsTrigger = document.getElementById('settings-trigger');
  const settingsDrawer = document.getElementById('settings-drawer');
  const settingsClose = document.getElementById('settings-close');
  const settingsSaveBtn = document.getElementById('settings-save-btn');
  const drawerOverlay = document.getElementById('drawer-overlay');
  
  const settingsSupabaseUrl = document.getElementById('settings-supabase-url');
  const settingsSupabaseKey = document.getElementById('settings-supabase-key');
  const settingsApiKey = document.getElementById('settings-api-key');
  const settingsApiUrl = document.getElementById('settings-api-url');
  const settingsApiModel = document.getElementById('settings-api-model');

  // 默认填充 DDL 为明天
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  taskDdlInput.value = tomorrow.toISOString().substring(0, 10);

  // ==========================================
  // 3. 通用工具函数 (Toast / Web Audio API)
  // ==========================================
  
  // 浮窗提示 (Toast)
  window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'flex items-center gap-3 px-4 py-3 rounded-xl shadow-glass border backdrop-blur-md text-sm text-gray-200 transition-all duration-300 pointer-events-auto toast-animate-in';
    
    let icon = '🔔';
    let borderColor = 'border-white/10';
    let bgColor = 'bg-slate-900/90';
    
    if (type === 'success') {
      icon = '✅';
      borderColor = 'border-emerald-500/30';
      bgColor = 'bg-emerald-950/65';
      toast.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.2)';
    } else if (type === 'warning') {
      icon = '⚠️';
      borderColor = 'border-amber-500/30';
      bgColor = 'bg-amber-950/65';
      toast.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.2)';
    } else if (type === 'info') {
      icon = '🌌';
      borderColor = 'border-violet-500/30';
      bgColor = 'bg-violet-950/65';
      toast.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.2)';
    }
    
    toast.classList.add(borderColor, bgColor);
    toast.innerHTML = `<span>${icon}</span><span class="font-medium">${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.replace('toast-animate-in', 'toast-animate-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  };

  // 合成并播放高科技提示音 (Web Audio API)
  function playSynthSound(mode) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (mode === 'complete') {
        // 专注完成：双音阶上升的铃声
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.2);
      } else if (mode === 'tick') {
        // 秒针微弱滴答声
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      } else if (mode === 'start') {
        // 番茄钟开始：清爽电子和弦
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn('Audio synthesis failed (interacted state required):', e);
    }
  }

  // ==========================================
  // 4. Supabase 初始化与数据存取
  // ==========================================

  // ⚡ 内建默认凭证（自动连接，无需手动配置）
  // 如果用户在设置面板手动填写了自定义凭证，会优先使用自定义的值
  const BUILT_IN_SUPABASE_URL = 'https://ggfoederzjwgceongizu.supabase.co';
  const BUILT_IN_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZm9lZGVyemplZ2Nlb25naXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDk3NzYsImV4cCI6MjA2NTE4NTc3Nn0.kEFcZC5MQQPGzLN4gfZTRMm7KnXH5oKFKQMeBKJVXfc';

  function initSupabase() {
    const url = localStorage.getItem('vibe_supabase_url') || BUILT_IN_SUPABASE_URL;
    const key = localStorage.getItem('vibe_supabase_key') || BUILT_IN_SUPABASE_KEY;
    
    if (url && key) {
      try {
        // 初始化 Supabase Client
        supabaseClient = supabase.createClient(url, key);
        
        // 绑定认证状态改变事件
        supabaseClient.auth.onAuthStateChange((event, session) => {
          if (session) {
            currentUserId = session.user.id;
            updateGithubButton(session.user);
            updateSyncStatusIndicator(true, `已连接云端: ${session.user.email}`);
            loadTasks(); // 登录成功后加载云端数据
          } else {
            currentUserId = null;
            updateGithubButton(null);
            updateSyncStatusIndicator(false, '本地离线模式 (未登录)');
            loadTasks(); // 退登后切回本地 LocalStorage
          }
        });

        updateSyncStatusIndicator(false, '已连接 Supabase，点击登录');
      } catch (err) {
        console.error('Supabase client creation error:', err);
        updateSyncStatusIndicator(false, 'Supabase 配置错误');
      }
    } else {
      updateSyncStatusIndicator(false, '未连接 Supabase (本地)');
      loadTasks(); // 未配置则使用 LocalStorage
    }
  }

  function updateGithubButton(user) {
    if (user) {
      const email = user.email || '';
      const name = (user.user_metadata && user.user_metadata.display_name) || email.split('@')[0] || '用户';
      
      githubLoginBtn.classList.add('border-vibe-pink/30');
      githubLoginBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-vibe-pink"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span class="text-vibe-pink font-semibold">${name} (退出)</span>
      `;
    } else {
      githubLoginBtn.classList.remove('border-vibe-pink/30');
      githubLoginBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>注册 / 登录</span>
      `;
    }
  }

  function updateSyncStatusIndicator(isConnected, text) {
    if (isConnected) {
      syncDotEl.className = 'w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]';
      syncTextEl.innerText = text;
      syncTextEl.className = 'text-emerald-400 font-semibold';
    } else {
      syncDotEl.className = 'w-1.5 h-1.5 bg-gray-500 rounded-full';
      syncTextEl.innerText = text;
      syncTextEl.className = 'text-gray-500';
    }
  }

  // ==========================================
  // 模态框控制与邮箱登录注册逻辑
  // ==========================================
  function openAuthModal(defaultMode = 'login') {
    authMode = defaultMode;
    switchAuthMode(authMode);
    authEmail.value = '';
    authPassword.value = '';
    authConfirm.value = '';
    hideAuthMessage();
    authModal.classList.remove('hidden');
    setTimeout(() => authEmail.focus(), 100);
  }

  function closeAuthModal() {
    authModal.classList.add('hidden');
  }

  function switchAuthMode(mode) {
    authMode = mode;
    if (mode === 'register') {
      authTabLogin.classList.remove('active-tab');
      authTabRegister.classList.add('active-tab');
      authConfirmWrap.classList.remove('hidden');
      authConfirmWrap.classList.add('flex');
      authSubmitText.innerText = '创建账号';
      authSwitchHint.innerText = '已有账号？';
      authSwitchBtn.innerText = '直接登录';
    } else {
      authTabRegister.classList.remove('active-tab');
      authTabLogin.classList.add('active-tab');
      authConfirmWrap.classList.add('hidden');
      authConfirmWrap.classList.remove('flex');
      authSubmitText.innerText = '登录账号';
      authSwitchHint.innerText = '还没有账号？';
      authSwitchBtn.innerText = '立即注册';
    }
    hideAuthMessage();
  }

  function showAuthMessage(text, type = 'error') {
    authMessage.classList.remove('hidden');
    if (type === 'success') {
      authMessage.className = 'text-xs px-3 py-2.5 rounded-lg border font-medium text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
    } else {
      authMessage.className = 'text-xs px-3 py-2.5 rounded-lg border font-medium text-red-400 bg-red-950/60 border-red-500/30';
    }
    authMessage.innerText = text;
  }

  function hideAuthMessage() {
    authMessage.classList.add('hidden');
    authMessage.innerText = '';
  }

  function setAuthLoading(loading) {
    if (loading) {
      authSubmitBtn.setAttribute('disabled', 'true');
      authSpinner.classList.remove('hidden');
    } else {
      authSubmitBtn.removeAttribute('disabled');
      authSpinner.classList.add('hidden');
    }
  }

  // 模态框关闭
  authModalClose.addEventListener('click', closeAuthModal);
  authModalOverlay.addEventListener('click', closeAuthModal);

  // Tab 切换
  authTabLogin.addEventListener('click', () => switchAuthMode('login'));
  authTabRegister.addEventListener('click', () => switchAuthMode('register'));
  authSwitchBtn.addEventListener('click', () => switchAuthMode(authMode === 'login' ? 'register' : 'login'));

  // 提交登录/注册
  authSubmitBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const confirm = authConfirm.value;

    if (!email || !password) {
      showAuthMessage('请填写邮箱和密码');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAuthMessage('请输入有效的邮箱地址');
      return;
    }
    if (password.length < 6) {
      showAuthMessage('密码长度至少为 6 个字符');
      return;
    }

    if (!supabaseClient) {
      showAuthMessage('未连接到 Supabase，请先在设置面板配置数据库');
      return;
    }

    setAuthLoading(true);
    hideAuthMessage();

    try {
      if (authMode === 'register') {
        if (password !== confirm) {
          showAuthMessage('两次输入的密码不一致');
          setAuthLoading(false);
          return;
        }
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase 可能需要邮箱验证
        if (data.user && !data.session) {
          showAuthMessage('注册成功！请检查您的邮箱并点击验证链接以完成注册。', 'success');
        } else if (data.session) {
          showToast('注册并登录成功！欢迎使用 VibeStudy ✨', 'success');
          closeAuthModal();
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast(`登录成功！欢迎回来 ${email.split('@')[0]} 🌟`, 'success');
        closeAuthModal();
      }
    } catch (err) {
      const msg = err.message || '操作失败';
      // 转换常见英文错误为中文
      if (msg.includes('Invalid login credentials')) {
        showAuthMessage('邮箱或密码错误，请重试');
      } else if (msg.includes('User already registered')) {
        showAuthMessage('该邮箱已被注册，请直接登录');
        switchAuthMode('login');
      } else if (msg.includes('Email not confirmed')) {
        showAuthMessage('邮箱未验证，请检查您的收件笱');
      } else {
        showAuthMessage(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  });

  // Enter 键快捷提交
  [authEmail, authPassword, authConfirm].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') authSubmitBtn.click();
    });
  });

  // ==========================================
  // 5. 任务数据操作 (CRUD)
  // ==========================================
  
  // 加载任务
  async function loadTasks() {
    if (supabaseClient && currentUserId) {
      try {
        const { data, error } = await supabaseClient
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        tasks = data || [];
      } catch (err) {
        console.error('Fetch tasks from Supabase error:', err);
        showToast('从云端获取任务列表失败，已为您启用本地缓存', 'warning');
        loadLocalTasks();
      }
    } else {
      loadLocalTasks();
    }
    renderTasks();
    updateStats();
  }

  function loadLocalTasks() {
    const raw = localStorage.getItem('vibe_tasks');
    if (raw) {
      try {
        tasks = JSON.parse(raw);
      } catch (e) {
        tasks = [];
      }
    } else {
      // 预设引导性质的示例卡片
      tasks = [
        {
          id: 'guide-1',
          title: '📌 熟悉 VibeStudy 物理防焦虑面板并尝试“一键坍塌”',
          priority: 'high',
          ddl: new Date().toISOString().substring(0, 10),
          completed: false,
          subtasks: [
            { title: '点击右上角的 🌌 启动重力模式', completed: false },
            { title: '用鼠标拖拽任何大卡片进行抛掷', completed: false },
            { title: '点击漂浮在底部的“恢复”按钮', completed: false }
          ]
        }
      ];
      saveLocalTasks();
    }
  }

  function saveLocalTasks() {
    localStorage.setItem('vibe_tasks', JSON.stringify(tasks));
  }

  // 同步保存单条修改
  async function syncSaveTask(task) {
    if (supabaseClient && currentUserId) {
      try {
        // 如果是临时ID，则将其移除为云端插入
        const isLocalTemp = String(task.id).startsWith('local-') || String(task.id).startsWith('guide-');
        
        const payload = {
          user_id: currentUserId,
          title: task.title,
          priority: task.priority,
          ddl: task.ddl,
          completed: task.completed,
          subtasks: task.subtasks
        };

        if (isLocalTemp) {
          // 云端新建
          const { data, error } = await supabaseClient
            .from('tasks')
            .insert(payload)
            .select();
          if (error) throw error;
          if (data && data[0]) {
            task.id = data[0].id; // 回填正式的 UUID
          }
        } else {
          // 云端更新
          const { error } = await supabaseClient
            .from('tasks')
            .update(payload)
            .eq('id', task.id);
          if (error) throw error;
        }
      } catch (err) {
        console.error('Sync to Supabase error:', err);
        showToast('云端数据同步失败，将缓存在本地设备', 'warning');
      }
    }
    saveLocalTasks();
    updateStats();
  }

  // 同步删除任务
  async function syncDeleteTask(taskId) {
    if (supabaseClient && currentUserId) {
      // 确认不是纯本地未插入数据
      const isLocalTemp = String(taskId).startsWith('local-') || String(taskId).startsWith('guide-');
      if (!isLocalTemp) {
        try {
          const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId);
          if (error) throw error;
        } catch (err) {
          console.error('Delete from Supabase error:', err);
          showToast('云端删除失败，已本地处理', 'warning');
        }
      }
    }
    tasks = tasks.filter(t => t.id !== taskId);
    saveLocalTasks();
    updateStats();
    renderTasks();
  }

  // ==========================================
  // 6. 任务日程 UI 渲染与特效
  // ==========================================
  function renderTasks() {
    scheduleList.innerHTML = '';
    
    if (tasks.length === 0) {
      emptyPlaceholder.style.display = 'flex';
      return;
    }
    emptyPlaceholder.style.display = 'none';

    tasks.forEach(task => {
      const isHigh = task.priority === 'high';
      const isMed = task.priority === 'medium';
      
      let priorityClass = 'priority-low';
      let badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      let badgeLabel = '低优';
      if (isHigh) {
        priorityClass = 'priority-high';
        badgeColor = 'text-red-400 bg-red-500/10 border-red-500/20';
        badgeLabel = '高优';
      } else if (isMed) {
        priorityClass = 'priority-medium';
        badgeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        badgeLabel = '中优';
      }

      // 统计子任务进度
      const totalSub = task.subtasks ? task.subtasks.length : 0;
      const completedSub = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
      const progressLabel = totalSub > 0 ? `(${completedSub}/${totalSub} 子步骤)` : '';

      const card = document.createElement('div');
      card.className = `task-item p-4 rounded-xl bg-black/30 border border-white/5 shadow-sm transition-all duration-300 flex flex-col gap-3 hover:border-white/10 ${priorityClass} ${task.completed ? 'opacity-50 line-through' : ''}`;
      card.dataset.id = task.id;

      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <input type="checkbox" class="task-checkbox checkbox-glow w-5 h-5 rounded-lg border-white/10 bg-black/40 text-vibe-purple cursor-pointer focus:ring-0" ${task.completed ? 'checked' : ''}>
            <span class="text-sm font-semibold text-gray-200 select-none ${task.completed ? 'line-through text-gray-500' : ''}">${task.title}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold border px-2 py-0.5 rounded-full ${badgeColor}">${badgeLabel}</span>
            <span class="text-[10px] text-gray-500 font-mono">${task.ddl}</span>
            <button class="delete-task-btn text-gray-600 hover:text-red-400 p-1 rounded-lg transition-colors">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      // 渲染子任务列表（如果有）
      if (totalSub > 0) {
        const subContainer = document.createElement('div');
        subContainer.className = 'pl-8 pr-2 flex flex-col gap-2 border-t border-white/5 pt-2.5 mt-0.5';
        
        // 子任务进度指示
        const subTitle = document.createElement('div');
        subTitle.className = 'text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-between';
        subTitle.innerHTML = `<span>拆解执行路线 ${progressLabel}</span><span>${Math.round((completedSub / totalSub) * 100)}%</span>`;
        subContainer.appendChild(subTitle);

        task.subtasks.forEach((sub, sIdx) => {
          const subRow = document.createElement('div');
          subRow.className = 'flex items-center gap-2.5 text-xs';
          subRow.innerHTML = `
            <input type="checkbox" class="subtask-checkbox checkbox-glow w-4 h-4 rounded border-white/5 bg-black/60 text-vibe-purple cursor-pointer focus:ring-0" ${sub.completed ? 'checked' : ''} data-sub-idx="${sIdx}">
            <span class="text-gray-400 select-none ${sub.completed ? 'line-through text-gray-600' : ''}">${sub.title}</span>
          `;
          
          // 监听子任务勾选
          subRow.querySelector('.subtask-checkbox').addEventListener('change', (e) => {
            sub.completed = e.target.checked;
            
            // 如果所有子任务完成，但主任务未勾选，可以给予提示或保持手动；如果勾选子任务，更新状态并同步
            syncSaveTask(task);
            renderTasks();
          });

          subContainer.appendChild(subRow);
        });

        card.appendChild(subContainer);
      }

      // 绑定主任务复选框勾选事件
      card.querySelector('.task-checkbox').addEventListener('change', (e) => {
        const checked = e.target.checked;
        task.completed = checked;
        
        if (checked) {
          // 触发粒子爆发动效
          createTaskCompletionParticles(e.target);
          playSynthSound('complete');
        }

        syncSaveTask(task);
        
        // 延迟一下让动效过渡更明显
        setTimeout(() => {
          renderTasks();
        }, 300);
      });

      // 绑定删除按钮
      card.querySelector('.delete-task-btn').addEventListener('click', () => {
        card.classList.add('removing');
        card.addEventListener('animationend', () => {
          syncDeleteTask(task.id);
        });
      });

      scheduleList.appendChild(card);
    });
  }

  // 粒子爆炸效果 (用于任务勾选时的奖励机制)
  function createTaskCompletionParticles(checkboxEl) {
    const rect = checkboxEl.getBoundingClientRect();
    const pxX = rect.left + rect.width / 2;
    const pxY = rect.top + rect.height / 2;

    const count = 15;
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      
      // 设定随机的扩散方向和距离
      const angle = Math.random() * Math.PI * 2;
      const velocity = 30 + Math.random() * 80;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      const size = 4 + Math.random() * 6;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = `${pxX}px`;
      p.style.top = `${pxY}px`;
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);

      document.body.appendChild(p);

      p.addEventListener('animationend', () => p.remove());
    }
  }

  // ==========================================
  // 7. 统计面板计算
  // ==========================================
  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    statCompletedEl.innerText = `${completed}/${total}`;
    statFocusTimeEl.innerText = `${statTodayFocusMinutes}m`;
    
    // 计算专注效率值：根据任务完成率与完成番茄钟综合得出
    let efficiency = 70; // 基础值
    if (total > 0) {
      efficiency += Math.round((completed / total) * 20);
    }
    efficiency += Math.min(10, Math.floor(statTotalSessions * 2.5));
    efficiency = Math.min(100, Math.max(30, efficiency)); // 限制在 30%-100%
    
    statFocusRatioEl.innerText = `${efficiency}%`;
    localStorage.setItem('vibe_stat_efficiency', efficiency);
  }

  // ==========================================
  // 8. 快速创建任务事件
  // ==========================================
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = taskTitleInput.value.trim();
    const priority = taskPrioritySelect.value;
    const ddl = taskDdlInput.value;

    if (!title) return;

    const newTask = {
      id: `local-${Date.now()}`,
      title: title,
      priority: priority,
      ddl: ddl,
      completed: false,
      subtasks: []
    };

    tasks.unshift(newTask);
    syncSaveTask(newTask);
    
    taskTitleInput.value = '';
    showToast('任务已成功添加至学习日程！', 'success');
    renderTasks();
  });

  // 清除已完成任务
  clearCompletedBtn.addEventListener('click', () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) {
      showToast('当前没有已完成的待办事项。', 'warning');
      return;
    }

    const promises = completedTasks.map(t => syncDeleteTask(t.id));
    Promise.all(promises).then(() => {
      showToast('已成功清理所有完成的历史任务。', 'success');
      loadTasks();
    });
  });

  // ==========================================
  // 9. Vibe 沉浸式番茄钟逻辑
  // ==========================================
  function updateTimerDisplay() {
    const minutes = Math.floor(timerTimeLeft / 60);
    const seconds = timerTimeLeft % 60;
    
    timerTimeEl.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // 计算并渲染圆环进度
    // stroke-dasharray 预设为 540.35
    const total = timerDuration;
    const percent = timerTimeLeft / total;
    const offset = 540.35 * (1 - percent);
    timerProgressCircle.setAttribute('stroke-dashoffset', offset);
  }

  function tick() {
    if (timerTimeLeft > 0) {
      timerTimeLeft--;
      updateTimerDisplay();
      
      // 每过一秒播放微弱的物理秒针滴答声（增强专注氛围感）
      if (timerTimeLeft % 5 === 0) {
        playSynthSound('tick');
      }
    } else {
      // 倒计时结束
      clearInterval(timerInterval);
      timerInterval = null;
      timerIsRunning = false;
      
      timerStartBtn.classList.remove('hidden');
      timerPauseBtn.classList.add('hidden');
      
      playSynthSound('complete');

      if (timerCurrentMode === 'focus') {
        const addedMinutes = Math.round(timerDuration / 60);
        statTodayFocusMinutes += addedMinutes;
        statTotalSessions += 1;
        
        localStorage.setItem('vibe_stat_focus_minutes', statTodayFocusMinutes);
        localStorage.setItem('vibe_stat_total_sessions', statTotalSessions);
        
        showToast(`🎉 专注完成！您已成功赚取了 ${addedMinutes} 分钟专注时长！`, 'success');
      } else {
        showToast('休息时间结束，准备重新进入专注状态吧！', 'info');
      }
      
      // 重置时间
      timerTimeLeft = timerDuration;
      updateTimerDisplay();
      updateStats();
    }
  }

  // 绑定番茄钟按钮
  timerStartBtn.addEventListener('click', () => {
    if (timerIsRunning) return;
    
    timerIsRunning = true;
    timerInterval = setInterval(tick, 1000);
    
    timerStartBtn.classList.add('hidden');
    timerPauseBtn.classList.remove('hidden');
    timerPauseBtn.removeAttribute('disabled');
    timerPauseBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    
    document.getElementById('timer-pulse').className = 'w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa] animate-ping';
    timerStatusEl.innerText = timerCurrentMode === 'focus' ? 'Focusing...' : 'Resting...';
    
    playSynthSound('start');
  });

  timerPauseBtn.addEventListener('click', () => {
    if (!timerIsRunning) return;
    
    timerIsRunning = false;
    clearInterval(timerInterval);
    
    timerStartBtn.classList.remove('hidden');
    timerPauseBtn.classList.add('hidden');
    
    document.getElementById('timer-pulse').className = 'w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]';
    timerStatusEl.innerText = 'Timer Paused';
    showToast('番茄钟已暂停', 'warning');
  });

  timerResetBtn.addEventListener('click', () => {
    timerIsRunning = false;
    clearInterval(timerInterval);
    
    timerTimeLeft = timerDuration;
    updateTimerDisplay();
    
    timerStartBtn.classList.remove('hidden');
    timerPauseBtn.classList.add('hidden');
    timerPauseBtn.setAttribute('disabled', 'true');
    timerPauseBtn.classList.add('cursor-not-allowed', 'opacity-50');
    
    document.getElementById('timer-pulse').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]';
    timerStatusEl.innerText = 'Ready to Focus';
  });

  // 番茄钟模式切换
  timerModeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      timerModeBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const seconds = parseInt(e.target.dataset.time, 10);
      const mode = e.target.dataset.mode;
      
      timerDuration = seconds;
      timerTimeLeft = seconds;
      timerCurrentMode = mode;
      
      timerStatusEl.innerText = mode === 'focus' ? 'Ready to Focus' : (mode === 'short' ? 'Short Break' : 'Long Break');
      
      // 触发重置
      timerResetBtn.click();
    });
  });

  // ==========================================
  // 10. AI 智能任务拆解逻辑
  // ==========================================
  
  // 快速建议模板点击
  suggestChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      aiInputEl.value = e.target.dataset.text;
      aiInputEl.focus();
    });
  });

  // 触发拆解
  aiDecomposeBtn.addEventListener('click', async () => {
    const text = aiInputEl.value.trim();
    if (!text) {
      showToast('请输入想要拆解的复杂学习目标。', 'warning');
      return;
    }

    // 设置加载状态
    aiDecomposeBtn.setAttribute('disabled', 'true');
    decomposerSpinner.classList.remove('hidden');
    const orgBtnText = aiDecomposeBtn.querySelector('.decomposer-text').innerText;
    aiDecomposeBtn.querySelector('.decomposer-text').innerText = 'AI 正在深度解析中...';

    try {
      const results = await window.VibeAI.decompose(text);
      lastDecomposedTasks = results;
      
      // 渲染预览界面
      renderAIPreview(results);
      
      // 显示结果卡片
      aiResultPanel.classList.remove('hidden');
      aiImportBtn.removeAttribute('disabled');
      
      showToast('AI 任务拆解成功，已梳理出最佳时间线性步骤！', 'success');
    } catch (err) {
      console.error(err);
      showToast('大模型接口调用出错，请检查 API 配置！', 'warning');
    } finally {
      aiDecomposeBtn.removeAttribute('disabled');
      decomposerSpinner.classList.add('hidden');
      aiDecomposeBtn.querySelector('.decomposer-text').innerText = orgBtnText;
    }
  });

  function renderAIPreview(steps) {
    aiSubtasksPreview.innerHTML = '';
    steps.forEach((step, index) => {
      const row = document.createElement('div');
      row.className = 'flex flex-col gap-1.5 p-3 rounded-lg bg-black/40 border border-white/5';
      
      let badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      if (step.priority === 'high') {
        badgeColor = 'text-red-400 bg-red-500/10 border-red-500/20';
      } else if (step.priority === 'medium') {
        badgeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      }

      row.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-vibe-pink">步骤 ${index + 1}</span>
          <span class="text-[9px] border px-2 py-0.5 rounded-full ${badgeColor}">${step.priority === 'high' ? '高优' : (step.priority === 'medium' ? '中优' : '低优')}</span>
        </div>
        <div class="text-xs text-gray-200">${step.title}</div>
        <div class="text-[10px] text-gray-500 font-medium">建议时间偏差: +${step.daysOffset} 天内完成</div>
      `;
      aiSubtasksPreview.appendChild(row);
    });
  }

  // 导入拆解出的子任务
  aiImportBtn.addEventListener('click', () => {
    if (lastDecomposedTasks.length === 0) return;

    const mainTitle = aiInputEl.value.trim();
    
    // 生成主任务，并将 AI 拆解步骤绑定为子任务列表
    const subtaskList = lastDecomposedTasks.map(item => ({
      title: item.title,
      completed: false
    }));

    // 计算主任务截止日期：取步骤中最大的 daysOffset
    const maxOffset = Math.max(...lastDecomposedTasks.map(item => item.daysOffset));
    const finalDdl = new Date();
    finalDdl.setDate(finalDdl.getDate() + maxOffset);

    const mainTask = {
      id: `local-${Date.now()}`,
      title: `🏁 目标：${mainTitle}`,
      priority: lastDecomposedTasks[0]?.priority || 'medium',
      ddl: finalDdl.toISOString().substring(0, 10),
      completed: false,
      subtasks: subtaskList
    };

    tasks.unshift(mainTask);
    syncSaveTask(mainTask);
    
    showToast('已将 AI 拆解的任务链成功导入您的学习日程中！', 'success');
    
    // 清理预览
    aiInputEl.value = '';
    aiResultPanel.classList.add('hidden');
    lastDecomposedTasks = [];

    renderTasks();
  });

  // ==========================================
  // 11. 设置与 API 密钥面板事件
  // ==========================================
  
  // 打开抽屉
  settingsTrigger.addEventListener('click', () => {
    // 填充当前已存储的值
    settingsSupabaseUrl.value = localStorage.getItem('vibe_supabase_url') || '';
    settingsSupabaseKey.value = localStorage.getItem('vibe_supabase_key') || '';
    settingsApiKey.value = localStorage.getItem('vibe_api_key') || '';
    settingsApiUrl.value = localStorage.getItem('vibe_api_url') || 'https://api.openai.com/v1';
    settingsApiModel.value = localStorage.getItem('vibe_api_model') || 'gpt-4o-mini';

    settingsDrawer.classList.remove('translate-x-full');
    drawerOverlay.classList.remove('hidden');
  });

  // 关闭抽屉
  function closeDrawer() {
    settingsDrawer.classList.add('translate-x-full');
    drawerOverlay.classList.add('hidden');
  }

  settingsClose.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // 保存设置
  settingsSaveBtn.addEventListener('click', () => {
    const url = settingsSupabaseUrl.value.trim();
    const key = settingsSupabaseKey.value.trim();
    const apiKey = settingsApiKey.value.trim();
    const apiUrl = settingsApiUrl.value.trim();
    const model = settingsApiModel.value.trim();

    localStorage.setItem('vibe_supabase_url', url);
    localStorage.setItem('vibe_supabase_key', key);
    localStorage.setItem('vibe_api_key', apiKey);
    localStorage.setItem('vibe_api_url', apiUrl);
    localStorage.setItem('vibe_api_model', model);

    showToast('配置已保存！正在刷新应用以建立连接...', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  });

  // ==========================================
  // 12. 反重力开关动作与 Matter.js 的绑定
  // ==========================================
  gravityToggleBtn.addEventListener('click', () => {
    // 启动物理引擎
    window.VibePhysics.start();
  });

  gravityRecoverBtn.addEventListener('click', () => {
    // 关闭物理引擎并恢复排版
    window.VibePhysics.restore();
  });

  // 登录/注册按钮：点击打开模态框或退出
  githubLoginBtn.addEventListener('click', async () => {
    if (currentUserId) {
      // 已登录 → 退出
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          showToast(`退出登录失败: ${error.message}`, 'warning');
        } else {
          showToast('已安全退出登录，切回本地存储模式', 'success');
        }
      }
    } else {
      // 未登录 → 打开模态框
      if (!supabaseClient) {
        showToast('⚠️ 未连接 Supabase，请点击右下角齿轮按钮配置数据库！', 'warning');
        settingsTrigger.click();
      } else {
        openAuthModal('login');
      }
    }
  });

  // ==========================================
  // 13. 初始化加载
  // ==========================================
  initSupabase();
  updateTimerDisplay();
  updateStats();
});

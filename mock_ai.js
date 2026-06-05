/**
 * VibeStudy - 智能任务拆解引擎 (AI Decomposer Engine)
 */

window.VibeAI = {
  /**
   * 智能拆解主入口
   * @param {string} prompt 用户输入的目标描述
   * @returns {Promise<Array>} 返回拆解后的子任务数组
   */
  async decompose(prompt) {
    const config = this.getAPIConfig();
    
    // 如果配置了 API 密钥，尝试进行真实大模型调用
    if (config.apiKey && config.apiKey.trim().startsWith('sk-')) {
      try {
        return await this.callRealAPI(prompt, config);
      } catch (err) {
        console.warn('Real AI API call failed, falling back to local engine:', err);
        // 调用失败则回退到本地启发式引擎
        if (window.showToast) {
          window.showToast('⚠️ AI 接口调用失败，已自动启用本地高仿真引擎进行拆解！', 'warning');
        }
      }
    }
    
    // 默认执行本地启发式规则引擎
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.heuristicDecompose(prompt));
      }, 1000); // 模拟网络延迟，让动效更自然
    });
  },

  /**
   * 获取 API 存储配置
   */
  getAPIConfig() {
    return {
      apiKey: localStorage.getItem('vibe_api_key') || '',
      apiUrl: localStorage.getItem('vibe_api_url') || 'https://api.openai.com/v1',
      model: localStorage.getItem('vibe_api_model') || 'gpt-4o-mini'
    };
  },

  /**
   * 真实大模型 API 交互
   */
  async callRealAPI(prompt, config) {
    const systemPrompt = `你是一个资深的大学学业规划导师。请将用户输入的复杂学业任务，按照线性逻辑和时间顺序，自动解构为恰好 4 个包含时间偏移量的具体子任务卡片。
你必须严格只返回一个标准的 JSON 数组，不需要 Markdown 的 \`\`\` 格式包裹，也不要任何前言和后记，以便程序直接解析。
JSON 数组中包含的对象格式必须严格为：
[
  {
    "title": "子任务标题(如：🎯 第一步：收集学术文献大纲)",
    "priority": "high", // 必须在 "high", "medium", "low" 三者中选择一个
    "daysOffset": 1 // 该任务建议在几天后完成（整数，0表示今天，1表示明天，以此类推）
  }
]`;

    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请帮我拆解任务: "${prompt}"` }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`API HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // 清理 markdown 包裹（如果有的话）
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    } else {
      throw new Error('Parsed API output is not a valid task array');
    }
  },

  /**
   * 本地启发式规则引擎 (Heuristic Engine)
   */
  heuristicDecompose(prompt) {
    const input = prompt.toLowerCase();
    
    // 1. 发表/答辩类 (Presentation / Slide)
    if (input.includes('发表') || input.includes('ppt') || input.includes('presentation') || input.includes('答辩') || input.includes('展示')) {
      return [
        {
          title: '🎯 确定发表主题与内容大纲 (框架逻辑设计)',
          priority: 'high',
          daysOffset: 0
        },
        {
          title: '📊 设计并制作 PPT 演示幻灯片 (视觉排版与排架)',
          priority: 'high',
          daysOffset: 1
        },
        {
          title: '🎙️ 编写演讲逐字稿并精炼核心 Q&A 问题',
          priority: 'medium',
          daysOffset: 2
        },
        {
          title: '⏱️ 模拟发表计时排练与语调手势调整 (防超时演练)',
          priority: 'low',
          daysOffset: 3
        }
      ];
    }
    
    // 2. 论文/报告/学术写作类 (Paper / Thesis)
    if (input.includes('论文') || input.includes('报告') || input.includes('paper') || input.includes('写作') || input.includes('文献') || input.includes('总结')) {
      return [
        {
          title: '🔍 检索文献资料并撰写论文核心逻辑大纲',
          priority: 'high',
          daysOffset: 0
        },
        {
          title: '📝 编写引言、核心方法论与初稿正文内容',
          priority: 'high',
          daysOffset: 2
        },
        {
          title: '📊 整理图表数据、结论与参考文献格式排版',
          priority: 'medium',
          daysOffset: 3
        },
        {
          title: '🔎 进行论文润色查重与最终格式校对交付',
          priority: 'low',
          daysOffset: 4
        }
      ];
    }

    // 3. 编程/开发/Git提交类 (Project / Coding)
    if (input.includes('代码') || input.includes('编程') || input.includes('开发') || input.includes('project') || input.includes('大作业') || input.includes('git') || input.includes('实现') || input.includes('测试')) {
      return [
        {
          title: '🛠️ 梳理系统架构与需求，配置基础开发环境',
          priority: 'high',
          daysOffset: 0
        },
        {
          title: '💻 编写核心逻辑模块并进行 Git Commit 迭代',
          priority: 'high',
          daysOffset: 2
        },
        {
          title: '🧪 进行模块联调测试与常见 Bug 修复优化',
          priority: 'medium',
          daysOffset: 3
        },
        {
          title: '📁 撰写 Demo 演示文档与项目交付报告归档',
          priority: 'low',
          daysOffset: 4
        }
      ];
    }

    // 4. 复习/考试/刷题类 (Exam / Test)
    if (input.includes('考试') || input.includes('复习') || input.includes('exam') || input.includes('期末') || input.includes('刷题') || input.includes('数学') || input.includes('微积分')) {
      return [
        {
          title: '📚 梳理全书核心考点，建立知识导图与公式表',
          priority: 'high',
          daysOffset: 0
        },
        {
          title: '📝 专项突破经典课后习题与平时作业错题集',
          priority: 'high',
          daysOffset: 1
        },
        {
          title: '⏱️ 选取历年真题进行模拟限时测试与错因分析',
          priority: 'medium',
          daysOffset: 2
        },
        {
          title: '🧠 核心难点再复盘，快速速记背诵与状态调整',
          priority: 'low',
          daysOffset: 3
        }
      ];
    }

    // 5. 兜底通用类 (General Fallback)
    return [
      {
        title: '📋 明确任务的输出标准，搜集并规划基础资源',
        priority: 'high',
        daysOffset: 0
      },
      {
        title: '🔨 开展第一阶段核心工作，攻克最大技术/写作难题',
        priority: 'high',
        daysOffset: 1
      },
      {
        title: '🔍 补全剩余次要部分，并对整体成果进行整合打磨',
        priority: 'medium',
        daysOffset: 2
      },
      {
        title: '🚀 按照交付标准做最终检查与校准，按时完成提交',
        priority: 'low',
        daysOffset: 3
      }
    ];
  }
};

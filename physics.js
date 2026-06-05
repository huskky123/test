/**
 * VibeStudy - 物理碰撞与反重力引擎 (Anti-Gravity Physics Engine)
 */

window.VibePhysics = {
  engine: null,
  runner: null,
  world: null,
  bodies: [],
  boundaries: [],
  mouseConstraint: null,
  isActive: false,
  originalStyles: new Map(), // 存储原本的样式，用于无缝恢复
  animationFrameId: null,

  /**
   * 初始化并启动反重力模式
   */
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // 添加全局激活类，禁用滚动，调整氛围
    document.body.classList.add('physics-mode-active');
    
    // 显示底部的控制恢复栏
    const recoverBar = document.getElementById('gravity-recover-bar');
    if (recoverBar) recoverBar.classList.remove('hidden');

    // 1. 抓取所有标记为 .physics-body 的页面核心卡片与头部
    const elements = Array.from(document.querySelectorAll('.physics-body'));
    
    // 2. [关键细节] 第一步：测量并缓存所有元素的原始尺寸与位置，防止后续定位引起的文档流塌陷
    const measurements = elements.map(el => {
      const rect = el.getBoundingClientRect();
      return {
        element: el,
        rect: {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height
        }
      };
    });

    // 3. 创建 Matter.js 引擎
    this.engine = Matter.Engine.create({
      gravity: { y: 1, scale: 0.001 } // 设定标准的向下重力
    });
    this.world = this.engine.world;

    // 4. 第二步：将所有 DOM 元素脱离标准文档流，设置为 position: fixed 绝对定位在原位置
    this.originalStyles.clear();
    this.bodies = [];

    measurements.forEach(({ element, rect }) => {
      // 备份原本的 inline 样式以供复原
      this.originalStyles.set(element, {
        position: element.style.position || '',
        left: element.style.left || '',
        top: element.style.top || '',
        width: element.style.width || '',
        height: element.style.height || '',
        transform: element.style.transform || '',
        margin: element.style.margin || '',
        zIndex: element.style.zIndex || ''
      });

      // 应用脱离文档流的 fixed 样式
      element.style.position = 'fixed';
      element.style.left = '0px';
      element.style.top = '0px';
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.style.margin = '0';
      element.style.zIndex = '1000';
      
      // 预先定位到原本的 left, top
      element.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0px) rotate(0rad)`;

      // 5. 在 Matter.js 世界中为该元素创建对应大小的矩形刚体
      // Matter.js 刚体原点位于中心，因此需要 (left + width/2, top + height/2)
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      const body = Matter.Bodies.rectangle(cx, cy, rect.width, rect.height, {
        restitution: 0.6, // 弹性系数
        friction: 0.1,    // 表面摩擦力
        frictionAir: 0.01,// 空气阻力
        density: 0.001,   // 质量密度
        label: 'card-body'
      });

      // 绑定 DOM 引用到物理体上，用于数据同步
      body.domElement = element;
      body.width = rect.width;
      body.height = rect.height;
      body.originalLeft = rect.left;
      body.originalTop = rect.top;

      this.bodies.push(body);
      Matter.Composite.add(this.world, body);
    });

    // 6. 创建浏览器视口边缘的静止刚体围栏（防卡片掉出屏幕）
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const thickness = 100; // 围栏厚度

    this.boundaries = [
      // 地板 (放置在底部外侧)
      Matter.Bodies.rectangle(viewWidth / 2, viewHeight + thickness / 2, viewWidth * 2, thickness, { isStatic: true }),
      // 左侧墙壁
      Matter.Bodies.rectangle(-thickness / 2, viewHeight / 2, thickness, viewHeight * 2, { isStatic: true }),
      // 右侧墙壁
      Matter.Bodies.rectangle(viewWidth + thickness / 2, viewHeight / 2, thickness, viewHeight * 2, { isStatic: true }),
      // 很高很高的天花板 (防卡片被疯狂甩飞出宇宙)
      Matter.Bodies.rectangle(viewWidth / 2, -1000, viewWidth * 2, thickness, { isStatic: true })
    ];
    Matter.Composite.add(this.world, this.boundaries);

    // 7. 开启鼠标/手指物理抓取约束 (MouseConstraint)
    const mouse = Matter.Mouse.create(document.body);
    this.mouseConstraint = Matter.MouseConstraint.create(this.engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.15, // 抓取绳索弹性
        render: { visible: false }
      }
    });

    // 解决物理拖拽与子元素按钮点击事件的冲突：如果只是点击而没有移动，允许点击
    let mouseDragged = false;
    Matter.Events.on(this.mouseConstraint, 'startdrag', () => {
      mouseDragged = false;
    });
    Matter.Events.on(this.mouseConstraint, 'mousemove', () => {
      mouseDragged = true;
    });

    // 页面卡片内的某些点击可能会被 drag 行为拦截，通过全局判定：如果正在拖拽，禁用物理内子按钮的 pointer-events
    Matter.Events.on(this.mouseConstraint, 'startdrag', (event) => {
      if (event.body) {
        event.body.domElement.classList.add('disabled-drag');
      }
    });
    Matter.Events.on(this.mouseConstraint, 'enddrag', (event) => {
      if (event.body) {
        event.body.domElement.classList.remove('disabled-drag');
      }
    });

    Matter.Composite.add(this.world, this.mouseConstraint);

    // 8. 启动引擎执行器
    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);

    // 9. 启动渲染更新帧，同步 Matter 刚体位置到 DOM 元素的 style transform
    const updateRender = () => {
      if (!this.isActive) return;

      this.bodies.forEach(body => {
        const x = body.position.x - body.width / 2;
        const y = body.position.y - body.height / 2;
        const angle = body.angle;

        // 使用 3D 硬件加速，提升性能
        body.domElement.style.transform = `translate3d(${x}px, ${y}px, 0px) rotate(${angle}rad)`;
      });

      this.animationFrameId = requestAnimationFrame(updateRender);
    };
    
    updateRender();
    
    if (window.showToast) {
      window.showToast('🌌 反重力模式已开启！你可以用鼠标抓取、甩飞任意卡片解压！', 'info');
    }
  },

  /**
   * 恢复正常的页面排版
   */
  restore() {
    if (!this.isActive) return;
    this.isActive = false;

    // 取消渲染循环与物理执行器
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.runner) Matter.Runner.stop(this.runner);

    // 隐藏控制栏
    const recoverBar = document.getElementById('gravity-recover-bar');
    if (recoverBar) recoverBar.classList.add('hidden');

    // 处理窗口尺寸改变时的还原匹配
    const promises = this.bodies.map(body => {
      return new Promise(resolve => {
        const el = body.domElement;
        
        // 1. 添加平滑过渡 CSS 类 (在 style.css 中定义为 0.8s transition)
        el.classList.add('physics-returning');
        
        // 2. 将 translate 平滑漂移回原本缓存的 left, top，并将角度旋转回 0
        el.style.transform = `translate3d(${body.originalLeft}px, ${body.originalTop}px, 0px) rotate(0rad)`;
        
        // 3. 监听 transition 结束事件，清空所有行内定位属性，完美回退至标准文档流
        const onTransitionEnd = (e) => {
          if (e.propertyName === 'transform') {
            el.removeEventListener('transitionend', onTransitionEnd);
            el.classList.remove('physics-returning');
            
            // 恢复最初的样式
            const orig = this.originalStyles.get(el);
            if (orig) {
              el.style.position = orig.position;
              el.style.left = orig.left;
              el.style.top = orig.top;
              el.style.width = orig.width;
              el.style.height = orig.height;
              el.style.transform = orig.transform;
              el.style.margin = orig.margin;
              el.style.zIndex = orig.zIndex;
            }
            resolve();
          }
        };
        
        el.addEventListener('transitionend', onTransitionEnd);
        
        // 兜底安全策略：以防 transitionend 没触发
        setTimeout(() => {
          el.classList.remove('physics-returning');
          const orig = this.originalStyles.get(el);
          if (orig) {
            el.style.position = orig.position;
            el.style.left = orig.left;
            el.style.top = orig.top;
            el.style.width = orig.width;
            el.style.height = orig.height;
            el.style.transform = orig.transform;
            el.style.margin = orig.margin;
            el.style.zIndex = orig.zIndex;
          }
          resolve();
        }, 850);
      });
    });

    // 4. 清理 Matter 刚体及世界容器
    Promise.all(promises).then(() => {
      if (this.world) {
        Matter.World.clear(this.world, false);
      }
      if (this.engine) {
        Matter.Engine.clear(this.engine);
      }
      this.bodies = [];
      this.boundaries = [];
      this.originalStyles.clear();
      
      // 移除禁用滚动的全局类
      document.body.classList.remove('physics-mode-active');
      
      if (window.showToast) {
        window.showToast('🚀 排版恢复成功！已重新返回普通学习状态。', 'success');
      }
    });
  },

  /**
   * 监听窗口缩放，同步更新物理围栏大小
   */
  handleResize() {
    if (!this.isActive || !this.engine) return;
    
    // 我们可以在窗口大小调整时销毁重建边界，或者重定位边界位置
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const thickness = 100;

    // 地板
    Matter.Body.setPosition(this.boundaries[0], { x: viewWidth / 2, y: viewHeight + thickness / 2 });
    // 左墙
    Matter.Body.setPosition(this.boundaries[1], { x: -thickness / 2, y: viewHeight / 2 });
    // 右墙
    Matter.Body.setPosition(this.boundaries[2], { x: viewWidth + thickness / 2, y: viewHeight / 2 });
  }
};

// 监听窗口尺寸调整
window.addEventListener('resize', () => {
  window.VibePhysics.handleResize();
});

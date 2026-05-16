# 积分小管家 (Child Points Manager)

微信小程序 - 孩子积分管理系统，家长通过设定任务让孩子赚取/消费积分（1积分=1分钟娱乐时间）。

## 技术栈

- 微信小程序（WXML / WXSS / JS）
- 微信云开发（云函数 + 云数据库）
- 无第三方 UI 框架

## 项目结构

```
├── cloudfunctions/          # 云函数
│   ├── login/               # 用户登录，获取/注册 openid
│   ├── family/              # 家庭创建/加入/管理
│   ├── task/                # 任务增删改查
│   ├── record/              # 积分记录（赚/花）
│   └── stats/               # 统计数据
├── miniprogram/
│   ├── images/              # Tab bar 图标 (81×81px PNG)
│   ├── pages/
│   │   ├── index/           # 首页 - 积分展示 + 任务快捷入口
│   │   ├── setup/           # 初始设置 - 昵称输入 + 预设选择
│   │   ├── record/          # 记录积分 - 计时器模式
│   │   ├── history/         # 积分流水
│   │   ├── record-detail/   # 记录详情
│   │   ├── family/          # 家庭管理 - 成员/邀请码/月度赠送
│   │   └── task-manage/     # 任务管理 - 增删改（仅管理员）
│   └── utils/
│       ├── cloud.js         # 云函数调用封装
│       └── util.js          # 工具函数
└── project.config.json
```

## 踩坑记录

### CSS 兼容性

- **`gap` 属性不可靠**：微信小程序基础库对 flex `gap` 支持不一致，使用 `margin` 替代。示例：
  ```css
  /* 错误 */
  .grid { display: flex; gap: 20rpx; }
  /* 正确 */
  .grid { display: flex; margin: 0 -10rpx; }
  .item { margin: 0 10rpx 20rpx; }
  ```

- **伪元素拦截触摸事件**：`.points-card` 使用 `::before`/`::after` 配合 `position: relative` + `overflow: hidden` 会导致子元素的 `bindtap` 失效。移除伪元素后恢复正常。

### 数据模型

- **ICON_MAP 模式**：数据库存储文本 key（`book`、`homework`、`tv`），页面需要映射到 emoji 显示。每个需要显示图标的页面都必须包含映射逻辑：
  ```javascript
  const ICON_MAP = {
    book: '📖', homework: '✏️', pen: '🖊️', run: '🏃', clean: '🧹',
    tv: '📺', game: '🎮', snack: '🍪'
  }
  // 在 loadTasks 中映射
  tasks.map(t => ({ ...t, emoji: ICON_MAP[t.icon] || '⭐' }))
  ```
  WXML 使用 `{{item.emoji}}` 而非 `{{item.icon}}`。

### 事件处理

- **`catchtap=""` 空字符串会出问题**：部分基础库版本下 `catchtap=""`（空 handler 名）会导致异常。改为 `catchtap="onPreventBubble"` 并在 JS 中定义空方法。

### Tab Bar 图标

- 图标规格：**81×81px PNG，透明背景**
- 图标实际内容尺寸不超过 **48px**，确保上下左右有足够边距（约 16px），否则会被裁切
- WeChat 会自动将未选中图标配色为灰色，但为了精确控制颜色，建议手动生成灰色版本
- 从设计稿切图时先确认实际网格布局（本项目是 2列×3行：左=灰色轮廓，右=绿色填充）

### 页面导航

- `wx.navigateTo`：保留当前页，可返回（适用于大多数场景）
- `wx.redirectTo`：关闭当前页，不可返回（适用于 setup 完成后跳转首页）
- `wx.switchTab`：跳转 tab bar 页面（只能用这个跳 tab 页）

### 条件渲染空白页

- `wx:if` / `wx:elif` 链条必须覆盖所有状态，否则某些状态下页面空白。必须添加兜底 `wx:elif`：
  ```xml
  <view wx:if="{{loading}}">加载中</view>
  <view wx:elif="{{familyInfo}}">正常内容</view>
  <view wx:elif="{{!loading && !familyInfo}}">兜底：未找到数据</view>
  ```

### 云函数

- 修改云函数代码后需要通过微信开发者 IDE 重新上传部署，本地改动不会自动生效
- `cloud.callFunction` 返回的是 `result.result`，注意在封装层处理

## 换电脑开发指南

换电脑后按以下步骤恢复开发环境：

1. **安装微信开发者工具**：从 https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html 下载
2. **微信扫码登录**开发者工具
3. **Clone 项目**：`git clone` 到本地
4. **导入项目**：开发者工具 → 导入项目 → 选择项目目录（appid `wx74fe63d29aab06af` 已在 `project.config.json` 中，会自动识别）
5. **云开发环境**：点击工具栏「云开发」按钮，确认环境已绑定（环境跟着 appid 走，不需要重新创建）
6. **部署云函数**（必须，云函数代码改本地不会自动生效）：
   - 右键 `cloudfunctions/login` → 上传并部署：云端安装依赖
   - 右键 `cloudfunctions/family` → 上传并部署：云端安装依赖
   - 右键 `cloudfunctions/task` → 上传并部署：云端安装依赖
   - 右键 `cloudfunctions/record` → 上传并部署：云端安装依赖
   - 右键 `cloudfunctions/stats` → 上传并部署：云端安装依赖

**不需要手动配置的东西：**
- `project.private.config.json` 是 IDE 个人偏好（热重载、URL检查等），IDE 会自动生成，已加入 `.gitignore`
- 云数据库和云存储跟着云开发环境走，不需要迁移

## 开发约定

- 颜色体系：主色 `#4CAF50`（绿），花积分 `#FF7043`（橙），危险操作 `#ff5252`（红），辅助 `#2196F3`（蓝）
- 按钮：圆角药丸形（48rpx），渐变背景 + 阴影
- 卡片：白色背景，20rpx 圆角，柔和阴影
- 标签：`.tag-earn`（绿底绿字）、`.tag-spend`（橙底橙字）

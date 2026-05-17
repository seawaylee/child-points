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

- **`calc()` 混合百分比和 rpx 不可靠**：`calc(33.33% - 16rpx)` 在不同机型上表现不一致，会导致布局溢出。用纯百分比宽度 + `box-sizing: border-box` + `padding` 替代：
  ```css
  /* 错误 */
  .item { width: calc(33.33% - 16rpx); margin: 0 8rpx; }
  /* 正确 */
  .item { width: 33.33%; box-sizing: border-box; padding: 0 8rpx; }
  ```

- **伪元素拦截触摸事件**：`.points-card` 使用 `::before`/`::after` 配合 `position: relative` + `overflow: hidden` 会导致子元素的 `bindtap` 失效。移除伪元素后恢复正常。

- **事件冒泡用 `catchtap` 而非 `bindtap`**：在卡片内部有按钮时，外层用 `bindtap` 做卡片点击，内部按钮用 `catchtap` 阻止冒泡。但注意 `catchtap=""` 空字符串会报错，必须绑定一个实际存在的方法名。

### 布局模式

- **多列网格**：用 `flex` + `百分比宽度` + `box-sizing: border-box` 是最可靠的方案。不要用 `calc()` 混合单位。
- **滑动删除**：结构为外层 `position: relative; overflow: hidden`，删除按钮 `position: absolute` 定位，滑动内容 `position: relative; z-index: 1` 通过 `transform: translateX` 实现。删除按钮是滑动内容的兄弟元素，不是子元素，否则会覆盖卡片内的交互元素。
- **卡片内嵌套可点击区域**：确保外层和内层的点击事件不冲突，用 `catchtap` 阻止内层事件冒泡到外层。

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

  注意：新增任务时允许用户自定义 emoji 图标，此时 `icon` 字段直接存 emoji 字符串，不需要走 ICON_MAP 映射。兼容逻辑：`item.emoji || ICON_MAP[item.icon] || '⭐'`。

- **数据隔离**：所有业务数据通过 `familyId` 隔离。每个用户的 `users` 表记录绑定一个 `familyId`，所有查询（任务、记录、统计）都以此为过滤条件。不同家庭的数据完全隔离，可安全分享给多个家庭使用。

- **余额计算**：余额 = 所有记录的 `points` 字段求和。赚积分为正数，花积分为负数。删除记录即回滚积分，不需要额外的余额字段维护。

### 事件处理

- **`catchtap=""` 空字符串会出问题**：部分基础库版本下 `catchtap=""`（空 handler 名）会导致异常。改为 `catchtap="onPreventBubble"` 并在 JS 中定义空方法。

- **长按事件**：`bindlongpress` 用于触发上下文菜单（如删除、撤销），配合 `wx.showModal` 做二次确认。

- **触摸事件与滑动**：`bindtouchstart` / `bindtouchend` 获取触摸位置，手动计算滑动方向和距离。微信小程序没有原生的滑动组件，需要自行实现。

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
- **miniprogram/ 目录的改动不需要部署**，开发者工具编译即可生效
- **云函数参数解构要注意作用域**：`updateAction(OPENID, { name, childName, monthlyAllowance })` 中如果直接引用 `event.monthlyAllowance` 会是 undefined，必须从参数解构中取值
- **switch-case 要覆盖所有 action**：新增前端调用的 action 必须在 cloud function 的 switch 中注册，否则返回"未知的操作类型"。常见遗漏：`leave`、`delete` 等。

### 小程序 observers（数据监听器）

- **observers 监听多字段不可靠**：`'fieldA, fieldB, fieldC'` 的写法在部分场景下不会在每次字段变化时正确触发，尤其是当 setData 同时修改多个字段时。实测发现 observer 的回调可能不执行或参数值不准确。
- **推荐做法**：不用 observers 计算派生数据，改为在每个事件处理函数末尾手动调用计算函数（如 `_calcPoints()`）。简单直接，行为可预测。
- **调试技巧**：在 WXML 里临时加一个 `<view>` 显示关键变量值和类型，比 console.log 更直观（console 输出在真机调试时不容易看）。调试完记得删除。

### BSON 数据类型问题

- 云数据库底层是 MongoDB，整数通过 `tcb` CLI 查询显示为 `{"$numberInt": "1"}` 格式
- 通过 `wx.cloud.callFunction` 返回给小程序的数据，在部分情况下也可能保留 BSON 扩展类型
- **`JSON.parse(JSON.stringify())` 不能转换 BSON 类型**，它只是原样保留 `{"$numberInt": "1"}` 对象
- `miniprogram/utils/cloud.js` 中的 `convertBSON()` 函数会递归处理 `$numberInt`、`$numberLong`、`$numberDouble`，转为原生 JS 类型

### 权限模型

- **admin / member 双角色**：`users` 表的 `role` 字段，创建者为 `admin`，加入者为 `member`
- **权限校验在云函数**：所有管理操作（update family、manage tasks、change role、remove member）都在云函数层校验 `user.role === 'admin'`，前端只做 UI 层的显示/隐藏
- **管理员不能修改自己角色**：`changeRole` action 中校验 `memberId !== OPENID`，防止全家无 admin 的局面
- **记录删除权限**：记录创建者可删除自己的记录，admin 可删除任何人的记录

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

## tcb CLI 操作指南

CloudBase CLI (v3.3.3) 可在终端直接操作云开发资源，不需要打开微信开发者工具。

### 环境信息

- 环境ID：`cloud1-d3gr5o0l455bab8a2`
- 全局参数：`-e cloud1-d3gr5o0l455bab8a2`

### 云函数部署

```bash
# 部署单个云函数（--force 跳过确认，echo "y" 自动确认覆盖）
echo "y" | tcb fn deploy learn -e cloud1-d3gr5o0l455bab8a2 --dir cloudfunctions/learn --force

# 查看云函数详情（确认超时、内存等配置）
tcb fn detail learn -e cloud1-d3gr5o0l455bab8a2

# 通过 cloudbaserc.json 配置超时和内存（放在项目根目录）
# {
#   "envId": "cloud1-d3gr5o0l455bab8a2",
#   "functionRoot": "cloudfunctions",
#   "functions": [{ "name": "tts", "timeout": 20, "runtime": "Nodejs16.13", "handler": "index.main", "memorySize": 256 }]
# }
# 部署时自动读取配置：tcb fn deploy tts -e cloud1-d3gr5o0l455bab8a2
```

### 数据库操作

数据库命令格式统一为 JSON 数组，每个元素包含 `TableName`、`CommandType`、`Command`：

```bash
# 查询（limit 10 条）
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"tasks","CommandType":"QUERY","Command":"{\"find\":\"tasks\",\"limit\":10}"}]'

# 条件查询（filter）
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"tasks","CommandType":"QUERY","Command":"{\"find\":\"tasks\",\"filter\":{\"taskMode\":\"count\"},\"limit\":10}"}]'

# 更新（$set）
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"poems","CommandType":"UPDATE","Command":"{\"update\":\"poems\",\"updates\":[{\"q\":{\"author\":\"李白\"},\"u\":{\"$set\":{\"dynasty\":\"唐\"}}}]}"}]'

# 插入
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"test","CommandType":"INSERT","Command":"{\"insert\":\"test\",\"documents\":[{\"name\":\"hello\"}]}"}]'

# 删除
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"test","CommandType":"DELETE","Command":"{\"delete\":\"test\",\"deletes\":[{\"q\":{\"name\":\"hello\"},\"limit\":1}]}"}]'

# 计数
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"poems","CommandType":"COMMAND","Command":"{\"count\":\"poems\",\"query\":{}}}"]'

# 聚合
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --command '[{"TableName":"records","CommandType":"COMMAND","Command":"{\"aggregate\":\"records\",\"pipeline\":[{\"$group\":{\"_id\":\"$taskType\",\"total\":{\"$sum\":\"$points\"}}}],\"cursor\":{}}}"]'

# 加 --json 输出纯 JSON（方便脚本解析）
tcb db nosql execute -e cloud1-d3gr5o0l455bab8a2 --json --command '[...]'
```

### 数据库返回值的 BSON 类型

通过 CLI 查询返回的数值字段是 MongoDB Extended JSON 格式：
- `{"$numberInt": "1"}` → 整数
- `{"$numberLong": "1234567890"}` → 长整数
- `{"$date": {"$numberLong": "1778901309658"}}` → 日期

**注意**：通过 `wx.cloud.callFunction` 返回给小程序的数据也可能保留这些 BSON 类型！`miniprogram/utils/cloud.js` 中的 `convertBSON()` 函数会递归转换为原生 JS 类型。如果新增云函数返回数据包含数值字段，确保经过 `cloud.callFunction` 封装层处理。

### 批量数据操作技巧

用脚本批量更新数据时，可以用 Python/Node 生成多条命令然后逐条执行：

```bash
# Python 示例：批量给古诗补朝代
python3 -c "
import subprocess, json
# 构造更新命令并执行
cmd = json.dumps([{'TableName':'poems','CommandType':'UPDATE','Command':json.dumps({'update':'poems','updates':[{'q':{'author':'李白'},'u':{'\$set':{'dynasty':'唐'}}}]})}])
subprocess.run(['tcb','db','nosql','execute','-e','cloud1-d3gr5o0l455bab8a2','--command',cmd])
"
```

### 注意事项

- `tcb fn deploy` 会提示覆盖确认，用 `echo "y" |` 管道自动确认
- `miniprogram/` 目录的改动**不需要部署**，开发者工具编译即可
- `cloudfunctions/` 目录的改动**必须部署**才能生效
- CLI 修改的是线上数据/配置，操作不可逆，注意先查询确认再更新/删除

## 开发约定

- 颜色体系：主色 `#4CAF50`（绿），花积分 `#FF7043`（橙），危险操作 `#ff5252`（红），辅助 `#2196F3`（蓝）
- 按钮：圆角药丸形（48rpx），渐变背景 + 阴影
- 卡片：白色背景，20rpx 圆角，柔和阴影
- 标签：`.tag-earn`（绿底绿字）、`.tag-spend`（橙底橙字）

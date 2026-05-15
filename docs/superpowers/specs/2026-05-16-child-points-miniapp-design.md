# 孩子积分管理微信小程序 - 设计文档

## 概述

家长通过微信小程序管理孩子的积分。孩子完成活动（如看书）赚取积分，进行消费活动（如看电视）消耗积分。支持多家长共同管理，拍照记录凭证。1 积分 = 1 分钟。

## 技术方案

- 前端：原生微信小程序
- 后端：微信云开发（云函数 + 云数据库 + 云存储）
- 无独立服务器

## 页面结构（3 个 Tab）

### Tab 1：积分总览
- 顶部大字显示孩子姓名和当前可用积分
- 下方按 earn/spend 分两组展示任务快捷按钮
- 点击任务按钮弹出时长选择器 → 拍照（可选）→ 确认提交
- 无家庭时显示创建/加入引导

### Tab 2：记一笔
- 任务列表（带图标、名称、类型标识）
- 选择任务后进入记录页：选时长 → 拍照上传 → 填备注（可选）→ 确认
- 时长选择：预设 5/10/15/30/60 分钟 + 自定义输入
- 拍照：调用 wx.chooseMedia，上传到云存储

### Tab 3：历史流水
- 按日期分组的积分变动列表
- 每条记录显示：任务名、积分变动（+30 / -30）、时长、操作人、照片缩略图（可点击查看大图）
- 支持按日期范围筛选
- 顶部显示本周/本月赚花统计

### 其他页面
- 家庭管理页（从设置入口进入）：显示家庭成员列表、邀请码、创建/加入家庭
- 任务管理页：增删改任务模板，设置图标、类型、排序

## 数据模型

### families
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成 |
| name | string | 家庭名称 |
| inviteCode | string | 6 位邀请码 |
| childName | string | 孩子姓名 |
| childAvatar | string | 孩子头像 fileID |
| members | string[] | 家庭成员 openid 列表 |
| createdAt | date | 创建时间 |

### tasks
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成 |
| familyId | string | 所属家庭 |
| name | string | 任务名 |
| type | string | "earn" 或 "spend" |
| pointsPerMinute | number | 每分钟积分数，默认 1 |
| icon | string | 图标标识 |
| sortOrder | number | 排序权重 |
| enabled | boolean | 是否启用 |

### records
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 自动生成 |
| familyId | string | 所属家庭 |
| taskId | string | 关联任务 |
| taskName | string | 任务名（冗余） |
| taskType | string | "earn" / "spend" |
| minutes | number | 时长（分钟）|
| points | number | 积分变动 |
| photoFileId | string | 照片 fileID，可空 |
| createdBy | string | 操作人 openid |
| createdByNick | string | 操作人昵称 |
| note | string | 备注，可空 |
| createdAt | date | 记录时间 |

### users
| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | openid |
| nickName | string | 微信昵称 |
| avatarUrl | string | 微信头像 |
| familyId | string | 所属家庭 |
| role | string | "admin" 或 "member" |

## 多人共享机制

1. 首个用户创建家庭，自动成为 admin，系统生成 6 位邀请码
2. 其他用户在小程序输入邀请码加入家庭，成为 member
3. admin 和 member 均可记录积分
4. 只有 admin 可以管理家庭成员和任务模板

## 积分计算

- 积分 = 时长（分钟）× pointsPerMinute
- earn 类任务积分为正数，spend 类任务积分为负数
- 当前可用积分 = 所有 records 的 points 之和（聚合查询）

## 照片上传流程

1. 用户点击拍照按钮 → 调用 wx.chooseMedia 选择/拍摄照片
2. 选择完成后显示预览
3. 提交记录时调用 wx.cloud.uploadFile 上传到云存储
4. 将返回的 fileID 存入 record
5. 列表中通过 wx.cloud.getTempFileURL 获取临时链接展示缩略图

## 预设任务

首次创建家庭时自动生成以下任务模板：

| 任务名 | 类型 | 每分钟积分 | 图标 |
|--------|------|-----------|------|
| 看书 | earn | 1 | 📖 |
| 做作业 | earn | 1 | ✏️ |
| 练字 | earn | 1 | 🖊️ |
| 运动 | earn | 1 | 🏃 |
| 做家务 | earn | 1 | 🧹 |
| 看电视 | spend | 1 | 📺 |
| 玩游戏 | spend | 1 | 🎮 |
| 吃零食 | spend | 1 | 🍪 |

## 项目目录结构

```
child/
├── miniprogram/
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── pages/
│   │   ├── index/          # 积分总览（首页）
│   │   ├── record/         # 记一笔
│   │   ├── history/        # 历史流水
│   │   ├── record-detail/  # 记录详情页（选时长+拍照）
│   │   ├── family/         # 家庭管理
│   │   └── task-manage/    # 任务模板管理
│   ├── components/
│   │   ├── task-button/    # 任务快捷按钮组件
│   │   ├── points-card/    # 积分展示卡片
│   │   └── record-item/    # 流水记录条目组件
│   ├── utils/
│   │   ├── cloud.js        # 云开发封装
│   │   └── util.js         # 通用工具函数
│   └── images/             # 本地图标资源
├── cloudfunctions/
│   ├── login/              # 登录云函数
│   ├── family/             # 家庭相关操作
│   ├── task/               # 任务 CRUD
│   ├── record/             # 积分记录 CRUD
│   └── stats/              # 统计聚合
├── project.config.json
└── docs/
```

## 扩展预留

- 多孩子支持：在 families 集合中增加 children 数组，records 增加 childId 字段
- 多家庭支持：users 集合增加 families 数组，支持家庭切换
- 这些扩展不在当前实现范围内，但数据模型预留了空间

# 学习模块 - 数据导入说明

## 数据来源（全部为权威开源/公共数据）

| 数据 | 来源 | 说明 |
|------|------|------|
| 古诗 252首 | chinese-poetry/gaokao-poetry/Junior-Middle-School-poetry (GitHub) | 新课标必背，小学75+初中118+高中59 |
| 英语单词 819个 | kajweb/dict (GitHub) | PEP人教版三年级~六年级，含音标/释义/例句 |
| 英语句子 180条 | Tatoeba + CEFR-SP (学术数据集) | 初级/中级/高级各60条，权威英中对照 |
| 英语段落 30条 | Tatoeba + CEFR-SP | 中级15条+高级15条，英中对照 |
| 英语文章 65篇 | Simple Wikipedia (公有领域) | 初级22+中级23+高级20篇 |

## 导入步骤

### 1. 清空旧数据（如果需要重新导入）
- 云开发 → 数据库 → `english_words` → 清空
- `english_sentences` → 清空

### 2. 创建新集合（如果还没有）
- `english_articles` — 英语文章
- `learn_progress` — 学习进度（空集合即可）

### 3. 逐个导入

| 导入文件 | 目标集合 |
|----------|----------|
| scripts/poems_import.json | poems（已导入可跳过） |
| scripts/english_words_import.json | english_words |
| scripts/english_sentences_import.json | english_sentences |
| scripts/english_paragraphs_import.json | english_sentences（追加导入） |
| scripts/english_articles_import.json | english_articles |

每个文件都是 JSON Lines 格式（每行一个 JSON 对象），在云开发控制台选择"导入"→ 选择文件 → 格式选 JSON。

### 4. 部署云函数
- 右键 `cloudfunctions/learn` → 上传并部署：云端安装依赖
- 右键 `cloudfunctions/tts` → 上传并部署：云端安装依赖

### 5. 配置 TTS（可选）
- 在云函数 `tts` 的环境变量中设置 `MIMO_API_KEY`

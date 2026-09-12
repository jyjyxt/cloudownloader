# 幕布 (Mubu)

**Mode**: 🔐 Browser · **Domain**: `mubu.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl mubu doc` | 读取文档内容（Markdown / 纯文本） |
| `cloudl mubu docs` | 列出文档和文件夹 |
| `cloudl mubu notes` | 读取速记（今日 / 指定日期范围） |
| `cloudl mubu recent` | 最近编辑的文档 |
| `cloudl mubu search` | 全文搜索文档节点 |

## Usage Examples

```bash
# Read a document in Markdown (default)
cloudl mubu doc <doc-id>

# Read a document as plain text
cloudl mubu doc <doc-id> --output text

# List documents in root folder
cloudl mubu docs

# List starred (quick-access) documents
cloudl mubu docs --starred

# List documents in a specific folder
cloudl mubu docs --folder <folder-id>

# Read today's daily notes
cloudl mubu notes

# Read notes for a specific date
cloudl mubu notes --date 2026-04-10

# Read notes for an entire month
cloudl mubu notes --month 2026-04

# List note dates with entry counts (no content)
cloudl mubu notes --list --month 2026-04

# Read notes for a custom date range
cloudl mubu notes --from 2026-01-01 --to 2026-03-31

# Show recently edited documents
cloudl mubu recent --limit 10

# Full-text search
cloudl mubu search "关键词"

# JSON output
cloudl mubu docs -f json
```

## Prerequisites

- Chrome running and **logged into** mubu.com
- [Browser Bridge extension](/guide/browser-bridge) installed

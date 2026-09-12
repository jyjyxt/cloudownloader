# Xueqiu (雪球)

**Mode**: 🔐 Browser · **Domain**: `xueqiu.com` / `danjuanfunds.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl xueqiu feed` | 获取雪球首页时间线 |
| `cloudl xueqiu earnings-date` | 获取股票预计财报发布日期 |
| `cloudl xueqiu hot-stock` | 获取雪球热门股票榜 |
| `cloudl xueqiu hot` | 获取雪球热门动态 |
| `cloudl xueqiu search` | 搜索雪球股票（代码或名称） |
| `cloudl xueqiu stock` | 获取雪球股票实时行情 |
| `cloudl xueqiu comments` | 获取单只股票的讨论动态（按时间排序） |
| `cloudl xueqiu watchlist` | 获取雪球自选股列表 |
| `cloudl xueqiu fund-holdings` | 获取蛋卷基金持仓明细（可用 `--account` 按子账户过滤） |
| `cloudl xueqiu fund-snapshot` | 获取蛋卷基金快照（总资产、子账户、持仓，推荐 `-f json`） |

## Usage Examples

```bash
# Quick start
cloudl xueqiu feed --limit 5

# Search stocks
cloudl xueqiu search 茅台

# View one stock
cloudl xueqiu stock SH600519

# View recent discussions for one stock
cloudl xueqiu comments SH600519 --limit 5

# Upcoming earnings dates
cloudl xueqiu earnings-date SH600519 --next

# Danjuan all holdings
cloudl xueqiu fund-holdings

# Filter one Danjuan sub-account
cloudl xueqiu fund-holdings --account 默认账户

# Full Danjuan snapshot as JSON
cloudl xueqiu fund-snapshot -f json

# JSON output
cloudl xueqiu feed -f json

# Verbose mode
cloudl xueqiu feed -v
```

## Prerequisites

- Chrome running and **logged into** `xueqiu.com`
- For fund commands, Chrome must also be logged into `danjuanfunds.com` and able to open `https://danjuanfunds.com/my-money`
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- `fund-holdings` exposes both market value and share fields (`volume`, `usableRemainShare`)
- `fund-snapshot -f json` is the easiest way to persist a full account snapshot for later analysis or diffing
- `comments` returns stock-scoped discussion posts from the symbol page, not reply threads under one parent post
- If the commands return empty data, first confirm the logged-in browser can directly see the Danjuan asset page

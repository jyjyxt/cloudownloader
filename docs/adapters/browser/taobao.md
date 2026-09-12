# Taobao

**Mode**: 🔐 Browser · **Domain**: `taobao.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl taobao search <query>` | Search Taobao products |
| `cloudl taobao detail <id>` | Fetch product details |
| `cloudl taobao reviews <id>` | Fetch product reviews |
| `cloudl taobao cart` | View cart items |
| `cloudl taobao add-cart <id>` | Add a product to cart |

## Usage Examples

```bash
# Search products
cloudl taobao search "机械键盘" --limit 5

# Fetch product details
cloudl taobao detail 827563850178

# Dry-run add to cart
cloudl taobao add-cart 827563850178 --spec "红色 XL" --dry-run
```

## Prerequisites

- Chrome running and logged into taobao.com
- [Browser Bridge extension](/guide/browser-bridge) installed

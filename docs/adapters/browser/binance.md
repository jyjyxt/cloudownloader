# Binance

Access **Binance** market data from the terminal via the public API (no authentication required).

**Mode**: 🌐 Public · **Domain**: `data-api.binance.vision`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl binance price` | Get 24h ticker stats for one symbol |
| `cloudl binance prices` | Get latest prices for all symbols |
| `cloudl binance ticker` | Get 24h ticker stats for all symbols |
| `cloudl binance pairs` | List exchange trading pairs |
| `cloudl binance trades` | Get recent trades for one symbol |
| `cloudl binance depth` | Get order-book depth for one symbol |
| `cloudl binance asks` | Show ask-side depth for one symbol |
| `cloudl binance klines` | Get candlestick data |
| `cloudl binance top` | Show top movers by volume |
| `cloudl binance gainers` | Show top gainers |
| `cloudl binance losers` | Show top losers |

## Usage Examples

```bash
# One symbol, 24h stats
cloudl binance price BTCUSDT

# Latest prices for all pairs
cloudl binance prices

# Recent trades
cloudl binance trades BTCUSDT --limit 20

# Order-book depth
cloudl binance depth BTCUSDT --limit 20

# 1h candles
cloudl binance klines BTCUSDT --interval 1h --limit 50

# JSON output
cloudl binance top -f json
```

## Prerequisites

- No browser required — uses Binance public market-data endpoints

## Notes

- Symbols use Binance market format such as `BTCUSDT` or `ETHUSDT`
- Public market-data endpoints can still be rate-limited upstream; retry if you hit transient failures

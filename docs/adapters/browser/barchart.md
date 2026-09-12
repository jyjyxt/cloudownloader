# Barchart

**Mode**: 🔐 Browser · **Domain**: `barchart.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl barchart quote` | Stock quote with price, volume, and key metrics |
| `cloudl barchart options` | Options chain with greeks, IV, volume, and open interest |
| `cloudl barchart greeks` | Options greeks overview (IV, delta, gamma, theta, vega) |
| `cloudl barchart flow` | Unusual options activity / options flow |

## Usage Examples

```bash
# Get stock quote
cloudl barchart quote AAPL

# View options chain
cloudl barchart options TSLA

# Options greeks overview
cloudl barchart greeks NVDA

# Unusual options flow
cloudl barchart flow --limit 20 -f json
```

## Prerequisites

- Chrome running and able to open `barchart.com`
- [Browser Bridge extension](/guide/browser-bridge) installed

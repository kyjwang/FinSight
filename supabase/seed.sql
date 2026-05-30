insert into public.assets (symbol, name, type, exchange, price, change_percent) values
  ('NVDA', 'NVIDIA Corp.', 'stock', 'NASDAQ', 124.70, 2.18),
  ('AAPL', 'Apple Inc.', 'stock', 'NASDAQ', 196.40, -0.72),
  ('TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', 184.20, 1.08),
  ('BTC-USD', 'Bitcoin', 'crypto', 'Coinbase', 104830.00, 0.94),
  ('ETH-USD', 'Ethereum', 'crypto', 'Coinbase', 3840.00, -1.26)
on conflict (symbol) do update set
  price = excluded.price,
  change_percent = excluded.change_percent,
  updated_at = now();

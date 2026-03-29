-- 市場掃描記錄表
CREATE TABLE IF NOT EXISTS market_scans (
  id VARCHAR(255) PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  confidence VARCHAR(20) NOT NULL,
  
  -- 柯基框數據
  corgi_box_high DECIMAL(20, 8) NOT NULL,
  corgi_box_low DECIMAL(20, 8) NOT NULL,
  corgi_box_middle DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8) NOT NULL,
  
  -- 分析內容
  analysis TEXT NOT NULL,
  viewpoint TEXT NOT NULL,
  bottom_text TEXT,
  
  -- 狀態
  published BOOLEAN DEFAULT FALSE,
  published_at BIGINT,
  image_url VARCHAR(500),
  
  -- 時間戳
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  
  INDEX idx_symbol_timeframe (symbol, timeframe),
  INDEX idx_created_at (created_at),
  INDEX idx_published (published)
);

-- 關鍵價格提醒表
CREATE TABLE IF NOT EXISTS market_scan_key_levels (
  id VARCHAR(255) PRIMARY KEY,
  scan_id VARCHAR(255) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  label VARCHAR(100) NOT NULL,
  note TEXT NOT NULL,
  
  created_at BIGINT NOT NULL,
  
  FOREIGN KEY (scan_id) REFERENCES market_scans(id) ON DELETE CASCADE,
  INDEX idx_scan_id (scan_id)
);

-- 掃描任務日誌表
CREATE TABLE IF NOT EXISTS scan_job_logs (
  id VARCHAR(255) PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL, -- 'hourly_scan' 或 'daily_report'
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  
  -- 掃描的幣種
  symbols JSON NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  
  -- 結果
  scans_created INT DEFAULT 0,
  scans_published INT DEFAULT 0,
  error_message TEXT,
  
  -- 時間戳
  scheduled_at BIGINT NOT NULL,
  started_at BIGINT,
  completed_at BIGINT,
  created_at BIGINT NOT NULL,
  
  INDEX idx_job_type (job_type),
  INDEX idx_status (status),
  INDEX idx_scheduled_at (scheduled_at)
);

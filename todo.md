# Project TODO

- [x] 資料庫 schema 設計（analyses 分析記錄表、generated_materials 素材表）
- [x] 深色主題視覺風格設定（加密貨幣專業工具風格）
- [x] 後端 LLM 盤面分析 API（上傳圖片 → 識別柯基框關鍵位階）
- [x] 後端素材生成 API（3 組 8 字封面大標 + YouTube 爆款標題）
- [x] 後端社群文案生成 API（IG 打臉教學型貼文 + 極簡限動文案）
- [x] 後端 Google Sheets 戰略庫同步 API（寫入日期、幣種、關鍵位階、標題、文案）
- [x] 後端歷史記錄讀取 API（從資料庫讀取過往直播記錄）
- [x] 前端 DashboardLayout 整合與導航設計
- [x] 前端盤面圖片上傳與分析結果展示頁面
- [x] 前端素材生成結果展示與方案選擇介面
- [x] 前端社群文案展示與一鍵複製功能
- [x] 前端 Canva 快速跳轉整合（內建模板連結）
- [x] 前端歷史記錄查詢頁面（複盤標題點擊率）
- [x] 用戶認證與權限管理（Manus OAuth，僅 Patric 可存取）
- [x] 響應式設計（桌面與行動裝置支援）
- [x] Vitest 單元測試（50 tests passed）
- [x] 實作真正的 Google Sheets 寫入（後端呼叫 Sheets API append values）
- [x] 加上 Patric 專屬存取控制（比對 ownerOpenId 限制僅 owner 可用）
- [x] 對生成結果增加後端驗證（封面標題 8 字、限動 ≤3 句）
- [x] 可截圖觀點卡片：盤面分析後產出含關鍵價格、方向、操作觀點的精美卡片，方便截圖發群
- [x] 公開每日盤面分析頁面：任何人可透過網址瀏覽歷史盤面分析，長期累積內容資產
- [x] 觀點發佈功能：分析完成後可「發佈」至公開頁面
- [x] 手機版響應式全面優化（觀點卡片、上傳流程、歷史頁面）
- [x] 電腦版響應式全面優化（寬螢幕佈局、卡片排版）
- [x] YouTube 後台數據串接（頻道統計、影片表現、觀看數、訂閱數）
- [x] YouTube 數據 Dashboard 頁面
- [x] 資料庫新增 published_analyses 公開分析表
- [x] 修復 Home.tsx 幣種/週期輸入框重複顯示問題（改為「其他」按鈕切換）
- [x] PublicArchive/PublicAnalysis 頁面 loading/error/empty state 完善
- [x] YouTube 頁面 loading/error/empty state 完善
- [x] publish 流程重複發佈保護與 slug 唯一性處理（後端已有 getPublishedByAnalysisId 檢查 + nanoid slug）
- [x] ViewpointCard 生成結果異常格式防護（前端 safeData 驗證）
- [x] 公開盤面頁 footer 文字更新為「柯基交易室」
- [x] 公開盤面頁面加上返回主頁按鈕（PublicArchive + PublicAnalysis）
- [x] 幣種週期新增 15M、W、M
- [x] 盤面分析可編輯：關鍵價格數字、多空中立方向
- [x] 觀點卡片可編輯：多空中立方向、操作視角文字
- [x] 直播素材修正：封面大標禁標點符號、以中文為主
- [x] 歷史紀錄可展開觀點卡片
- [x] YouTube 頻道 ID 設定功能（用戶可自行輸入，localStorage 持久化）
- [x] YouTube 新增今日新增追蹤數顯示
- [x] 公開盤面對外開放：訪客只看得到公開盤面，其他頁面鎖定僅 owner 可用
- [x] 公開頁面拔掉返回主頁按鈕
- [x] YouTube 頻道 ID 硬編碼綁定 UCD3t6sdtaGMcP1i9Hf9XrOg
- [x] 公開盤面更名為「每日觀點分析」
- [x] 公開盤面 owner 編輯權限（營利圖/虧損圖上傳）
- [x] 新增「關於我」公開頁面（自我介紹+連絡資訊+免費講義連結）
- [x] 關於我頁面 owner 可編輯
- [x] 資料庫新增 site_settings 表存放可編輯的個人介紹資料
- [x] 後端 API：關於我資料讀取（公開）+ 更新（owner only）
- [x] 後端 API：公開盤面 owner 編輯（營利圖/虧損圖）
- [x] 前端：關於我頁面設計（效仿 KTC 凱旋風格但更簡潔）
- [x] 前端：公開盤面 owner 編輯 UI
- [x] 訪客導航更新：每日觀點分析 + 關於我
- [x] YouTube 頻道統計改用爬取方式（訂閱數/影片數），影片列表仍用 Data API
- [x] 修復：營利圖上傳成功但不顯示在公開頁面（uploadPublishedImage 未寫入 DB）
- [x] Dashboard 每日觀點頁加回主頁面按鈕（方便 owner 操作，改為新分頁開啟）
- [x] 訪客頁右上角「認識 Patric」按鈕改顯眼樣式（綠色填充+微動畫）
- [x] 觀點卡片一鍵下載為單張圖片（html2canvas 渲染，3x 解析度）
- [x] 修復 Dashboard 側邊欄「每日觀點」：改回 Dashboard 內頁面，加小按鈕跳公開頁
- [x] 素材生成頁加 AI 對話框：分析完後可即時跟 AI 對話校正觀點
- [x] Bug：公開頁面訪客有編輯權限，需移除（僅 owner 可編輯）
- [x] Bug：觀點卡片下載失敗，需修復 html2canvas 截圖功能
- [x] Bug：公開頁面 owner 編輯權限被誤刪，需加回（訪客唯讀、owner 可編輯+上傳）
- [x] Bug：html-to-image toPng 因跨域 Google Fonts CSS 觸發 SecurityError，需跳過 web font 嵌入
- [x] Bug：ViewpointCard 的幣種/週期應以用戶上方選擇/手打的為準，而非 AI 回傳的值
- [x] Bug：公開頁面訪客再次看到編輯按鈕，已確認是用戶自己登入狀態導致（正常行為）
- [x] Dashboard 每日觀點頁加「返回」按鈕，不要卡在用戶頁面
- [x] 觀點列表卡片：上傳營利圖顯示綠字「營利」、上傳虧損圖顯示紅字「虧損」
- [x] 觀點詳情頁加交易紀錄框：營利寫原因、虧損寫復盤
- [x] 全站「營利」改為「盈利」（錯字修正）
- [x] 公開頁面（PublicArchive/PublicAnalysis）顯示盈利/虧損標籤
- [x] 公開頁面顯示交易紀錄內容
- [x] Bug：手機網頁無法下載觀點卡片圖片（html-to-image 手機相容性）
- [x] Dashboard 每日觀點詳情頁加回觀點卡片顯示
- [x] 觀點卡片下載按鈕移到 Dashboard 每日觀點（僅 owner 可用）
- [x] 實機驗證手機下載觀點卡片：用戶反映手機無法儲存圖片，已改用直接開新分頁顯示圖片方案
- - [x] Dashboard 加入設定頁面：GitHub 導出、下載 ZIP、網站設定
- [x] 實作 GitHub OAuth 授權：後端儲存 token、前端授權按鈕和狀態顯示
- [x] Bug：下載按鈕無法產生有效 ZIP（檔案無法解壓）
- [x] Bug：GitHub 授權按鈕點了變黑画面（授權流程卡住）


## 交易自動化系統開發（新功能）

### 第一階段：修復基礎問題
- [x] 修復設定頁面路由問題（/settings 被重定向到 /archive）
- [ ] 移除 DashboardLayout 中的登入檢查邏輯

### 第二階段：Bitunix API 集成
- [x] 建立 Bitunix API 客戶端模組 (server/services/bitunix.ts)
- [x] 實現獲取 K 線數據的函數（1H、4H）
- [x] 實現獲取最新價格的函數
- [x] 建立 API 錯誤處理和重試邏輯
- [ ] 添加 Bitunix API 密鑰到環境變數

### 第三階段：柯基框計算邏輯
- [x] 實現次高、次低計算 (server/services/corgiBox.ts)
- [x] 實現 0.5 中線計算
- [x] 實現撐壓轉變判斷邏輯
- [x] 實現做多/做空/中性判斷
- [ ] 添加單元測試

### 第四階段：自動化定時任務
- [ ] 建立定時任務系統 (server/jobs/marketScan.ts)
- [ ] 實現每小時巡視邏輯（08:00-02:00 台灣時間）
- [ ] 實現每天 08:00 早盤日報邏輯
- [ ] 建立任務日誌記錄
- [ ] 建立任務監控端點

### 第五階段：小卡生成和發布
- [x] 設計小卡 UI 模板 (client/src/components/TradeViewpointCard.tsx)
- [ ] 實現小卡圖片生成 (server/services/cardGenerator.ts)
- [ ] 實現小卡發布到 IG Reels 邏輯
- [ ] 實現小卡發布到 YouTube Shorts 邏輯
- [ ] 實現小卡發布到 Google Sheets 邏輯
- [ ] 建立發布隊列系統

### 第六階段：「自動詢盤紀錄」頁面
- [x] 建立資料庫表結構 (market_scans, market_scan_key_levels, scan_job_logs)
- [ ] 修復 db.market-scan.ts 的 TypeScript 錯誤
- [ ] 實現後端 API 端點 (trpc.market.getScanHistory)
- [ ] 建立前端頁面 (client/src/pages/ScanRecords.tsx)
- [ ] 實現分析紀錄展示
- [ ] 實現成果觀察統計
- [ ] 添加篩選和排序功能

### 第七階段：測試和部署
- [ ] 編寫集成測試
- [ ] 測試 Bitunix API 連接
- [ ] 測試柯基框計算邏輯
- [ ] 測試定時任務執行
- [ ] 測試小卡生成
- [ ] 測試發布流程
- [ ] 性能測試和優化

### 第八階段：交付
- [ ] 部署到生產環境
- [ ] 驗證所有功能正常運行
- [ ] 建立使用文檔
- [ ] 交付給用戶

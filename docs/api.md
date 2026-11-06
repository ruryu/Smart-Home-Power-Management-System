# 核心功能 API

| 功能 | API | 傳入 | 成功時回傳 |
|---|---|---|---|
| 1. 查看用電與裝置 | `GET /api/status` | 無 | 完整狀態 |
| 2. 開啟、關閉裝置 | `PUT /api/appliances/:id/power` | `{ "on": true }` | 完整狀態 |
| 3. 指定、取消優先 | `PUT /api/appliances/:id/priority` | `{ "enabled": true }` | 完整狀態 |
| 4. 管理裝置 | `GET /api/appliances` | 無 | 裝置清單 |
| | `POST /api/appliances` | 裝置設定 | 新裝置 |
| | `PATCH /api/appliances/:id` | 要修改的欄位 | 修改後的裝置 |
| | `DELETE /api/appliances/:id` | 無 | `204`，沒有內容 |
| 5. 管理房間 | `GET /api/rooms` | 無 | 房間清單 |
| | `POST /api/rooms` | `{ "name": "Study" }` | 新房間 |
| | `PATCH /api/rooms/:id` | `{ "name": "Office" }` | 修改後的房間 |
| | `DELETE /api/rooms/:id` | 無 | `204`，沒有內容 |
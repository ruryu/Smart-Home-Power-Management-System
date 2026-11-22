# API 規格

前後端共用的約定。改 API 前先改這份文件，再改程式碼。

## 0. 共通規則

- 所有 API 都以 `/api` 開頭，例如 `http://localhost:3000/api/status`。
- 傳入和回傳都是 JSON，有傳入資料時要帶 `Content-Type: application/json`。
- 所有用電計算都在後端，前端只負責顯示，不自己算總用電或判斷要不要延後。
- 前端每 1–2 秒呼叫一次 `GET /api/status` 更新畫面。
- 單位：用電一律是 **W（瓦）**，溫度一律是 **°C**，都是數字，不帶單位字串。
- `id` 由後端產生，前端新增資料時不要傳 `id`。
- 路徑中的 `:id` 必須是正整數，否則回傳 `400 VALIDATION_ERROR`。

## 1. 共用資料格式

### Appliance（裝置）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | number | 裝置編號 |
| `roomId` | number | 所在房間的 `id` |
| `name` | string | 名稱 |
| `ratedPower` | number | 額定用電，正常開啟時的用電 |
| `reducedPower` | number \| null | 降載後用電；只有 `adjustment` 是 `reduce` 才有值，其他是 `null` |
| `adjustment` | `"none"` \| `"delay"` \| `"reduce"` | 超標時的調整方式：不調整 / 延後 / 降載 |
| `adjustmentOrder` | number \| null | 超標時的調整順序，數字小的先調整；`adjustment` 是 `none` 時為 `null` |
| `requestedOn` | boolean | 使用者是否要求開啟 |
| `state` | 見下表 | 系統實際的狀態 |
| `priorityOrder` | number \| null | 使用者優先的順序，數字越大代表越晚指定；`null` 代表不是優先裝置 |
| `reason` | string \| null | 系統為什麼讓這台處於目前狀態，前端可以直接顯示在裝置旁邊；狀態是使用者自己操作的結果時為 `null` |

`state` 只會是下面五種：

| 值 | 意思 | 目前用電 |
|---|---|---|
| `off` | 關閉 | 0 |
| `on` | 正常開啟 | `ratedPower` |
| `delayed` | 使用者要求開啟，但因超標被系統延後 | 0 |
| `reduced` | 因超標被系統降載 | `reducedPower` |
| `faulted` | 故障，要修復後才能再使用 | 0 |

> `requestedOn` 是使用者的意圖，`state` 是系統實際的結果。
> 例如使用者開了烤箱，但超過上限被延後，就會是 `requestedOn: true`、`state: "delayed"`。
> 前端顯示開關時看 `requestedOn`，顯示實際狀態時看 `state`。

### Room（房間）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | number | 房間編號 |
| `name` | string | 名稱，不會跟其他房間重複 |

### Status（完整狀態）

`GET /api/status`、`PUT /api/appliances/:id/power`、`PUT /api/appliances/:id/priority` 和所有測試介面 API 都回傳這個格式。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `totalPower` | number | 全家目前總用電 |
| `powerLimit` | number | 用電上限 |
| `restoreThreshold` | number | 自動恢復時，總用電不能超過的值（上限 − 200） |
| `indoorTemperature` | number | 室溫 |
| `comfortThreshold` | number | 舒適門檻，室溫超過這個值就啟動舒適保護 |
| `comfortActive` | boolean | 舒適保護是否啟動中；啟動時冷氣不會被降載 |
| `unresolvedOverload` | number \| null | 調整完仍超過上限時，超出的瓦數；沒有超標是 `null` |
| `rooms` | Room[] | 所有房間，依 `id` 排序 |
| `appliances` | (Appliance & { `currentPower`: number })[] | 所有裝置，依 `id` 排序，每台多一個 `currentPower` 代表目前實際用電 |
| `warnings` | string[] | 要顯示給使用者看的警告文字，沒有就是空陣列 |

Appliance 的 `reason` 範例：

| 情況 | `state` | `reason` |
|---|---|---|
| 使用者自己開啟或關閉 | `on` / `off` | `null` |
| 開啟後超過上限，被延後 | `delayed` | `"總用電超過上限 5000W，已延後"` |
| 超過上限，冷氣被降載 | `reduced` | `"總用電超過上限 5000W，已降載至 800W"` |
| 室溫過高，冷氣恢復正常 | `on` | `"室溫 29°C 超過 28°C，Air Conditioner 維持正常運轉"` |
| 用電下降，自動恢復 | `on` | `"用電已下降，已自動恢復"` |
| 指定為優先後恢復 | `on` | `"已指定為優先，維持正常運轉"` |
| 用電異常 | `faulted` | `"用電異常，已停止運作，請至測試介面修復"` |

> 文字內容由後端決定，前端只負責顯示，不要用 `reason` 的文字判斷狀態，判斷狀態請看 `state`。

`warnings` 可能出現的內容：

| 情況 | 範例 |
|---|---|
| 無法解決的超標 | `"總用電超過上限 5000W 共 100W，已無法再調整，暫停接受增加用電的操作"` |
| 裝置故障 | `"Oven 用電異常，已停止運作，請至測試介面修復"` |
| 舒適保護啟動 | `"室溫 29°C 超過舒適門檻 28°C，冷氣不會被降載"` |
| 有裝置被調整 | `"為了不超過上限 5000W，系統已調整：Oven（延後）、Washing Machine（延後）"` |

### Error（錯誤）

所有錯誤都是這個格式：

```json
{
  "code": "ROOM_NOT_FOUND",
  "message": "找不到這個房間",
  "details": { "roomId": 99 }
}
```

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | string | 錯誤種類，前端用來判斷要怎麼處理 |
| `message` | string | 給使用者看的中文說明，前端可以直接顯示 |
| `details` | object \| string[] \| null | 補充資料；`VALIDATION_ERROR` 時是錯誤原因清單 |

| HTTP 狀態碼 | 意思 |
|---|---|
| `400` | 傳入的資料格式不對 |
| `404` | 找不到資源 |
| `409` | 資料格式正確，但目前的狀態不允許，例如會超過用電上限 |
| `500` | 伺服器發生錯誤 |

所有錯誤代碼：

| code | 狀態碼 | 意思 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 傳入資料或路徑的 `:id` 格式不對，包含壞掉的 JSON |
| `NOT_FOUND` | 404 | 找不到這個 API（路徑打錯） |
| `APPLIANCE_NOT_FOUND` | 404 | 找不到裝置 |
| `ROOM_NOT_FOUND` | 404 | 找不到房間 |
| `APPLIANCE_FAULTED` | 409 | 裝置故障中，要先修復 |
| `UNRESOLVED_OVERLOAD` | 409 | 目前已超標且無法解決，拒絕會增加用電的操作 |
| `INSUFFICIENT_POWER` | 409 | 指定優先後一定會超過上限 |
| `ROOM_NAME_TAKEN` | 409 | 房間名稱重複 |
| `ROOM_NOT_EMPTY` | 409 | 房間裡還有裝置，不能刪除 |
| `APPLIANCE_NOT_FAULTED` | 409 | 修復沒有故障的裝置 |
| `INTERNAL_ERROR` | 500 | 伺服器發生錯誤 |

## 2. 總覽

| 功能 | Method | 路徑 | 傳入 | 成功回傳 |
|---|---|---|---|---|
| 確認後端運作 | GET | `/api/health` | 無 | `200` `{ "status": "ok" }` |
| 查看完整狀態 | GET | `/api/status` | 無 | `200` Status |
| 開啟、關閉裝置 | PUT | `/api/appliances/:id/power` | `{ "on": boolean }` | `200` Status |
| 指定、取消優先 | PUT | `/api/appliances/:id/priority` | `{ "enabled": boolean }` | `200` Status |
| 裝置清單 | GET | `/api/appliances` | 無 | `200` Appliance[] |
| 新增裝置 | POST | `/api/appliances` | 裝置設定 | `201` Appliance |
| 修改裝置 | PATCH | `/api/appliances/:id` | 要修改的欄位 | `200` Appliance |
| 刪除裝置 | DELETE | `/api/appliances/:id` | 無 | `204` 沒有內容 |
| 房間清單 | GET | `/api/rooms` | 無 | `200` Room[] |
| 新增房間 | POST | `/api/rooms` | `{ "name": string }` | `201` Room |
| 修改房間 | PATCH | `/api/rooms/:id` | `{ "name": string }` | `200` Room |
| 刪除房間 | DELETE | `/api/rooms/:id` | 無 | `204` 沒有內容 |
| 決策紀錄 | GET | `/api/decisions` | 無（可加 `?limit=`） | `200` Decision[] |
| 重置 | POST | `/api/simulation/reset` | 無 | `200` Status |
| 修改室溫 | PUT | `/api/simulation/temperature` | `{ "indoorTemperature": number }` | `200` Status |
| 修改用電上限 | PUT | `/api/simulation/power-limit` | `{ "powerLimit": number }` | `200` Status |
| 模擬裝置用電 | POST | `/api/simulation/appliances/:id/usage` | `{ "power": number }` | `200` Status |
| 修復裝置 | POST | `/api/simulation/appliances/:id/repair` | 無 | `200` Status |

## 3. 系統

### `GET /api/health`

確認後端有沒有在運作，不代表資料庫或裝置狀態正常。

回傳 `200`：

```json
{ "status": "ok" }
```

### `GET /api/status`

回傳畫面需要的全部資料，格式見「Status（完整狀態）」。

回傳 `200`（初始狀態，`rooms` 和 `appliances` 只列一筆）：

```json
{
  "totalPower": 1600,
  "powerLimit": 5000,
  "restoreThreshold": 4800,
  "indoorTemperature": 26,
  "comfortThreshold": 28,
  "comfortActive": false,
  "unresolvedOverload": null,
  "rooms": [
    { "id": 1, "name": "Living Room A" }
  ],
  "appliances": [
    {
      "id": 3,
      "roomId": 1,
      "name": "Air Conditioner",
      "ratedPower": 1300,
      "reducedPower": 800,
      "adjustment": "reduce",
      "adjustmentOrder": 4,
      "requestedOn": true,
      "state": "on",
      "priorityOrder": null,
      "currentPower": 1300,
      "reason": null
    }
  ],
  "warnings": []
}
```

## 4. 控制裝置

這兩支 API 可能會讓系統連帶調整**其他裝置**，所以都回傳完整狀態（Status）。前端收到後直接用回傳結果重畫整個畫面，不要只更新被點的那一台。

### `PUT /api/appliances/:id/power`

開啟或關閉裝置。

傳入：

```json
{ "on": true }
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `on` | boolean | ✔ | `true` 開啟，`false` 關閉 |

系統的處理：

- **開啟：** 如果超過上限，系統會依調整順序延後或降載裝置，降到上限以內就停止；剛開啟的這台也可能被延後（`state: "delayed"`）。優先裝置、受舒適保護的冷氣不會被調整。
- **關閉：** 用電降下來後，系統會依調整的相反順序自動恢復之前被調整過的裝置；恢復後總用電會超過 `restoreThreshold` 的就跳過，試下一台。
- 被系統調整的裝置，`reason` 會說明原因。
- 重複傳相同的值（例如已經開啟又傳 `on: true`）不算錯誤，直接回傳目前狀態。

回傳 `200` Status。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `on` 不是 boolean |
| 404 | `APPLIANCE_NOT_FOUND` | 找不到裝置 |
| 409 | `APPLIANCE_FAULTED` | 裝置故障中，要先修復；關閉故障裝置不會出錯 |
| 409 | `UNRESOLVED_OVERLOAD` | 目前已超標且無法解決（`unresolvedOverload` 不是 `null`），拒絕開啟；`details.overload` 是超出的瓦數 |

### `PUT /api/appliances/:id/priority`

指定或取消使用者優先。優先的裝置在超標時不會被延後或降載。

傳入：

```json
{ "enabled": true }
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `enabled` | boolean | ✔ | `true` 指定優先，`false` 取消優先 |

系統的處理：

- 接受條件：「不能調整的裝置 + 所有優先裝置 + 這台 + 可降載裝置的降載後用電」不超過上限。被延後的裝置不算；舒適保護啟動時，冷氣用額定用電計算。
- 接受後如果這台正被延後或降載，會立刻恢復，改調整其他裝置。
- 之後室溫或用電上限改變，造成優先裝置之間衝突時，系統會從最近指定的優先開始撤銷，`priorityOrder` 變回 `null`。
- 重複傳相同的值不算錯誤，直接回傳目前狀態。

回傳 `200` Status。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `enabled` 不是 boolean |
| 404 | `APPLIANCE_NOT_FOUND` | 找不到裝置 |
| 409 | `APPLIANCE_FAULTED` | 裝置故障中 |
| 409 | `INSUFFICIENT_POWER` | 指定之後一定會超過上限；`details.shortfall` 是不足的瓦數 |

錯誤範例（熱水器已是優先，再指定烤箱）：

```json
{
  "code": "INSUFFICIENT_POWER",
  "message": "指定為優先後一定會超過上限，不足 1100W",
  "details": { "shortfall": 1100 }
}
```

## 5. 管理裝置

### `GET /api/appliances`

回傳 `200`，所有裝置 `Appliance[]`，依 `id` 排序。不含 `currentPower`，要顯示用電請用 `GET /api/status`。

```json
[
  {
    "id": 1,
    "roomId": 5,
    "name": "Refrigerator",
    "ratedPower": 200,
    "reducedPower": null,
    "adjustment": "none",
    "adjustmentOrder": null,
    "requestedOn": true,
    "state": "on",
    "priorityOrder": null,
    "reason": null
  }
]
```

### `POST /api/appliances`

新增裝置。

傳入：

```json
{ "roomId": 3, "name": "Fan", "ratedPower": 60, "adjustment": "delay" }
```

| 欄位 | 型別 | 必填 | 規則 |
|---|---|---|---|
| `roomId` | number | ✔ | 存在的房間 `id` |
| `name` | string | ✔ | 不能是空字串，前後空白會被去掉 |
| `ratedPower` | number | ✔ | 正整數 |
| `adjustment` | string | ✔ | `none`、`delay` 或 `reduce` |
| `reducedPower` | number | 只有 `reduce` 要填 | 正整數，而且小於 `ratedPower`；其他調整方式不能填 |

系統自動設定：

- 新裝置一律是 `state: "off"`、`requestedOn: false`、`priorityOrder: null`。
- `adjustmentOrder` 自動排在最後一個；`adjustment` 是 `none` 時為 `null`。

回傳 `201`：

```json
{
  "id": 7,
  "roomId": 3,
  "name": "Fan",
  "ratedPower": 60,
  "reducedPower": null,
  "adjustment": "delay",
  "adjustmentOrder": 5,
  "requestedOn": false,
  "state": "off",
  "priorityOrder": null,
  "reason": null
}
```

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 欄位不符合規則，`details` 是錯誤原因清單 |
| 404 | `ROOM_NOT_FOUND` | `roomId` 不存在 |

錯誤範例：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "裝置設定不正確",
  "details": ["name 不可為空", "ratedPower 須為正整數"]
}
```

### `PATCH /api/appliances/:id`

修改裝置。只傳要改的欄位。

傳入：

```json
{ "name": "Big Fan", "roomId": 4 }
```

| 欄位 | 型別 | 必填 | 規則 |
|---|---|---|---|
| `name` | string | | 不能是空字串 |
| `roomId` | number | | 存在的房間 `id` |

- 至少要傳一個欄位。
- 只能修改 `name` 和 `roomId`。用電相關的欄位會影響目前的用電計算，不開放修改；要改請刪除後重新新增。

回傳 `200`，修改後的 Appliance。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 欄位不符合規則、沒有傳任何欄位，或傳了不能修改的欄位 |
| 404 | `APPLIANCE_NOT_FOUND` | 找不到裝置 |
| 404 | `ROOM_NOT_FOUND` | `roomId` 不存在 |

### `DELETE /api/appliances/:id`

刪除裝置。開啟中的裝置也可以刪除。

系統的處理：

- 刪除後總用電會跟著下降，系統會跟關閉裝置時一樣，自動恢復之前被調整過的裝置。
- 優先裝置被刪除後，其他優先裝置的 `priorityOrder` 不會改變。

回傳 `204`，沒有內容。其他裝置的狀態可能已經改變，前端刪除成功後要重新呼叫 `GET /api/status`。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 404 | `APPLIANCE_NOT_FOUND` | 找不到裝置 |

## 6. 管理房間

### `GET /api/rooms`

回傳 `200`，所有房間 `Room[]`，依 `id` 排序。

```json
[
  { "id": 1, "name": "Living Room A" },
  { "id": 2, "name": "Living Room B" }
]
```

### `POST /api/rooms`

新增房間。

傳入：

```json
{ "name": "Study" }
```

| 欄位 | 型別 | 必填 | 規則 |
|---|---|---|---|
| `name` | string | ✔ | 不能是空字串，不能跟其他房間重複 |

回傳 `201`：

```json
{ "id": 7, "name": "Study" }
```

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `name` 是空的 |
| 409 | `ROOM_NAME_TAKEN` | 名稱跟其他房間重複 |

### `PATCH /api/rooms/:id`

修改房間名稱。

傳入：

```json
{ "name": "Office" }
```

回傳 `200`，修改後的 Room。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `name` 是空的 |
| 404 | `ROOM_NOT_FOUND` | 找不到房間 |
| 409 | `ROOM_NAME_TAKEN` | 名稱跟其他房間重複 |

### `DELETE /api/rooms/:id`

刪除房間。

回傳 `204`，沒有內容。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 404 | `ROOM_NOT_FOUND` | 找不到房間 |
| 409 | `ROOM_NOT_EMPTY` | 房間裡還有裝置，要先移走或刪除裝置 |

## 7. 決策紀錄

### `GET /api/decisions`

系統做過的決定，最新的在前面。被拒絕的要求也會記錄。

| Query | 型別 | 預設 | 規則 |
|---|---|---|---|
| `limit` | number | 50 | 1 到 200 的整數 |

回傳 `200` Decision[]：

```json
[
  {
    "id": 2,
    "createdAt": "2026-11-22T08:00:05.000Z",
    "rule": "B2",
    "ruleName": "自動恢復",
    "applianceId": 5,
    "applianceName": "Oven",
    "action": "restore",
    "reason": "恢復後總用電 3600W 未超過 4800W，恢復 Oven"
  },
  {
    "id": 1,
    "createdAt": "2026-11-22T08:00:00.000Z",
    "rule": "B1",
    "ruleName": "超標調整",
    "applianceId": 5,
    "applianceName": "Oven",
    "action": "delay",
    "reason": "總用電 6600W 超過上限 5000W，延後 Oven"
  }
]
```

| 欄位 | 型別 | 說明 |
|---|---|---|
| `createdAt` | string | ISO 8601 時間（UTC） |
| `rule` | string | 規則代號，對應 Proposal：`B1` 超標調整、`B2` 自動恢復、`B3` 舒適保護、`B4` 使用者優先、`B5` 故障處理 |
| `ruleName` | string | 規則名稱，前端顯示用 |
| `applianceId` / `applianceName` | number / string \| null | 相關裝置；跟整個家有關、或裝置已被刪除時為 `null` |
| `action` | string | 系統做了什麼，見下表 |
| `reason` | string | 給使用者看的說明 |

| `action` | 規則 | 意思 |
|---|---|---|
| `delay` / `reduce` | B1 | 延後 / 降載裝置 |
| `overload-unresolved` | B1 | 全部調整完仍超標 |
| `reject` | B1 | 無法解決的超標時，拒絕開啟裝置 |
| `restore` | B2 | 自動恢復裝置 |
| `comfort-restore` | B3 | 室溫過高，冷氣恢復正常 |
| `priority-accept` / `priority-reject` / `priority-cancel` | B4 | 接受 / 拒絕 / 取消優先 |
| `priority-restore` | B4 | 被調整的裝置指定為優先後恢復 |
| `priority-revoke` | B4 | 衝突時撤銷最近指定的優先 |
| `fault` / `repair` | B5 | 判定故障 / 修復 |

## 8. 測試介面

給助教重現每條規則用。這些 API 都回傳完整狀態（Status）。

### `POST /api/simulation/reset`

清空所有資料和決策紀錄，回到初始狀態：上限 5000W、室溫 26°C、6 個房間、6 台裝置。

### `PUT /api/simulation/temperature`

修改室溫，用來測試舒適保護。

```json
{ "indoorTemperature": 29 }
```

- 室溫**超過**舒適門檻（28°C，剛好 28°C 不算）時，可降載的裝置（冷氣）不能降載；已降載的會恢復正常，超標的話改延後其他裝置，這時用上限判斷，不是 `restoreThreshold`。
- 恢復冷氣後如果優先裝置之間衝突，會撤銷最近指定的優先。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `indoorTemperature` 不是數字 |

### `PUT /api/simulation/power-limit`

修改用電上限，用來重現無法解決的超標。`restoreThreshold` 會跟著變成上限 − 200。

```json
{ "powerLimit": 1000 }
```

- 例如上限改成 1000W：冷氣降載後還有 1100W，`unresolvedOverload` 變成 100。
- 上限降低造成優先裝置衝突時，會撤銷最近指定的優先。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `powerLimit` 不是正整數 |

### `POST /api/simulation/appliances/:id/usage`

模擬讀到某台裝置的實際用電，用來測試故障處理。

```json
{ "power": 3001 }
```

- `power` **超過**額定用電的 150%（剛好 150% 不算）時，裝置變成 `faulted`、用電 0W、`requestedOn` 變成 `false`，並自動恢復因此有空間的其他裝置。
- 沒超過就什麼都不改；已經故障的裝置也不會再改變。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `power` 不是 0 以上的數字 |
| 404 | `APPLIANCE_NOT_FOUND` | 找不到裝置 |

### `POST /api/simulation/appliances/:id/repair`

修復故障的裝置。修復後是 `off`，要由使用者重新開啟。

| 狀態碼 | code | 什麼時候 |
|---|---|---|
| 404 | `APPLIANCE_NOT_FOUND` | 找不到裝置 |
| 409 | `APPLIANCE_NOT_FAULTED` | 裝置沒有故障 |

# 字音字形練習遊戲

國中二年級字音字形手寫練習，共 5 個單元、每單元 10 題。
學生根據注音手寫對應漢字，完成後可傳送至老師的 Google Classroom。

---

## 環境需求

- Node.js 18+
- （辨識功能已改為純前端 HanziLookupJS，不再需要 Python 後端）

---

## 首次設定

```bash
# 複製環境變數範本
cp .env.example .env
```

`.env` 預設值已可直接使用（後端跑在 localhost:8000）。
若要啟用 Google Classroom 傳送功能，請在 `.env` 中填入對應的憑證。

---

## 啟動方式

> 辨識功能已改為純前端 HanziLookupJS（筆劃比對），**不再需要啟動 Python 後端**。

### 啟動前端

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173` 即可開始使用。

---

## 專案結構

```
mom_word_correct_game/
├── public/
│   ├── hanzilookup.min.js # HanziLookupJS 函式庫
│   └── mmah.json          # 字元資料庫（10,657 字）
├── src/
│   ├── data/
│   │   └── wordBank.js    # 5 單元 × 10 詞題庫（可自行修改）
│   ├── services/
│   │   ├── visionApi.js   # 呼叫本地辨識後端
│   │   └── classroomApi.js# Google Classroom 提交
│   └── components/        # React 元件
├── .env.example           # 環境變數範本
├── package.json
└── vite.config.js
```

---

## 修改題庫

編輯 `src/data/wordBank.js`，每個單元格式如下：

```js
{
  id: 1,
  name: "單元名稱",
  theme: "主題說明",
  words: [
    { id: 1, characters: "雄偉", zhuyin: ["ㄒㄩㄥˊ", "ㄨㄟˇ"] },
    // ...共 10 筆
  ]
}
```

# 國中字音字形手寫練習

我為國中字音字形練習製作這個瀏覽器應用。內容包含五個單元、每單元十題；學生根據注音手寫對應漢字，完成後可選擇將結果提交至 Google Classroom。

## 主要功能

- 五個可編輯單元，共五十題。
- 使用 Canvas 接收手寫輸入。
- 透過 HanziLookupJS 在瀏覽器端比對筆畫。
- 即時檢查是否符合指定漢字。
- 可選擇串接 Google Classroom。
- 題庫、React components 與服務整合分開管理。

## 使用技術

- React、Vite
- JavaScript
- HanziLookupJS
- Google Classroom integration

手寫辨識直接在瀏覽器中執行，核心練習功能不需要 Python backend。

## 本機執行

```bash
cp .env.example .env
npm install
npm run dev
```

預設開發網址為 `http://localhost:5173`。只有啟用 Google Classroom 提交功能時才需要設定相關 credentials。

## 題庫設計

所有單元定義在 `src/data/wordBank.js`，與介面程式分離，因此可以替換詞彙或新增單元，不需要修改手寫與計分邏輯。

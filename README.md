# 오늘 한마디｜日常韓文練習

給繁體中文使用者的生活韓文練習網站，包含情境選擇、日常對話、韓文發音播放、慢速跟讀、麥克風錄音回放、收藏句子與本機學習進度。內容以實際生活使用為主，不含考試或應試功能。

## 開發

需要 Node.js 與 npm。

```bash
npm install
npm run dev
```

## 檢查

```bash
npm run build
npm run lint
```

`npm run build` 會在 `dist/index.html` 產生自包含的單一 HTML，可直接分享；GitHub Pages 也會使用同一份建置結果。

韓文語音由瀏覽器提供的 `speechSynthesis` 語音合成。可用語音依作業系統與瀏覽器而異；若沒有韓文語音，網站會顯示提示。跟讀錄音使用瀏覽器麥克風權限，僅在頁面中回放，不會上傳。

## GitHub Pages 部署

推送到 `main` 分支時，GitHub Actions 會自動建置並發布網站：

https://galeunglin.github.io/korean-pro/

第一次部署前，請到 repository 的 **Settings → Pages**，將 **Build and deployment → Source** 設為 **GitHub Actions**。部署進度可在 **Actions** 頁面查看。

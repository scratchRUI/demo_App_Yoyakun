# Step 4: Next.js (フロントエンド) の連携とUI更新

このステップでは、Next.js 側のコードを変更します。
これまでフロントエンド（ブラウザ）から受け取った音声を直接 Gemini API に投げていたところを、**「FastAPI サーバー (http://localhost:8000) に転送（プロキシ）」** する仕組みに変えます。それに伴い、ページ画面 (`page.tsx`) も結果の S, O, A, P を分けて表示できるように変更します。

---

## 1. `src/app/api/summarize/route.ts` の変更点

Next.js には `API Routes (App Router)` というサーバーサイドの機能があります。ここで FastAPI にリクエストを肩代わりして投げてもらうことで、CORS（Cross-Origin Resource Sharing）エラーというセキュリティ制限に引っかかるのを防ぎます。

### 変更のポイント

1. **Gemini SDKを削除する**
   これまでここで読み込んでいた `GoogleGenerativeAI` 関連のコードはもうバックエンド（FastAPI）に引っ越したので削除します。

2. **FastAPI (`http://localhost:8000/api/records`) へ送信する**
   受け取った `FormData`（音声ファイルが入っているカプセルのようなもの）に、必要な `patient_id` を追加して、そのまま `fetch` 関数でバックエンドに送ります。

   ```typescript
   // デモ用として仮の患者IDをセットする
   formData.append("patient_id", "1");

   // FastAPIへ送信
   const response = await fetch("http://localhost:8000/api/records", {
     method: "POST",
     body: formData,
   });
   ```

3. **FastAPIからの結果をフロントへ返す**
   FastAPIは `RecordResponse` 型のJSONを返してくるので、それをそのままフロントエンドの画面側に `NextResponse.json(data)` としてリレーで渡します。

---

## 2. `src/app/page.tsx` の変更点

画面を描画するメインコンポーネントです。これまでは「単なるテキスト1つ `summary`」を表示していましたが、これからは「構造化されたオブジェクト（S, O, A, P）」を受け取って表示します。

### 変更のポイント

1. **受け取る状態（State）の変更**
   これまでの `const [summary, setSummary] = useState("");` を、以下の2つの状態に変更します。

   ```typescript
   // GeminiからのSOAPオブジェクトを受け取る
   const [soapSummary, setSoapSummary] = useState<any>(null);
   // 全文文字起こしを受け取る
   const [rawText, setRawText] = useState("");
   ```

2. **API呼び出し結果のセット**
   バックエンドからは `{ soap_summary: {s_text, o_text...}, original_text: "..." }` という形で返ってくるので、それをStateにセットします。

   ```typescript
   const data = await res.json();
   if (res.ok) {
     setSoapSummary(data.soap_summary);
     setRawText(data.original_text);
   } else {
     // エラーハンドリング...
   }
   ```

3. **画面(JSX)の描画変更**
   State に `soapSummary` が入っていたら、それぞれの項目（患者の訴え、客観的所見、など）に分けて見出し付きで綺麗に表示されるようにHTML構造と Tailwind CSS クラスを修正します。

これで、ブラウザ ⇔ Next.js ⇔ FastAPI ⇔ PostgreSQL (およびGemini) という綺麗な一方通行の流れが完成します！

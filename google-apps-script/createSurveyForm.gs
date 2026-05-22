/**
 * 第2回 海外スタッフ研修 アンケートフォーム生成スクリプト
 *
 * 使い方:
 *   1. https://script.google.com を開き、新規プロジェクトを作成
 *   2. このファイルの中身を貼り付け
 *   3. createSurveyForm() を選択して「実行」をクリック
 *   4. 初回は権限の承認が必要
 *   5. 実行ログ（Ctrl+Enter）に編集用URLと公開URLが表示されます
 */
function createSurveyForm() {
  var form = FormApp.create('第2回 海外スタッフ研修 アンケート');

  form.setTitle('第2回 海外スタッフ研修 アンケート')
      .setDescription(
        '本日はお疲れさまでした！\n' +
        '研修内容をより良くするため、ぜひご協力ください。\n' +
        '所要時間: 約5〜7分\n' +
        '母国語での回答もOKです。'
      )
      .setCollectEmail(false)
      .setRequireLogin(false)
      .setLimitOneResponsePerUser(true)
      .setProgressBar(true)
      .setShuffleQuestions(false)
      .setAllowResponseEdits(false)
      .setConfirmationMessage(
        'ご回答ありがとうございました。\n' +
        '皆さんのフィードバックを、第3回研修と日々の店舗運営に活かします。\n' +
        'お疲れさまでした！— Sunrise Co., Ltd.'
      );

  // ── 任意フィールド（フォーム冒頭） ─────────────────
  form.addTextItem()
      .setTitle('名前')
      .setHelpText('名前を書いてもOK、空欄でもOK')
      .setRequired(false);

  form.addTextItem()
      .setTitle('店舗')
      .setRequired(false);

  // ── 設問1 ──────────────────────────────
  form.addTextItem()
      .setTitle(
        '接客とは、『目の前の人を　〇〇　すること』である。\n' +
        '〇〇に入る言葉を書いてください。'
      )
      .setRequired(true);

  // ── 設問2 ──────────────────────────────
  form.addParagraphTextItem()
      .setTitle(
        '今日の研修で、一番心に残ったことは何ですか？\n' +
        '一言・一場面でOKです。母国語でも構いません。'
      )
      .setRequired(true);

  // ── 設問3 ──────────────────────────────
  form.addParagraphTextItem()
      .setTitle('明日から自分のお店で『一つだけ』変えるとしたら、何を変えますか？')
      .setHelpText('「5つやる」ではなく、必ず一つだけ書いてください。')
      .setRequired(true);

  // ── 設問4 ──────────────────────────────
  form.addParagraphTextItem()
      .setTitle('実践するときに、『難しそう』『不安だな』と感じることはありますか？')
      .setHelpText('どんな小さなことでも教えてください。匿名で大丈夫です。')
      .setRequired(false);

  // ── 設問5-A ────────────────────────────
  form.addScaleItem()
      .setTitle('今日の研修、10点満点で何点ですか？')
      .setBounds(1, 10)
      .setLabels('1 = 不満', '10 = 最高')
      .setRequired(true);

  // ── 設問5-B ────────────────────────────
  form.addParagraphTextItem()
      .setTitle('次回もっと聞きたいテーマがあれば教えてください。')
      .setRequired(false);

  // 実行ログにURLを出力
  Logger.log('編集用URL: ' + form.getEditUrl());
  Logger.log('回答用URL: ' + form.getPublishedUrl());
  Logger.log('短縮URL  : ' + form.shortenFormUrl(form.getPublishedUrl()));
}

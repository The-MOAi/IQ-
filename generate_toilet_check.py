#!/usr/bin/env python3
"""
高密度トイレチェック表 生成スクリプト
A4用紙1枚を4分割（2×2）し、各A6片に10日分×7時間のチェック表を配置
"""
import xlsxwriter

OUTPUT = "/home/user/IQ-/toilet_check_10days_hourly_4up.xlsx"

wb = xlsxwriter.Workbook(OUTPUT)
ws = wb.add_worksheet("チェック表")

# ---- 印刷設定 ----
ws.set_paper(9)           # A4
ws.set_landscape()        # 横向き
ws.fit_to_pages(1, 1)     # 1ページに収める
ws.set_margins(left=0.2, right=0.2, top=0.2, bottom=0.2)  # cm -> inch
ws.center_horizontally()
ws.center_vertically()
ws.set_print_scale(100)
ws.hide_gridlines(1)      # 印刷時グリッド非表示

# ---- 定数 ----
HOURS = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"]
DAYS = 10
# 各A6ブロックの列数: 日付(1) + 時間(7) + 担当(1) = 9列
BLOCK_COLS = 9
# 各A6ブロックの行数: タイトル(1) + ヘッダ(1) + チェック項目行(1) + データ(10) + 凡例(1) + 余白(1) = 15
BLOCK_ROWS = 16
# ブロック間のガイド線用スペース
GAP_COL = 1
GAP_ROW = 1

# ---- 列幅設定 ----
# 2ブロック横並び: [日付, h1-h7, 担当, gap, 日付, h1-h7, 担当]
for block_x in range(2):
    base_col = block_x * (BLOCK_COLS + GAP_COL)
    ws.set_column(base_col, base_col, 8.5)          # 日付列
    for c in range(1, 8):
        ws.set_column(base_col + c, base_col + c, 9.8)  # 時間列
    ws.set_column(base_col + 8, base_col + 8, 5.0)  # 担当列
    if block_x == 0:
        ws.set_column(base_col + BLOCK_COLS, base_col + BLOCK_COLS, 1.5)  # gap

# ---- 行高設定 ----
for block_y in range(2):
    base_row = block_y * (BLOCK_ROWS + GAP_ROW)
    ws.set_row(base_row, 16)       # タイトル行
    ws.set_row(base_row + 1, 15)   # ヘッダ行
    ws.set_row(base_row + 2, 11)   # チェック項目略号行
    for r in range(DAYS):
        ws.set_row(base_row + 3 + r, 18)  # データ行
    ws.set_row(base_row + 3 + DAYS, 11)    # 凡例行
    ws.set_row(base_row + 3 + DAYS + 1, 6) # 余白
    if block_y == 0:
        ws.set_row(base_row + BLOCK_ROWS, 4)  # gap行

# ---- スタイル定義 ----
FMT = {}

# タイトル
FMT["title"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 10, "bold": True,
    "align": "center", "valign": "vcenter",
    "bottom": 2, "top": 2, "left": 2, "right": 2,
    "bg_color": "#2B2B2B", "font_color": "#FFFFFF",
})

# ヘッダ（時間）
FMT["header"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 8, "bold": True,
    "align": "center", "valign": "vcenter",
    "bottom": 1, "top": 2, "left": 1, "right": 1,
    "bg_color": "#404040", "font_color": "#FFFFFF",
    "text_wrap": False,
})
FMT["header_left"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 8, "bold": True,
    "align": "center", "valign": "vcenter",
    "bottom": 1, "top": 2, "left": 2, "right": 1,
    "bg_color": "#404040", "font_color": "#FFFFFF",
})
FMT["header_right"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 8, "bold": True,
    "align": "center", "valign": "vcenter",
    "bottom": 1, "top": 2, "left": 1, "right": 2,
    "bg_color": "#404040", "font_color": "#FFFFFF",
})

# チェック項目略号ヘッダ行
FMT["sub_header"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 6,
    "align": "center", "valign": "vcenter",
    "bottom": 2, "top": 1, "left": 1, "right": 1,
    "bg_color": "#E0E0E0", "font_color": "#555555",
})
FMT["sub_header_left"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 6,
    "align": "center", "valign": "vcenter",
    "bottom": 2, "top": 1, "left": 2, "right": 1,
    "bg_color": "#E0E0E0", "font_color": "#555555",
})
FMT["sub_header_right"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 6,
    "align": "center", "valign": "vcenter",
    "bottom": 2, "top": 1, "left": 1, "right": 2,
    "bg_color": "#E0E0E0", "font_color": "#555555",
})

# データセル（偶数行・奇数行）
def make_data_fmt(bg, left_border=1, right_border=1, bottom_border=1):
    return wb.add_format({
        "font_name": "MS UI Gothic", "font_size": 7,
        "align": "center", "valign": "vcenter",
        "bottom": bottom_border, "top": 1, "left": left_border, "right": right_border,
        "bg_color": bg,
        "font_color": "#999999",
    })

# 日付セル
def make_date_fmt(bg, bottom_border=1):
    return wb.add_format({
        "font_name": "MS UI Gothic", "font_size": 8,
        "align": "center", "valign": "vcenter",
        "bottom": bottom_border, "top": 1, "left": 2, "right": 1,
        "bg_color": bg, "font_color": "#333333",
    })

# 担当セル
def make_sign_fmt(bg, bottom_border=1):
    return wb.add_format({
        "font_name": "MS UI Gothic", "font_size": 7,
        "align": "center", "valign": "vcenter",
        "bottom": bottom_border, "top": 1, "left": 1, "right": 2,
        "bg_color": bg,
    })

BG_EVEN = "#FFFFFF"
BG_ODD = "#F2F2F2"

FMT["date_even"] = make_date_fmt(BG_EVEN)
FMT["date_odd"] = make_date_fmt(BG_ODD)
FMT["date_even_last"] = make_date_fmt(BG_EVEN, 2)
FMT["date_odd_last"] = make_date_fmt(BG_ODD, 2)

FMT["data_even"] = make_data_fmt(BG_EVEN)
FMT["data_odd"] = make_data_fmt(BG_ODD)
FMT["data_even_last"] = make_data_fmt(BG_EVEN, bottom_border=2)
FMT["data_odd_last"] = make_data_fmt(BG_ODD, bottom_border=2)

FMT["sign_even"] = make_sign_fmt(BG_EVEN)
FMT["sign_odd"] = make_sign_fmt(BG_ODD)
FMT["sign_even_last"] = make_sign_fmt(BG_EVEN, 2)
FMT["sign_odd_last"] = make_sign_fmt(BG_ODD, 2)

# 凡例
FMT["legend"] = wb.add_format({
    "font_name": "MS UI Gothic", "font_size": 6,
    "align": "left", "valign": "vcenter",
    "font_color": "#666666",
})

# ガイド線（カット線）
FMT["guide_h"] = wb.add_format({"top": 4, "top_color": "#CCCCCC"})
FMT["guide_v"] = wb.add_format({"left": 4, "left_color": "#CCCCCC"})
FMT["guide_cross"] = wb.add_format({
    "top": 4, "top_color": "#CCCCCC",
    "left": 4, "left_color": "#CCCCCC",
})

CHECK_LABELS = "ﾍﾟ 手 座 備 ｿ 床"

# ---- ブロック描画関数 ----
def draw_block(start_row, start_col):
    r = start_row
    c = start_col

    # タイトル行
    ws.merge_range(r, c, r, c + BLOCK_COLS - 1,
                   "トイレ清掃 10日間記録（17:00-23:00）", FMT["title"])
    r += 1

    # ヘッダ行
    ws.write(r, c, "日付", FMT["header_left"])
    for i, h in enumerate(HOURS):
        ws.write(r, c + 1 + i, h, FMT["header"])
    ws.write(r, c + 8, "担当", FMT["header_right"])
    r += 1

    # チェック項目略号行
    ws.write(r, c, "", FMT["sub_header_left"])
    for i in range(7):
        ws.write(r, c + 1 + i, CHECK_LABELS, FMT["sub_header"])
    ws.write(r, c + 8, "", FMT["sub_header_right"])
    r += 1

    # データ行（10日分）
    for day in range(DAYS):
        is_odd = day % 2 == 1
        is_last = day == DAYS - 1
        if is_last:
            d_fmt = FMT["date_odd_last"] if is_odd else FMT["date_even_last"]
            c_fmt = FMT["data_odd_last"] if is_odd else FMT["data_even_last"]
            s_fmt = FMT["sign_odd_last"] if is_odd else FMT["sign_even_last"]
        else:
            d_fmt = FMT["date_odd"] if is_odd else FMT["date_even"]
            c_fmt = FMT["data_odd"] if is_odd else FMT["data_even"]
            s_fmt = FMT["sign_odd"] if is_odd else FMT["sign_even"]

        ws.write(r + day, c, f"  /  ", d_fmt)      # 日付欄（手書き想定）
        for i in range(7):
            ws.write(r + day, c + 1 + i, "", c_fmt) # チェック欄（空白）
        ws.write(r + day, c + 8, "", s_fmt)          # 担当欄

    r += DAYS

    # 凡例行
    ws.merge_range(r, c, r, c + BLOCK_COLS - 1,
                   " ﾍﾟ:ﾍﾟｰﾊﾟｰ  手:手洗い  座:便座  備:備品  ｿ:ｿｰﾌﾟ  床:床清掃",
                   FMT["legend"])


# ---- 4ブロック配置（2x2） ----
positions = [
    (0, 0),                                     # 左上
    (0, BLOCK_COLS + GAP_COL),                  # 右上
    (BLOCK_ROWS + GAP_ROW, 0),                  # 左下
    (BLOCK_ROWS + GAP_ROW, BLOCK_COLS + GAP_COL),  # 右下
]

for (sr, sc) in positions:
    draw_block(sr, sc)

# ---- カット用ガイド線 ----
gap_row = BLOCK_ROWS       # 横方向のガイド線の行
gap_col = BLOCK_COLS        # 縦方向のガイド線の列

# 横ガイド線
for c in range(BLOCK_COLS * 2 + GAP_COL):
    if c == gap_col:
        ws.write(gap_row, c, "", FMT["guide_cross"])
    else:
        ws.write(gap_row, c, "", FMT["guide_h"])

# 縦ガイド線
for r in range(BLOCK_ROWS * 2 + GAP_ROW):
    if r == gap_row:
        continue  # すでに書いた
    ws.write(r, gap_col, "", FMT["guide_v"])


wb.close()
print(f"生成完了: {OUTPUT}")

# 《见好就收：大内第一贪》(Royal Heist: Cash Out) 全链路冷启动与自动收款 SOP

> 更新日期：2026-11-27
> 公网免费秒玩总入口：**https://a3152557994-ship-it.github.io/royal-heist/**
> GitHub 仓库：https://github.com/a3152557994-ship-it/royal-heist

---

## 一、已就绪交付物总览（全部位于 `release/` 目录，单文件均 `<3MB` 适配手机远控）

1. **防破解终身金手指激活码库存（200 枚，`chmod 600` 本地保密勿外传）**：
   - 路径：`release/PRO_200_KEYS_DO_NOT_COMMIT.txt`（一行一码，采用 Ed25519 私钥签名 `OPC1.`，前端内置公钥真实验签，改代码或瞎编字符均无法绕过；用完随时一行命令无限续签：`node /Users/wang/OPC/projects/ai-20-matrix/bin/issue-license.mjs --product royal-heist --email buyer@vip.com`）
2. **3 支快手 / 抖音 / 视频号 / 小红书 `9:16` 有声悬念引流短视频（1080×1920，H.264+AAC）**：
   - `release/01_今天体验和大人八亿两搜打撤_9x16.mp4`（配自家非独家《第七秒反转》悬疑卡点曲）
   - `release/02_今天体验混世小爵爷抄家哄红颜_9x16.mp4`（配自家非独家《长安雪夜》国风燃曲，发抖音可直接挂载「浮光音社 - 长安雪夜」汽水音乐圆盘吃双份分成！）
   - `release/03_今天体验煤山绝境掀桌抄勋贵_9x16.mp4`（主打 4.6% 通关率激将法，专吸懂哥评论吵架）
3. **4 张全平台零切字高清封面与图标**：
   - `release/xianyu-cover-1x1.png`（1080×1080 闲鱼自动发货主图）
   - `release/xiaohongshu-cover-3x4.png`（1080×1440 小红书种草封面）
   - `release/poster-4x3.jpg`（1200×900 B站 Toy & 233工坊 4:3 标准横图）
   - `release/icon-512.png`（512×512 游戏方形图标）
4. **3 个免版号平台纯净分发包（已剥离全部站外商业链接，通过 `toy_doctor.py` 0 错误 0 警告预检）**：
   - B站 Toy 互动游戏包：`release/royal-heist-toy.zip`
   - 233工坊 / 口袋方舟包：`release/royal-heist-233.zip`
   - 海外 itch.io H5 包：`release/royal-heist-itch.zip`

---

## 二、快手 / 抖音 / 小红书手发引流文案（复制即发，红灯平台人工点发布防封）

### 爆款文案 1（配 `01_今天体验和大人八亿两搜打撤_9x16.mp4`）
- **标题**：今天要体验的人生是：太上皇断气前夜的大内第一贪！再摸一把冲八亿两，还是连夜装船跑路？
- **正文 / 置顶评论**：
  把「和珅贪八亿两跑路」做成了全网第一款【朝堂账房搜打撤】！
  桌角那根寿元龙涎香随时会断，后门乌篷船已经在等——现在撤离 100% 落袋回江南买园子；再贪一更算盘倍率暴涨，但晚撤一秒九门封锁全部清零！目前全网只有 7.4% 的人活着把银子运出去，嘴硬的来试试你能带走多少两！
  话题：`#今天体验的人生是 #搜打撤 #独立游戏 #历史推演 #摸金撤离`

### 爆款文案 2（配 `02_今天体验混世小爵爷抄家哄红颜_9x16.mp4`，抖音可挂《长安雪夜》圆盘）
- **标题**：奉旨抄家分七成金砖，东厂半夜踹门拍下三封死罪密折——换你敢翻哪一封？
- **话题**：`#单机游戏推荐 #小丑牌 #恶魔轮盘 #自制游戏 #爽文男主`

---

## 三、闲鱼 / 小红书店铺 24h 自动发货上架模板（标价 ¥12.9 一口价买断）

- **商品标题（覆盖高搜索词）**：
  `见好就收大内第一贪 官方金手指终身激活码 朝堂摸金搜打撤网页游戏 手机电脑免下载秒玩 自动发货`
- **定价**：**¥12.9**（划线原价 ¥29.9）
- **自动发货库存设置**：将 `PRO_200_KEYS_DO_NOT_COMMIT.txt` 中的 `OPC1.` 激活码按「一行一个」粘贴进闲鱼自动发货后台，附自动回复话术：
  ```text
  感谢支持！【见好就收：大内第一贪】官方秒玩网址：
  https://a3152557994-ship-it.github.io/royal-heist/
  打开右上角【金手指】按钮，粘贴上方发给您的 OPC1. 开头激活码即可永久解锁：无限时光悔棋丸 + 开局300万两/耐烧香火金手指开关 + 无限御前忽悠 + 传国玉玺战报印！记得在同页面点「一键复制存档码」保存备份，换手机电脑随时秒恢复！虚拟激活码一经发出绑定存档不支持退换，祝爷把把爆八亿两！
  ```

---

## 四、B站 Toy 一键上传命令（扫码登录后直接跑）

```bash
toy create /Users/wang/OPC/projects/royal-heist/release/royal-heist-toy.zip \
  --title "见好就收：大内第一贪（朝堂摸金搜打撤）" \
  --slug "royal-heist" \
  --category "GAME" \
  --visibility "public" \
  --theme "dark" \
  --poster /Users/wang/OPC/projects/royal-heist/release/poster-4x3.jpg \
  --icon /Users/wang/OPC/projects/royal-heist/release/icon-512.png \
  --yes --json
```

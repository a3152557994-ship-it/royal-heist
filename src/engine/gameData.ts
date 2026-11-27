import {
  AchievementDef,
  AuditEncounter,
  ComboStepLog,
  EstateTier,
  InquisitorType,
  Lang,
  LocalizedText,
  LootCard,
  LordId,
  LordProfile,
  RelicOrConsort,
} from '../types/game';

export const tText = (obj: LocalizedText, lang: Lang): string => obj[lang] || obj.zh;

export function formatSilver(wan: number, lang: Lang = 'zh'): string {
  const rounded = Math.round(wan * 10) / 10;
  if (lang === 'en') {
    if (rounded >= 10000) return `${(rounded / 10000).toFixed(2)}B Taels`;
    if (rounded >= 100) return `${(rounded / 100).toFixed(1)}M Taels`;
    return `${Math.round(rounded * 10)}K Taels`;
  }
  if (rounded >= 10000) {
    return `${(rounded / 10000).toFixed(2)} 亿两`;
  }
  if (rounded >= 1) {
    return `${rounded >= 100 ? Math.round(rounded).toLocaleString() : rounded.toFixed(1)} 万两`;
  }
  return `${Math.max(0, Math.round(rounded * 10000)).toLocaleString()} 两`;
}

export const LORDS: LordProfile[] = [
  {
    id: 'heshen',
    name: { zh: '和大人 · 军机暗账', en: 'Grand Councilor He' },
    title: { zh: '户部掌印 · 万岁爷肚里的蛔虫', en: 'Keeper of the Imperial Purse' },
    earthUid: '清廷服·钮祜禄密档 (UID:1799)',
    globalEscapeRate: 7.4,
    avatar: './assets/char_heshen.webp',
    quote: {
      zh: '「太上皇眼看就剩最后几口气了，地窖里才存了三千万两，这够干啥的？再摸一把户部库银咱们就装船下江南！」',
      en: '"The Old Emperor has hours left. Shall we skim one last treasury shipment before escaping south?"',
    },
    passiveName: { zh: '【揣摩圣意】', en: 'Imperial Favor' },
    passiveDesc: {
      zh: '所有「贡品 / 肥差」牌基础纹银 +50%；开局自带西洋怀表与封口茶，但新皇早已盯上你（初始 ★☆ 一星警戒）。',
      en: '+50% base silver on Tribute & Graft cards; starts with Spyglass & Bribe Tea, but 1 Wanted Star.',
    },
    startingIncense: 100,
    startingWanted: 1,
    maxRelicSlots: 5,
    startingItems: { spyglass: 1, scapegoat: 0, bribe_tea: 1, loaded_dice: 1 },
    startingRelicId: 'rel_heshen_tribute',
    debuffs: [
      { zh: '新皇磨刀霍霍（警戒易涨）', en: 'Crown Prince Watching' },
      { zh: '家大业大（断香必抄全族）', en: 'Total Confiscation on Death' },
    ],
  },
  {
    id: 'duke',
    name: { zh: '混世小爵爷 · 陆小宝', en: 'Rogue Duke Lu' },
    title: { zh: '御前滑头 · 奉旨抄家一等公', en: 'Street-Smart Royal Confiscator' },
    earthUid: '内廷服·扬州小滑头 (UID:1670)',
    globalEscapeRate: 11.8,
    avatar: './assets/char_duke.webp',
    quote: {
      zh: '「奉旨抄贪官的家，三成归国库、七成归本爵爷！把郡主和女刺客全哄开心了，天塌下来也有老婆们顶着！」',
      en: '"30% for the Crown, 70% for my secret boat! Keep the beauties happy and no Censor dares touch us!"',
    },
    passiveName: { zh: '【八面玲珑海王阵】', en: 'Charm & Consort Synergy' },
    passiveDesc: {
      zh: '红颜/神印槽上限扩至 6 格！每迎入一位红颜内助，全局算盘倍率额外 +0.35x，且开局自带灌铅骰子×2 与替死鬼×1。',
      en: '6 Relic/Consort slots! Every Consort grants +0.35x extra multiplier. Starts with 2 Loaded Dice & 1 Scapegoat.',
    },
    startingIncense: 108,
    startingWanted: 0,
    maxRelicSlots: 6,
    startingItems: { spyglass: 0, scapegoat: 1, bribe_tea: 1, loaded_dice: 2 },
    startingRelicId: 'rel_duke_harmony',
    debuffs: [
      { zh: '出身草莽（御史查账更严）', en: 'Lowborn Scrutiny' },
      { zh: '后院起火（需端水哄美人）', en: 'Harem Drama Risk' },
    ],
  },
  {
    id: 'emperor',
    name: { zh: '煤山破局人 · 朱由检', en: 'Sleepless Emperor Zhu' },
    title: { zh: '乾清孤影 · 掀桌狂抄勋贵局', en: 'Table-Flipping Last Sovereign' },
    earthUid: '明末地狱服·天子讨饷 (UID:1644)',
    globalEscapeRate: 4.6,
    avatar: './assets/char_emperor.webp',
    quote: {
      zh: '「满朝勋贵哭穷只捐几百两？好！朕今晚不讲祖制了——把国丈绑上城楼架锅拍卖，城破前凑够军饷押上九门！」',
      en: '"The nobles claim poverty while rebels storm the gates? Tonight I auction their estates by force!"',
    },
    passiveName: { zh: '【天子剑 · 狂野掀桌】', en: 'Sword of Heaven' },
    passiveDesc: {
      zh: '反套路爽局：所有「狂野掀桌」牌收益 ×1.85！将筹集的军饷安全押运上城楼即视为逆命成功（初始 ★★ 高危哗变星级）。',
      en: '1.85x Silver on all Wild Table-Flip cards! Safely escorting silver saves the dynasty. Starts at 2 Wanted Stars.',
    },
    startingIncense: 92,
    startingWanted: 2,
    maxRelicSlots: 5,
    startingItems: { spyglass: 1, scapegoat: 1, bribe_tea: 0, loaded_dice: 1 },
    startingRelicId: 'rel_emperor_edict',
    debuffs: [
      { zh: '闯军攻城（龙涎香燃速加快）', en: 'Siege Countdown Faster' },
      { zh: '勋贵反扑（初始二星哗变）', en: 'Noble Mutiny Alert ★★' },
    ],
  },
];

export const RELICS_AND_CONSORTS: Record<string, RelicOrConsort> = {
  rel_heshen_tribute: {
    id: 'rel_heshen_tribute',
    kind: 'relic',
    name: { zh: '珊瑚朝珠算盘', en: 'Coral Court Beads' },
    badge: { zh: '本命权印', en: 'Lord Seal' },
    desc: { zh: '打出肥差或贡品牌时，基础纹银 +50%', en: '+50% base silver on Graft/Tribute cards' },
    effectCode: 'heshen_tribute',
  },
  rel_duke_harmony: {
    id: 'rel_duke_harmony',
    kind: 'consort',
    name: { zh: '贴身双姝 · 阿柔', en: 'Twin Maidens A-Rou' },
    badge: { zh: '首席红颜', en: 'Consort' },
    avatar: './assets/consort_duo.webp',
    desc: { zh: '每在场 1 位红颜，结算总倍率 +0.35x；每更自动降 0.3 星警戒', en: '+0.35x mult per Consort; -0.3 Star/turn' },
    effectCode: 'duke_harmony',
  },
  rel_emperor_edict: {
    id: 'rel_emperor_edict',
    kind: 'relic',
    name: { zh: '尚方天子血诏', en: 'Blood Imperial Sword' },
    badge: { zh: '本命帝玺', en: 'Imperial Seal' },
    desc: { zh: '所有「狂野掀桌」牌纹银 ×1.85', en: '1.85x Silver on all Wild cards' },
    effectCode: 'emperor_edict',
  },
  con_princess: {
    id: 'con_princess',
    kind: 'consort',
    name: { zh: '刁蛮长公主 · 宁华', en: 'Princess Ninghua' },
    badge: { zh: '皇室红颜', en: 'Royal Consort' },
    avatar: './assets/consort_duo.webp',
    desc: { zh: '总倍率 ×1.45；钦差查账时 40% 概率一鞭子直接抽退御史免审！', en: '1.45x Total Mult; 40% chance to whip away Inquisitors!' },
    effectCode: 'princess_whip',
  },
  con_assassin: {
    id: 'con_assassin',
    kind: 'consort',
    name: { zh: '冷艳夜行女卫 · 惊鸿', en: 'Nightblade Jinghong' },
    badge: { zh: '江湖红颜', en: 'Shadow Consort' },
    avatar: './assets/consort_duo.webp',
    desc: { zh: '刀尖跳舞：右上角每有 1 颗警戒星，结算倍率暴涨 +0.45x！', en: '+0.45x Mult for every active Wanted Star!' },
    effectCode: 'assassin_edge',
  },
  con_merchant: {
    id: 'con_merchant',
    kind: 'consort',
    name: { zh: '江南盐商千金 · 苏婉', en: 'Heiress Su Wan' },
    badge: { zh: '财神红颜', en: 'Wealth Consort' },
    avatar: './assets/consort_duo.webp',
    desc: { zh: '每更结束暗格存银自动钱生钱复利 +15%！', en: '+15% compound interest on unbanked silver every turn!' },
    effectCode: 'merchant_interest',
  },
  con_dancer: {
    id: 'con_dancer',
    kind: 'consort',
    name: { zh: '西域胡姬 · 伽罗', en: 'Exotic Dancer Jialuo' },
    badge: { zh: '奇珍红颜', en: 'Mystic Consort' },
    avatar: './assets/consort_duo.webp',
    desc: { zh: '单回合拍满 3 张牌时触发霓裳连击，总收益额外 ×1.55！', en: '1.55x Final Silver when playing full 3 cards!' },
    effectCode: 'dancer_triple',
  },
  con_physician: {
    id: 'con_physician',
    kind: 'consort',
    name: { zh: '太医院女医官 · 沈清竹', en: 'Royal Physician Shen' },
    badge: { zh: '续命红颜', en: 'Healer Consort' },
    avatar: './assets/consort_duo.webp',
    desc: { zh: '金针续命：每更老皇上龙涎香损耗减免 35%，稳贪多摸三回合！', en: 'Reduces Emperor incense burn by 35% per turn!' },
    effectCode: 'physician_incense',
  },
  rel_gold_abacus: {
    id: 'rel_gold_abacus',
    kind: 'relic',
    name: { zh: '紫金九梁如意算盘', en: 'Nine-Beam Gold Abacus' },
    badge: { zh: '镇宅重器', en: 'Vault Relic' },
    desc: { zh: '算盘一响黄金万两：每张牌基础纹银固定 +18 万两，倍率 +0.4x', en: '+180K Taels per card played & +0.4x Mult' },
    effectCode: 'gold_abacus',
  },
  rel_dying_decree: {
    id: 'rel_dying_decree',
    kind: 'relic',
    name: { zh: '乾清宫遗诏残卷', en: 'Secret Regency Scroll' },
    badge: { zh: '赌命神物', en: 'Forbidden Relic' },
    desc: { zh: '极限贪狗神装：当龙涎香低于 45% 时，所有摸金收益直接 ×2.1！', en: '2.1x Total Silver when Incense is below 45%!' },
    effectCode: 'dying_decree',
  },
  rel_yin_yang: {
    id: 'rel_yin_yang',
    kind: 'relic',
    name: { zh: '阴阳双面鱼鳞账册', en: 'Twin-Faced Tax Ledger' },
    badge: { zh: '做假账神器', en: 'Audit Shield' },
    desc: { zh: '每次结算自动抹平 0.5 颗警戒星，且总倍率 ×1.25', en: '-0.5 Wanted Star each turn & 1.25x Mult' },
    effectCode: 'yin_yang_ledger',
  },
};

export const DECK_POOL: LootCard[] = [
  {
    id: 'c_salt_ticket',
    category: 'graft',
    name: { zh: '两淮盐引专卖批条', en: 'Lianghuai Salt Monopoly' },
    subtitle: { zh: '大笔一挥，江南盐商连夜抬银箱进后门', en: 'Salt merchants haul chests to your back gate' },
    baseSilverWan: 32,
    multAdd: 0.35,
    wantedDelta: 0.5,
    incenseDelta: -8,
    tag: 'salt',
  },
  {
    id: 'c_river_silt',
    category: 'graft',
    name: { zh: '黄河修堤浮报物料', en: 'River Dike Padding' },
    subtitle: { zh: '十万两修河，七万两落进自家暗格', en: 'Report 100K spent, pocket 70K quietly' },
    baseSilverWan: 45,
    multAdd: 0.4,
    wantedDelta: 0.8,
    incenseDelta: -9,
    tag: 'salt',
  },
  {
    id: 'c_imperial_jade',
    category: 'graft',
    name: { zh: '内务府采办缅北翡翠', en: 'Imperial Jade Procurement' },
    subtitle: { zh: '报账纹银五十万，真货早换成了玻璃种次品', en: 'Swap palace jadeite while billing royal rates' },
    baseSilverWan: 38,
    multAdd: 0.45,
    wantedDelta: 0.6,
    incenseDelta: -7,
    tag: 'tribute',
  },
  {
    id: 'c_sell_post',
    category: 'graft',
    name: { zh: '京察候补肥缺暗拍', en: 'Auctioning Governor Seats' },
    subtitle: { zh: '苏杭道台明码标价，价高者得官帽', en: 'Sell lucrative southern posts to highest bidder' },
    baseSilverWan: 52,
    multAdd: 0.55,
    wantedDelta: 1.0,
    incenseDelta: -10,
    tag: 'court',
  },
  {
    id: 'c_gate_tariff',
    category: 'graft',
    name: { zh: '崇文门税关暗抽三成', en: 'Capital Gate Toll Skim' },
    subtitle: { zh: '进京商队雁过拔毛，铜钱日夜响不停', en: 'Every caravan entering the capital pays your cut' },
    baseSilverWan: 26,
    multAdd: 0.3,
    wantedDelta: 0.35,
    incenseDelta: -6,
    tag: 'tribute',
  },
  // WILD GTA-STYLE TABLE-FLIP CARDS
  {
    id: 'w_raid_minister',
    category: 'wild',
    name: { zh: '🔥 奉旨连夜查抄倒台尚书府', en: '🔥 Midnight Raid on Fallen Minister' },
    subtitle: { zh: '掘地三尺砸开夹墙，金砖字画全搬回自家地窖！', en: 'Smash secret walls, haul gold bricks to your vault!' },
    baseSilverWan: 95,
    multAdd: 0.85,
    multFactor: 1.25,
    wantedDelta: 1.5,
    incenseDelta: -12,
    tag: 'raid',
  },
  {
    id: 'w_boil_inlaw',
    category: 'wild',
    name: { zh: '🔥 午门架大锅现场拍卖国丈家产', en: '🔥 Boil & Auction Royal In-Law Estate' },
    subtitle: { zh: '哭穷一毛不拔？火点起来当场吐出三百万两！', en: 'Crying poor? Light the cauldron and watch gold flow!' },
    baseSilverWan: 130,
    multAdd: 1.1,
    multFactor: 1.35,
    wantedDelta: 2.0,
    incenseDelta: -14,
    tag: 'raid',
  },
  {
    id: 'w_hijack_convoy',
    category: 'wild',
    name: { zh: '🔥 假传密旨截留八百里皇纲银车', en: '🔥 Intercept Imperial Silver Convoy' },
    subtitle: { zh: '胆大包天换上自家封条，整队官银直接改道进暗河！', en: 'Forge the seal and divert the entire treasury convoy!' },
    baseSilverWan: 165,
    multAdd: 1.3,
    multFactor: 1.4,
    wantedDelta: 2.3,
    incenseDelta: -15,
    tag: 'raid',
  },
  {
    id: 'w_squeeze_tycoons',
    category: 'wild',
    name: { zh: '🔥 鸿门夜宴锁门勒索八大皇商', en: '🔥 Lock & Shake Down 8 Tycoons' },
    subtitle: { zh: '摔杯为号刀斧手亮甲：今晚不签捐银状谁也别出院门', en: 'Drop the cup—nobody leaves until they sign over silver' },
    baseSilverWan: 112,
    multAdd: 0.95,
    wantedDelta: 1.7,
    incenseDelta: -11,
    tag: 'raid',
  },
  // CONSORTS & RELICS
  {
    id: 'r_princess',
    category: 'consort',
    name: { zh: '🌸 迎入【刁蛮长公主 · 宁华】', en: '🌸 Recruit Princess Ninghua' },
    subtitle: { zh: '金枝玉叶坐镇后宅：总倍率×1.45，40%一鞭抽退查账御史', en: '1.45x Mult & 40% chance to whip away Inquisitors' },
    baseSilverWan: 35,
    multAdd: 0.5,
    wantedDelta: -0.6,
    incenseDelta: -6,
    grantsRelicId: 'con_princess',
    tag: 'beauty',
  },
  {
    id: 'r_assassin',
    category: 'consort',
    name: { zh: '🌸 救下【夜行女卫 · 惊鸿】', en: '🌸 Recruit Nightblade Jinghong' },
    subtitle: { zh: '红衣冷剑：每颗警戒星反增 +0.45x 倍率，越危险越暴富', en: '+0.45x Mult per Wanted Star—thrive in chaos' },
    baseSilverWan: 20,
    multAdd: 0.4,
    wantedDelta: 0.4,
    incenseDelta: -6,
    grantsRelicId: 'con_assassin',
    tag: 'beauty',
  },
  {
    id: 'r_merchant',
    category: 'consort',
    name: { zh: '🌸 纳聘【江南盐商女 · 苏婉】', en: '🌸 Recruit Heiress Su Wan' },
    subtitle: { zh: '嫁妆丰厚且精通票号：每更暗格现银自动复利 +15%', en: '+15% compound interest on unbanked silver each turn' },
    baseSilverWan: 55,
    multAdd: 0.3,
    wantedDelta: 0.2,
    incenseDelta: -6,
    grantsRelicId: 'con_merchant',
    tag: 'beauty',
  },
  {
    id: 'r_dancer',
    category: 'consort',
    name: { zh: '🌸 赎出【西域胡姬 · 伽罗】', en: '🌸 Recruit Dancer Jialuo' },
    subtitle: { zh: '胡旋迷魂：单回合拍满 3 张牌时，本更收益额外 ×1.55', en: '1.55x Final Silver when playing 3 cards in a turn' },
    baseSilverWan: 28,
    multAdd: 0.45,
    wantedDelta: 0.3,
    incenseDelta: -6,
    grantsRelicId: 'con_dancer',
    tag: 'beauty',
  },
  {
    id: 'r_physician',
    category: 'consort',
    name: { zh: '🌸 礼聘【女医官 · 沈清竹】', en: '🌸 Recruit Physician Shen' },
    subtitle: { zh: '入宫替老皇上施针续命：当场回香 +16%，后续燃速减 35%', en: '+16% Incense now & -35% burn speed every turn' },
    baseSilverWan: 15,
    multAdd: 0.25,
    wantedDelta: -0.4,
    incenseDelta: 16,
    grantsRelicId: 'con_physician',
    tag: 'beauty',
  },
  {
    id: 'r_abacus',
    category: 'relic',
    name: { zh: '🏺 密室起获【紫金九梁算盘】', en: '🏺 Claim Nine-Beam Gold Abacus' },
    subtitle: { zh: '前朝首富遗宝：以后每打一张牌额外 +18万两 且 +0.4x', en: '+180K Taels per card & +0.4x Mult permanently' },
    baseSilverWan: 30,
    multAdd: 0.4,
    wantedDelta: 0.5,
    incenseDelta: -7,
    grantsRelicId: 'rel_gold_abacus',
    tag: 'scheme',
  },
  {
    id: 'r_decree',
    category: 'relic',
    name: { zh: '🏺 偷摹【乾清宫遗诏残卷】', en: '🏺 Steal Secret Regency Scroll' },
    subtitle: { zh: '龙涎香低于 45% 时全盘收益 ×2.1！搏命神物', en: '2.1x Total Silver when Incense drops below 45%!' },
    baseSilverWan: 25,
    multAdd: 0.6,
    wantedDelta: 1.1,
    incenseDelta: -8,
    grantsRelicId: 'rel_dying_decree',
    tag: 'scheme',
  },
  {
    id: 'r_yinyang',
    category: 'relic',
    name: { zh: '🏺 精修【阴阳双面鱼鳞册】', en: '🏺 Forge Twin-Faced Tax Ledger' },
    subtitle: { zh: '真假两套账：每更自动降半颗星，且总倍率 ×1.25', en: '-0.5 Star every turn & 1.25x Total Mult' },
    baseSilverWan: 22,
    multAdd: 0.3,
    wantedDelta: -1.0,
    incenseDelta: -6,
    grantsRelicId: 'rel_yin_yang',
    tag: 'scheme',
  },
  // COVER & SURVIVAL CARDS
  {
    id: 's_ginseng',
    category: 'cover',
    name: { zh: '🌿 进献长白山百年老参吊命', en: '🌿 Offer 100-Year Wild Ginseng' },
    subtitle: { zh: '老皇上多喘两口气，咱们就能多搬两船金砖！（香火+24%）', en: 'Keep the Old Emperor breathing! +24% Incense & -0.8 Star' },
    baseSilverWan: 8,
    multAdd: 0.2,
    wantedDelta: -0.8,
    incenseDelta: 24,
    grantsItemId: 'spyglass',
    tag: 'tribute',
  },
  {
    id: 's_burn_ledger',
    category: 'cover',
    name: { zh: '🕯️ 火盆焚毁百官行贿礼单', en: '🕯️ Burn Secret Bribe Ledgers' },
    subtitle: { zh: '死无对证！警戒星级直降 ★☆ 1.8 星，并招募一名替死鬼门客', en: '-1.8 Wanted Stars & gain +1 Scapegoat Retainer!' },
    baseSilverWan: 5,
    multAdd: 0.15,
    wantedDelta: -1.8,
    incenseDelta: -5,
    grantsItemId: 'scapegoat',
    tag: 'scheme',
  },
  {
    id: 's_porridge',
    category: 'cover',
    name: { zh: '🥣 京郊施粥买通都察院清议', en: '🥣 Charity Soup & Censor Bribe' },
    subtitle: { zh: '花小钱赚大善人美名：警戒直降 ★☆ 1.5 星，获赠东珠封口茶', en: '-1.5 Wanted Stars & gain +1 Pearl Bribe Tea!' },
    baseSilverWan: 10,
    multAdd: 0.25,
    wantedDelta: -1.5,
    incenseDelta: -4,
    grantsItemId: 'bribe_tea',
    tag: 'court',
  },
];

export const ESTATES: EstateTier[] = [
  {
    id: 'est_0',
    level: 0,
    name: { zh: '京城胡同暗格小院', en: 'Back-Alley Vault Courtyard' },
    costWan: 0,
    perkDesc: { zh: '起家老窝：地窖仅容藏银，后门通护城河乌篷船', en: 'Humble secret cellar connected to canal dock' },
  },
  {
    id: 'est_1',
    level: 1,
    name: { zh: '秦淮河十里画舫暗桩', en: 'Qinhuai Pleasure Barge' },
    costWan: 120,
    perkDesc: { zh: '永久加成：每局开局额外获赠【灌铅重洗骰子】×1，起始银两 +25 万两', en: '+1 Loaded Dice & +250K starting silver every run' },
  },
  {
    id: 'est_2',
    level: 2,
    name: { zh: '扬州瘦马烟雨私家园林', en: 'Yangzhou Misty Garden' },
    costWan: 600,
    perkDesc: { zh: '永久加成：所有摸金结算基础倍率永久 +0.35x！', en: 'Permanent +0.35x Base Multiplier every run!' },
  },
  {
    id: 'est_3',
    level: 3,
    name: { zh: '什刹海金丝楠木藏宝王府', en: 'Grand Prince Nanmu Palace' },
    costWan: 2800,
    perkDesc: { zh: '锡晋斋夹墙：哪怕不幸断香抄家，也能秘密保住 20% 暗格银两落袋！', en: 'Even if confiscated, secretly keep 20% of silver!' },
  },
  {
    id: 'est_4',
    level: 4,
    name: { zh: '南洋武装商船与香料群岛', en: 'Nanyang Private Spice Islands' },
    costWan: 12000,
    perkDesc: { zh: '永久加成：开局自带 120 万两，全局总收益永久 ×1.35！', en: 'Start with 1.2M Taels & 1.35x Permanent Total Silver!' },
  },
  {
    id: 'est_5',
    level: 5,
    name: { zh: '地球 Online · 影子万国钱庄总号', en: 'Shadow Global Banking Empire' },
    costWan: 80000,
    perkDesc: { zh: '八亿两神话毕业：富可敌国，新皇登基也得找你借军饷！全局收益 ×2.0', en: '800M Tael Mythic Tier: Emperors borrow from YOU! 2.0x Silver' },
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_first_escape',
    name: { zh: '见好就收第一桶金', en: 'First Clean Getaway' },
    clue: { zh: '史官线索：在龙涎香燃尽前，成功驾船安全撤离 1 次', en: 'Clue: Escape safely on the canal boat before incense dies' },
  },
  {
    id: 'ach_10m',
    name: { zh: '千万巨贪 · 江南富家翁', en: '10-Million Tael Tycoon' },
    clue: { zh: '史官线索：单局一次性安全撤离带出超过 1,000 万两纹银', en: 'Clue: Extract at least 10M Taels in a single run' },
  },
  {
    id: 'ach_100m',
    name: { zh: '一亿小目标 · 半壁国库姓咱', en: '100-Million Vault King' },
    clue: { zh: '史官线索：凑齐红颜与遗诏羁绊，单局撤离突破 1 亿两白银', en: 'Clue: Extract over 100M Taels in one single run' },
  },
  {
    id: 'ach_800m_heshen',
    name: { zh: '八亿两神话 · 嘉庆看了流眼泪', en: '800M Myth: Heshen Reborn' },
    clue: { zh: '史官线索：单局或总金库突破 8 亿两（大清十五年财政总和）', en: 'Clue: Reach 800M Taels in a single run or permanent vault' },
  },
  {
    id: 'ach_harem_master',
    name: { zh: '端水大师 · 红颜满堂彩', en: 'Grandmaster of Consorts' },
    clue: { zh: '史官线索：单局内同时迎入至少 3 位红颜内助并活着撤离', en: 'Clue: Have 3+ Consorts active simultaneously and escape alive' },
  },
  {
    id: 'ach_edge_runner',
    name: { zh: '刀尖舔血 · 残香一寸逃出生天', en: ' Razor-Edge Escape' },
    clue: { zh: '史官线索：在龙涎香仅剩不到 15% 的绝境时刻卡点撤离成功', en: 'Clue: Escape when Imperial Incense is under 15%' },
  },
  {
    id: 'ach_ silver_tongue',
    name: { zh: '舌灿莲花 · 把钦差忽悠瘸了', en: 'Silver-Tongued Schemer' },
    clue: { zh: '史官线索：在查账轮盘亲笔手写辩词，当场说服钦差撤案', en: 'Clue: Convince an Inquisitor to back down via written excuse' },
  },
  {
    id: 'ach_greedy_fall',
    name: { zh: '你跌倒新皇吃饱 · 贪心不足蛇吞象', en: 'Emperor Eats Well Tonight' },
    clue: { zh: '史官线索：怀揣超过 1,500 万两拒不撤离，结果断香被抄得精光', en: 'Clue: Lose 15M+ unbanked Taels to confiscation from pure greed' },
  },
];

export function drawHandCards(
  ownedRelicIds: string[],
  maxSlots: number,
  count = 5
): LootCard[] {
  const canTakeMoreRelics = ownedRelicIds.length < maxSlots;
  const available = DECK_POOL.filter((c) => {
    if (c.grantsRelicId) {
      if (!canTakeMoreRelics) return false;
      if (ownedRelicIds.includes(c.grantsRelicId)) return false;
    }
    return true;
  });

  const copy = [...available];
  const picked: LootCard[] = [];
  while (picked.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return picked;
}

export function calculateWatchResolution(params: {
  selectedCards: LootCard[];
  lord: LordProfile;
  relicIds: string[];
  greedStreakMult: number;
  currentIncense: number;
  currentWanted: number;
  estateLevel: number;
  lang: Lang;
}): {
  gainedSilverWan: number;
  nextWanted: number;
  nextIncense: number;
  steps: ComboStepLog[];
   grantedRelicIds: string[];
  grantedItems: string[];
} {
  const {
    selectedCards,
    relicIds,
    greedStreakMult,
    currentIncense,
    currentWanted,
    estateLevel,
    lang,
  } = params;

  let baseSum = 0;
  let mult = 1.0 + greedStreakMult + (estateLevel >= 2 ? 0.35 : 0);
  let wanted = currentWanted;
  let incenseDeltaTotal = 0;
  const steps: ComboStepLog[] = [];
  const grantedRelicIds: string[] = [];
  const grantedItems: string[] = [];

  const hasHeshen = relicIds.includes('rel_heshen_tribute');
  const hasEmperor = relicIds.includes('rel_emperor_edict');
  const hasGoldAbacus = relicIds.includes('rel_gold_abacus');

  for (const card of selectedCards) {
    let cardBase = card.baseSilverWan;
    if (hasHeshen && (card.category === 'graft' || card.tag === 'tribute' || card.tag === 'salt')) {
      cardBase *= 1.5;
    }
    if (hasEmperor && card.category === 'wild') {
      cardBase *= 1.85;
    }
    if (hasGoldAbacus) {
      cardBase += 18;
    }
    baseSum += cardBase;
    mult += card.multAdd;
    if (card.multFactor) mult *= card.multFactor;
    wanted += card.wantedDelta;
    incenseDeltaTotal += card.incenseDelta;

    if (card.grantsRelicId && !relicIds.includes(card.grantsRelicId)) {
      grantedRelicIds.push(card.grantsRelicId);
    }
    if (card.grantsItemId) {
      grantedItems.push(card.grantsItemId);
    }

    steps.push({
      label: tText(card.name, lang),
      silverWanAfter: Math.round(baseSum * mult * 10) / 10,
      multAfter: Math.round(mult * 100) / 100,
    });
  }

  const allRelicsAfter = [...relicIds, ...grantedRelicIds];
  const consortCount = allRelicsAfter.filter((id) => RELICS_AND_CONSORTS[id]?.kind === 'consort').length;

  if (allRelicsAfter.includes('rel_gold_abacus')) {
    mult += 0.4;
  }
  if (allRelicsAfter.includes('rel_duke_harmony') && consortCount > 0) {
    mult += consortCount * 0.35;
    wanted -= 0.3;
    steps.push({
      label: lang === 'zh' ? `红颜同心阵 (${consortCount}美)` : `Consort Synergy (${consortCount})`,
      silverWanAfter: Math.round(baseSum * mult * 10) / 10,
      multAfter: Math.round(mult * 100) / 100,
    });
  }
  if (allRelicsAfter.includes('con_princess')) {
    mult *= 1.45;
    steps.push({
      label: lang === 'zh' ? '长公主凤威 ×1.45' : 'Princess Prestige ×1.45',
      silverWanAfter: Math.round(baseSum * mult * 10) / 10,
      multAfter: Math.round(mult * 100) / 100,
    });
  }
  if (allRelicsAfter.includes('con_assassin') && wanted > 0.5) {
    const bonus = Math.max(0, Math.round(wanted * 0.45 * 100) / 100);
    mult += bonus;
    steps.push({
      label: lang === 'zh' ? `惊鸿刀尖舞 +${bonus}x` : `Nightblade Edge +${bonus}x`,
      silverWanAfter: Math.round(baseSum * mult * 10) / 10,
      multAfter: Math.round(mult * 100) / 100,
    });
  }
  if (allRelicsAfter.includes('con_dancer') && selectedCards.length >= 3) {
    mult *= 1.55;
    steps.push({
      label: lang === 'zh' ? '胡姬三连霓裳 ×1.55' : '3-Card Dance ×1.55',
      silverWanAfter: Math.round(baseSum * mult * 10) / 10,
      multAfter: Math.round(mult * 100) / 100,
    });
  }
  if (allRelicsAfter.includes('rel_yin_yang')) {
    wanted -= 0.5;
    mult *= 1.25;
  }
  if (allRelicsAfter.includes('rel_dying_decree') && currentIncense < 45) {
    mult *= 2.1;
    steps.push({
      label: lang === 'zh' ? '病危遗诏暴击 ×2.1!' : 'Dying Decree ×2.1!',
      silverWanAfter: Math.round(baseSum * mult * 10) / 10,
      multAfter: Math.round(mult * 100) / 100,
    });
  }

  if (estateLevel >= 4) mult *= 1.35;
  if (estateLevel >= 5) mult *= 2.0;

  if (allRelicsAfter.includes('con_physician') && incenseDeltaTotal < 0) {
    incenseDeltaTotal *= 0.65;
  }

  const gainedSilverWan = Math.max(1, Math.round(baseSum * mult * 10) / 10);
  const nextWanted = Math.max(0, Math.min(5, Math.round(wanted * 10) / 10));
  const nextIncense = Math.max(0, Math.min(120, Math.round(currentIncense + incenseDeltaTotal)));

  return {
    gainedSilverWan,
    nextWanted,
    nextIncense,
    steps,
    grantedRelicIds,
    grantedItems,
  };
}

export function computeSuddenDeathRiskPercent(incenseLeft: number, watchTurn: number): number {
  if (incenseLeft <= 0) return 100;
  if (incenseLeft >= 78 && watchTurn <= 2) return 0; // Fair opening protection: never cheap Turn 1-2 instant RNG death!
  if (incenseLeft >= 65) return Math.min(12, Math.max(3, watchTurn * 2));
  if (incenseLeft >= 40) return Math.round(16 + (65 - incenseLeft) * 0.9);
  if (incenseLeft >= 20) return Math.round(39 + (40 - incenseLeft) * 1.6);
  return Math.min(92, Math.round(72 + (20 - incenseLeft) * 1.2));
}

export function createAuditEncounter(wantedStars: number, watchTurn: number): AuditEncounter {
  const types: InquisitorType[] = ['censor', 'eunuch', 'envoy'];
  const picked = types[(watchTurn + Math.floor(wantedStars)) % types.length];

  const meta: Record<
    InquisitorType,
    { name: LocalizedText; role: LocalizedText; acc: LocalizedText }
  > = {
    censor: {
      name: { zh: '铁面左都御史 · 海清廉', en: 'Iron Censor Hai' },
      role: { zh: '油盐不进 · 最恨行贿，但极重朝廷大义与皇室体面', en: 'Hates bribes; respects loyal duty & imperial face' },
      acc: {
        zh: '「大胆！本官截获江南密报，你府门夜夜抬入沉重木箱！桌上三封奏折，你自己翻一封验明正身！」',
        en: '"Halt! Secret dispatches report chests of silver entering your manor nightly! Pick one scroll to unseal!"',
      },
    },
    eunuch: {
      name: { zh: '东厂提督太监 · 曹公公', en: 'East Depot Chief Cao' },
      role: { zh: '唯利是图 · 认万岁爷名头，更认白花花的孝敬干股', en: 'Greedy & cunning; loves profit shares & Emperor\'s name' },
      acc: {
        zh: '「哟，大人这算盘打得隔三条街都听见啦！杂家手里捏着三封密折，看看大人懂不懂规矩咯？」',
        en: '"My, your abacus rings across three streets! Let\'s see which secret report you unseal tonight..."',
      },
    },
    envoy: {
      name: { zh: '新皇潜邸密使 · 额驸丰绅', en: 'Crown Prince\'s Envoy' },
      role: { zh: '欺软怕硬 · 畏惧兵权威慑与把百官拉下水的黑账', en: 'Fears military muscle & mutual-destruction blackmail' },
      acc: {
        zh: '「奉储君密谕核查京城银号亏空！识相的自己翻开一册，若是铁证，今夜便请大人赴诏狱喝茶！」',
        en: '"By secret order of the Heir Apparent: unseal one dossier. If it\'s the real ledger, the dungeon awaits!"',
      },
    },
  };

  const deadlyCount = wantedStars >= 4.2 ? 2 : 1;
  const flags = deadlyCount === 2 ? [true, true, false] : [true, false, false];
  // Fisher-Yates shuffle
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flags[i], flags[j]] = [flags[j], flags[i]];
  }

  const labels: LocalizedText[] = [
    { zh: '甲字火漆密折', en: 'Crimson Seal Scroll I' },
    { zh: '乙字火漆密折', en: 'Crimson Seal Scroll II' },
    { zh: '丙字火漆密折', en: 'Crimson Seal Scroll III' },
  ];

  return {
    inquisitorType: picked,
    inquisitorName: meta[picked].name,
    inquisitorRole: meta[picked].role,
    accusation: meta[picked].acc,
    scrolls: flags.map((isDeadly, index) => ({
      index,
      isDeadly,
      revealed: false,
      label: labels[index],
    })),
    excuseUsed: false,
  };
}

/**
 * Deterministic Rhetorical Combat Evaluator!
 * Never hallucinates or wipes silver; rewards clever roleplay tailored to the Inquisitor's weakness!
 */
export function evaluateImperialExcuse(
  rawInput: string,
  inquisitorType: InquisitorType
): {
  dismissedAll: boolean;
  neutralizedOneDeadly: boolean;
  wantedDelta: number;
  verdictZh: string;
  verdictEn: string;
} {
  const text = rawInput.trim();
  if (text.length < 3) {
    return {
      dismissedAll: false,
      neutralizedOneDeadly: false,
      wantedDelta: 0.3,
      verdictZh: '你支支吾吾半天没憋出整话，钦差冷笑一声：「心虚了？快翻折子！」',
      verdictEn: 'You stammered incoherently. The Inquisitor sneers: "Guilty conscience? Pick a scroll!"',
    };
  }

  const hasEmperorShield = /皇上|万岁|太上皇|圣旨|龙体|修园|寿礼|奉旨|emperor|majesty|royal/i.test(text);
  const hasBribe = /银|分你|三成|五成|孝敬|干股|黄金|马车|茶钱|喝茶|silver|gold|share|half/i.test(text);
  const hasBlackmail = /百官|同归于尽|黑账|礼单|兵符|九门|造反|砍|杀|东林|栽赃|污蔑|frame|army|blackmail/i.test(text);
  const hasLoyalDuty = /赈灾|军饷|前线|黎民|百姓|大义|清白|辽饷|忠心|relief|troops|loyal/i.test(text);

  if (inquisitorType === 'censor') {
    if (hasBribe && !hasLoyalDuty) {
      return {
        dismissedAll: false,
        neutralizedOneDeadly: false,
        wantedDelta: 0.8,
        verdictZh: '海御史拍案震怒：「竟敢当堂贿赂本官！罪加一等！」（警戒+0.8★）',
        verdictEn: 'Iron Censor Hai slams the desk: "Bribing a Censor?! Outrageous!" (+0.8★)',
      };
    }
    if (hasLoyalDuty || hasEmperorShield) {
      return {
        dismissedAll: true,
        neutralizedOneDeadly: true,
        wantedDelta: -1.4,
        verdictZh: '海御史听罢长叹一声，抱拳道：「原来大人暗中筹措皆为江山社稷，是下官错怪忠良了！告辞！」（当场撤案，警戒-1.4★！）',
        verdictEn: 'Censor Hai bows deeply: "So these funds are for frontier defense! Forgive my suspicion!" (Audit Dismissed!)',
      };
    }
  }

  if (inquisitorType === 'eunuch') {
    if (hasBribe || hasEmperorShield) {
      return {
        dismissedAll: true,
        neutralizedOneDeadly: true,
        wantedDelta: -1.2,
        verdictZh: '曹公公眉开眼笑，袖口一抖收下心意：「哎哟，咱家就说大人是万岁爷最贴心的人！这些烂折子咱家替你烧了！」（直接退兵，警戒-1.2★！）',
        verdictEn: 'Chief Cao chuckles warmly: "A true friend of His Majesty! I\'ll burn these pesky scrolls myself!" (Audit Dismissed!)',
      };
    }
  }

  if (inquisitorType === 'envoy') {
    if (hasBlackmail || hasEmperorShield) {
      return {
        dismissedAll: true,
        neutralizedOneDeadly: true,
        wantedDelta: -1.3,
        verdictZh: '密使脸色煞白，冷汗直流：「大人息怒！百官礼单万万不可外泄，下官这便回禀储君一切安好！」（灰溜溜退走，警戒-1.3★！）',
        verdictEn: 'The Envoy pales at your threat of mutual exposure and retreats hastily! (Audit Dismissed!)',
      };
    }
  }

  // Clever effort fallback: neutralizes 1 deadly scroll so player gets strong tactical reward!
  return {
    dismissedAll: false,
    neutralizedOneDeadly: true,
    wantedDelta: -0.5,
    verdictZh: '你一番巧舌如簧把对方绕得半信半疑，趁其犹豫暗中抽换掉了桌上 1 封死罪铁证！（已消减1封凶折，警戒-0.5★）',
    verdictEn: 'Your sharp rhetoric stalled the Inquisitor—you secretly swapped out 1 deadly scroll! (-0.5★)',
  };
}

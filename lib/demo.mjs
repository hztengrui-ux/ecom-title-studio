import { PLATFORMS, resolveStrategyIds } from './platforms.mjs';
import { normalizeTitle } from './title.mjs';

/**
 * 内置示例用于「零配置体验」。结果由人工撰写，不冒充模型识别。
 * taobao / temu 为逐条撰写；其余平台由这两组标题按平台语气适配。
 */
export const SAMPLES = [
  {
    id: 'mug',
    name: '奶油白手作感马克杯',
    label: '奶油白马克杯',
    category: '家居 · 杯具',
    file: '/samples/mug.svg',
    accent: '#C9A77C',
    brief: {
      category: '家居 / 杯具',
      brand: '',
      sellingPoints: '微斑点奶油釉、350ml、釉下彩、微波炉可用',
      audience: '办公室女性、咖啡爱好者',
    },
    product: {
      name: '奶油白手作感陶瓷马克杯',
      category: '家居生活 / 杯具',
      category_path: ['家居生活', '餐厨', '杯具'],
      summary:
        '暖调奶油白釉面，杯身带细密深色斑点；直筒杯型配圆润手柄，适合咖啡、牛奶与日常饮水。',
      attributes: [
        { name: '材质', value: '陶瓷' },
        { name: '容量', value: '350ml' },
        { name: '颜色', value: '奶油白' },
        { name: '工艺', value: '釉下彩' },
        { name: '结构', value: '带手柄' },
      ],
      audience: ['办公女性', '咖啡爱好者', '租房独居'],
      scenes: ['办公桌', '早餐桌', '下午茶'],
      visible_text: [],
      confidence: 0.93,
    },
    description:
      '奶油白釉面配细密深色斑点，杯身直筒、手柄圆润，350ml 容量适合咖啡、牛奶与日常饮水；釉下彩工艺可微波炉使用，放在办公桌或早餐桌上都很安静耐看。',
    selling_points: [
      '微斑点釉面，每只杯子的纹理略有差异',
      '350ml 日常容量，咖啡、牛奶、茶都合适',
      '釉下彩工艺，标注可微波炉使用',
    ],
    keywords: {
      core: ['陶瓷马克杯', '咖啡杯', '办公室水杯'],
      long_tail: ['女生高颜值水杯', '下午茶咖啡杯', '350ml带柄杯'],
      emotion: ['奶油风', '治愈', '仪式感'],
    },
    keywords_en: {
      core: ['ceramic mug', 'coffee cup', 'office mug'],
      long_tail: ['mug with handle', 'aesthetic mug', 'gift for her'],
      emotion: ['cozy', 'cream', 'handmade style'],
    },
    titles: {
      taobao: {
        flow: '奶油白陶瓷马克杯办公室咖啡杯带手柄水杯',
        convert: '手作感釉下彩马克杯350ml微波炉可用咖啡杯',
        longtail: '办公室下午茶奶油风陶瓷杯女生高颜值马克杯',
      },
      temu: {
        flow: 'Cream Speckled Ceramic Mug 12 oz Coffee Cup with Handle',
        convert: 'Handmade Style Glazed Mug 350 ml Microwave Safe Coffee Cup',
        longtail: 'Cute Cream Coffee Mug for Office Desk Aesthetic Gift for Her',
      },
    },
    temuZh: {
      flow: '奶油斑点陶瓷马克杯 12oz 带手柄咖啡杯',
      convert: '手作风格釉面马克杯 350ml 微波炉可用咖啡杯',
      longtail: '可爱奶油色办公桌咖啡杯 女生美学礼物',
    },
    amazonSuffix: 'for Home Office and Coffee Lovers',
    compliance: {
      notes: ['「手作感」描述的是风格；若为机器量产，详情页避免宣称纯手工。'],
    },
    image_quality: {
      score: 92,
      issues: ['杯口高光略强，可补一张 45° 侧拍展示内壁。'],
    },
  },
  {
    id: 'lamp',
    name: '复古黄铜可调光台灯',
    label: '黄铜台灯',
    category: '家居 · 灯具',
    file: '/samples/lamp.svg',
    accent: '#C08B45',
    brief: {
      category: '家居 / 灯具',
      brand: '',
      sellingPoints: '全铜灯体、三档旋钮调光、2700K 暖光、E27 灯口',
      audience: '中古风爱好者、卧室阅读人群',
    },
    product: {
      name: '复古黄铜三档调光台灯',
      category: '家居 / 灯具',
      category_path: ['家居', '灯具', '台灯'],
      summary:
        '做旧拉丝黄铜灯体配米白灯罩，旋钮三档调光；暖光落在床头或边几上，适合阅读与氛围照明。',
      attributes: [
        { name: '材质', value: '黄铜' },
        { name: '光色', value: '2700K 暖光' },
        { name: '调光', value: '三档旋钮' },
        { name: '灯口', value: 'E27' },
        { name: '高度', value: '约 45cm' },
      ],
      audience: ['中古风爱好者', '租房改造人群', '卧室阅读人群'],
      scenes: ['床头', '客厅边几', '书房'],
      visible_text: [],
      confidence: 0.9,
    },
    description:
      '做旧拉丝黄铜灯体配米白灯罩，旋钮三档调光，2700K 暖光落在床头或边几上；E27 通用灯口换灯泡方便，适合卧室阅读与中古风氛围照明。',
    selling_points: [
      '全铜灯体，表面做旧拉丝，使用后颜色会自然变深',
      '旋钮三档调光，床头阅读不刺眼',
      'E27 通用灯口，后续换灯泡方便',
    ],
    keywords: {
      core: ['黄铜台灯', '复古台灯', '床头灯'],
      long_tail: ['中古风氛围灯', '卧室阅读灯', '可调光台灯'],
      emotion: ['复古', '慵懒', '温暖'],
    },
    keywords_en: {
      core: ['brass table lamp', 'vintage lamp', 'bedside lamp'],
      long_tail: ['mid century lamp', 'dimmable desk lamp', 'reading lamp'],
      emotion: ['cozy', 'antique', 'warm'],
    },
    titles: {
      taobao: {
        flow: '复古黄铜台灯卧室床头灯暖光氛围灯可调光',
        convert: '全铜灯体复古台灯三档调光卧室阅读灯',
        longtail: '中古风黄铜台灯客厅边几氛围照明小夜灯',
      },
      temu: {
        flow: 'Vintage Brass Table Lamp Warm Light Bedside Reading Lamp',
        convert: 'Antique Style Desk Lamp with Dimmer for Bedroom Nightstand',
        longtail: 'Mid Century Brass Accent Lamp for Living Room Cozy Lighting',
      },
    },
    temuZh: {
      flow: '复古黄铜台灯 暖光床头阅读灯',
      convert: '做旧风格台灯 带调光 卧室床头柜灯',
      longtail: '中世纪黄铜氛围灯 客厅温馨照明',
    },
    amazonSuffix: 'for Bedroom Nightstand and Reading',
    compliance: {
      notes: ['若灯罩为布艺，请补充阻燃说明；黄铜氧化属正常现象，可在详情页说明。'],
    },
    image_quality: {
      score: 88,
      issues: ['背景较暗，主体轮廓清晰；建议补一张点亮状态图。'],
    },
  },
  {
    id: 'chair',
    name: '轻量便携户外折叠月亮椅',
    label: '露营月亮椅',
    category: '户外 · 露营',
    file: '/samples/chair.svg',
    accent: '#6F7D64',
    brief: {
      category: '户外 / 露营装备',
      brand: '',
      sellingPoints: '加粗钢管、承重 150kg、约 2.3kg、带收纳袋',
      audience: '露营新手、钓鱼爱好者、自驾野餐',
    },
    product: {
      name: '轻量便携户外折叠月亮椅',
      category: '户外 / 露营装备',
      category_path: ['户外', '露营', '折叠椅'],
      summary:
        '加粗钢管骨架配包裹式牛津布椅面，折叠后体积小；适合营地、公园野餐与后备箱随车携带。',
      attributes: [
        { name: '骨架', value: '加粗钢管' },
        { name: '承重', value: '150kg' },
        { name: '重量', value: '约 2.3kg' },
        { name: '面料', value: '牛津布' },
        { name: '收纳', value: '带收纳袋' },
      ],
      audience: ['露营新手', '钓鱼爱好者', '自驾野餐人群'],
      scenes: ['营地', '公园野餐', '后备箱'],
      visible_text: [],
      confidence: 0.91,
    },
    description:
      '加粗钢管骨架配包裹式牛津布椅面，约 2.3kg、承重 150kg，三秒展开，收起后可放进后备箱；适合营地、公园野餐和钓鱼，坐感稳定不硌背。',
    selling_points: [
      '3 秒展开，收起后可直接放进后备箱',
      '加粗钢管与交叉结构，坐感稳定',
      '包裹式椅面，久坐不硌背',
    ],
    keywords: {
      core: ['露营椅', '折叠椅', '月亮椅'],
      long_tail: ['便携钓鱼椅', '野餐折叠凳', '后备箱露营椅'],
      emotion: ['松弛感', '说走就走', '户外'],
    },
    keywords_en: {
      core: ['camping chair', 'folding chair', 'moon chair'],
      long_tail: ['portable camping chair', 'beach chair', 'fishing chair'],
      emotion: ['outdoor', 'lightweight', 'cozy'],
    },
    titles: {
      taobao: {
        flow: '户外折叠椅露营月亮椅便携钓鱼椅野餐躺椅',
        convert: '加粗钢管露营椅承重150kg便携收纳月亮椅',
        longtail: '轻量化露营折叠椅后备箱便携野餐椅子',
      },
      temu: {
        flow: 'Portable Folding Camping Chair Lightweight Moon Chair for Outdoor',
        convert: 'Heavy Duty Folding Chair 330 lb Capacity with Carry Bag',
        longtail: 'Compact Camping Moon Chair for Picnic Beach and Fishing',
      },
    },
    temuZh: {
      flow: '便携折叠露营椅 轻量户外月亮椅',
      convert: '加厚折叠椅 承重 150kg 带收纳袋',
      longtail: '紧凑露营月亮椅 野餐海滩钓鱼适用',
    },
    amazonSuffix: 'for Camping, Picnic and Beach',
    compliance: {
      notes: ['承重数据需与质检报告一致；不同批次请注明合理误差。'],
    },
    image_quality: {
      score: 90,
      issues: ['草地与椅腿颜色接近，建议换浅色地面重拍。'],
    },
  },
  {
    id: 'scarf',
    name: '美利奴羊毛纯色长围巾',
    label: '羊毛围巾',
    category: '服饰 · 配饰',
    file: '/samples/scarf.svg',
    accent: '#B36A4C',
    brief: {
      category: '服饰 / 围巾',
      brand: '',
      sellingPoints: '美利奴羊毛、200×35cm、加厚、礼盒装',
      audience: '通勤女性、节日送礼人群',
    },
    product: {
      name: '美利奴羊毛纯色长围巾',
      category: '服饰 / 围巾',
      category_path: ['服饰', '配饰', '围巾'],
      summary:
        '细密针织的纯色长围巾，200cm 长度可围可披；配同色礼盒，适合秋冬通勤与节日送礼。',
      attributes: [
        { name: '材质', value: '美利奴羊毛' },
        { name: '尺寸', value: '200 × 35cm' },
        { name: '厚度', value: '加厚' },
        { name: '颜色', value: '纯色' },
        { name: '包装', value: '礼盒装' },
      ],
      audience: ['通勤女性', '节日送礼人群'],
      scenes: ['秋冬通勤', '旅行', '节日送礼'],
      visible_text: [],
      confidence: 0.89,
    },
    description:
      '美利奴羊毛细密针织，200×35cm 长款可围可披，贴颈佩戴不扎；纯色设计配同色礼盒，适合秋冬通勤、旅行与节日送礼，颜色以实物为准。',
    selling_points: [
      '美利奴羊毛，贴颈佩戴不扎',
      '200cm 长款，可围可披',
      '同色礼盒，节日送礼不用再包装',
    ],
    keywords: {
      core: ['羊毛围巾', '女围巾', '保暖围巾'],
      long_tail: ['秋冬通勤围巾', '送礼围巾礼盒', '纯色羊毛披肩'],
      emotion: ['温柔', '高级感', '冬日'],
    },
    keywords_en: {
      core: ['wool scarf', 'winter scarf', 'scarf for women'],
      long_tail: ['merino wool scarf', 'gift box scarf', 'long wrap'],
      emotion: ['soft', 'warm', 'elegant'],
    },
    titles: {
      taobao: {
        flow: '100%羊毛围巾女秋冬加厚保暖纯色针织披肩',
        convert: '美利奴羊毛围巾亲肤不扎加厚保暖女款',
        longtail: '秋冬通勤纯色羊毛围巾送礼礼盒装女',
      },
      temu: {
        flow: 'Merino Wool Scarf for Women Soft Warm Winter Long Wrap',
        convert: '100% Wool Knit Scarf Thick Cozy Solid Color Shawl',
        longtail: 'Winter Wool Scarf Gift Box for Her Soft Long Neck Wrap',
      },
    },
    temuZh: {
      flow: '美利奴羊毛围巾 女款柔软保暖冬季长款披肩',
      convert: '100% 羊毛针织围巾 加厚保暖纯色披肩',
      longtail: '冬季羊毛围巾礼盒 女款柔软长款围脖',
    },
    amazonSuffix: 'for Women, Winter Gift Box',
    compliance: {
      notes: ['「100% 羊毛」成分宣称需与检测报告一致；礼盒颜色以实物为准。'],
    },
    image_quality: {
      score: 87,
      issues: ['绒面细节在缩略图下不明显，建议补一张微距。'],
    },
  },
];

export function listSamples() {
  return SAMPLES.map(({ id, name, label, category, file, accent, brief }) => ({
    id,
    name,
    label,
    category,
    file,
    accent,
    brief: { ...brief },
  }));
}

export function getSample(id) {
  return SAMPLES.find((sample) => sample.id === id) || null;
}

function titleCaseLoose(value) {
  return String(value || '')
    .split(/\s+/)
    .map((word) =>
      /^[A-Z0-9]/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

function adaptTitle(base, platformId, sample) {
  const platform = PLATFORMS[platformId];
  if (!base) return '';
  let text = base;
  if (platformId === 'pdd') text = `${base} 现货速发`;
  else if (platformId === 'douyin') text = `氛围感｜${base}`;
  else if (platformId === 'jd') text = base;
  else if (platformId === 'amazon') text = `${titleCaseLoose(base)} ${sample.amazonSuffix}`;
  return normalizeTitle(text, platform);
}

/**
 * 生成与视觉模型返回结构一致的演示数据，之后走同一套归一化与打分。
 */
export function buildDemoRaw({ sampleId, platforms, strategies }) {
  const sample = getSample(sampleId) || SAMPLES[0];
  const strategyIds = resolveStrategyIds(strategies);
  const platformIds = Array.isArray(platforms) && platforms.length ? platforms : ['taobao', 'temu'];
  const titles = [];

  for (const platformId of platformIds) {
    const platform = PLATFORMS[platformId];
    if (!platform) continue;
    const sourceSet = platform.lang === 'en' ? sample.titles.temu : sample.titles.taobao;
    for (const strategyId of strategyIds) {
      const base = sourceSet[strategyId] || sourceSet.flow;
      let text = adaptTitle(base, platformId, sample);
      if (strategyId === 'brand' && !sample.brief.brand) {
        text = adaptTitle(sourceSet.longtail || sourceSet.flow, platformId, sample);
      }
      const strategyLabel =
        strategyId === 'flow' ? '流量型' :
        strategyId === 'convert' ? '转化型' :
        strategyId === 'brand' ? '品牌型' : '长尾型';
      titles.push({
        platform: platformId,
        strategy: strategyLabel,
        text,
        translation:
          platform.lang === 'en'
            ? sample.temuZh?.[strategyId === 'brand' ? 'longtail' : strategyId] ||
              sample.temuZh?.flow ||
              ''
            : '',
        keywords:
          platform.lang === 'en'
            ? sample.keywords_en.core.slice(0, 3)
            : sample.keywords.core.slice(0, 3),
        reason: !['taobao', 'temu'].includes(platformId)
          ? '演示模式：由同语言示例标题按平台语气适配'
          : '演示模式：人工撰写的示例标题',
      });
    }
  }

  return {
    product: sample.product,
    description: sample.description,
    selling_points: sample.selling_points,
    keywords: sample.keywords,
    keywords_en: sample.keywords_en,
    titles,
    compliance: sample.compliance,
    image_quality: sample.image_quality,
    demo: true,
    demo_sample: sample.id,
    demo_note:
      platformIds.some((id) => !['taobao', 'temu'].includes(id))
        ? '演示数据：淘宝与 TEMU 标题为逐条撰写，其余平台由示例标题适配，仅用于体验流程。'
        : '演示数据：标题由人工撰写，用于体验完整流程；配置视觉模型后可识别你自己的商品图。',
  };
}

export function sampleBrief(sampleId) {
  const sample = getSample(sampleId);
  return sample ? { ...sample.brief } : null;
}

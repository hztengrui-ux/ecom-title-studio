import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectForbidden,
  gbkBytes,
  normalizeTitle,
  scoreTitle,
  titleKey,
} from '../lib/title.mjs';
import { normalizeResult, parseModelJson } from '../lib/normalize.mjs';
import { DEFAULT_RULES, RULE_GUIDE, migrateRules, normalizeRules } from '../lib/rules.mjs';
import { PLATFORMS } from '../lib/platforms.mjs';
import { buildPrompt, callVision, fastModeSupported } from '../lib/vision.mjs';
import { createServer } from 'node:http';

test('GBK 字节估算：中文 2 字节、ASCII 1 字节', () => {
  assert.equal(gbkBytes('abc'), 3);
  assert.equal(gbkBytes('马克杯'), 6);
  assert.equal(gbkBytes('mug杯'), 5);
});

test('中文标题超过 30 字时在分隔符处截断', () => {
  const text = '奶油白陶瓷马克杯办公室咖啡杯带手柄水杯情侣杯';
  const result = normalizeTitle(text, PLATFORMS.taobao);
  assert.ok(result.length <= 30);
  assert.ok(!/[，,、；;：:\s]$/.test(result));
});

test('英文标题按字符上限截断', () => {
  const text = 'Cream Speckled Ceramic Mug 12 oz Coffee Cup with Handle for Office and Home';
  const result = normalizeTitle(text, PLATFORMS.temu);
  assert.ok(result.length <= 120);
});

test('标题两侧的标签与引号会被清理', () => {
  assert.equal(
    normalizeTitle('标题1： “奶油白陶瓷马克杯” ', PLATFORMS.taobao),
    '奶油白陶瓷马克杯',
  );
});

test('极限词检测命中绝对化用语，但放过成分宣称', () => {
  const hits = detectForbidden('全网最低 100%羊毛 最好用');
  const terms = hits.map((hit) => hit.term);
  assert.ok(terms.includes('全网最低'));
  assert.ok(terms.includes('最好'));
  assert.equal(detectForbidden('100%羊毛围巾').length, 0);
  assert.ok(detectForbidden('100%有效').length > 0);
});

test('标题评分对关键词覆盖给出更高分', () => {
  const keywords = ['陶瓷马克杯', '咖啡杯', '办公室水杯'];
  const good = scoreTitle('奶油白陶瓷马克杯办公室咖啡杯', PLATFORMS.taobao, keywords, []);
  const weak = scoreTitle('好看的水杯', PLATFORMS.taobao, keywords, []);
  assert.ok(good.overall > weak.overall);
  assert.ok(good.keyword > weak.keyword);
});

test('去重键忽略空格与常见标点', () => {
  assert.equal(titleKey('奶油白 马克杯，350ml'), titleKey('奶油白马克杯350ml'));
});

test('从代码块与解释文字中提取 JSON', () => {
  const parsed = parseModelJson('好的，结果如下：\n```json\n{"product":{"name":"杯子"},"titles":[]}\n```');
  assert.equal(parsed.product.name, '杯子');
});

test('修复尾随逗号', () => {
  const parsed = parseModelJson('{"product":{"name":"杯子",},}');
  assert.equal(parsed.product.name, '杯子');
});

test('归一化会过滤未选平台、截断超长标题并计算字数', () => {
  const raw = {
    product: {
      name: '测试商品',
      category: '家居 / 杯具',
      attributes: [{ name: '材质', value: '陶瓷' }],
      confidence: 92,
    },
    selling_points: ['卖点一', '卖点二'],
    keywords: { core: ['陶瓷杯', '咖啡杯'], long_tail: ['办公室水杯'], emotion: ['奶油风'] },
    titles: [
      {
        platform: 'taobao',
        strategy: '流量型',
        text: '奶油白陶瓷咖啡杯办公室水杯带手柄超长标题不应该超过平台限制继续写继续写',
        reason: '核心词前置',
      },
      { platform: 'taobao', strategy: '转化型', text: '奶油白陶瓷咖啡杯办公室水杯' },
      { platform: 'temu', strategy: '流量型', text: 'Cream Ceramic Coffee Mug with Handle' },
      { platform: 'amazon', strategy: '流量型', text: 'This platform was not selected' },
    ],
    compliance: { forbidden: [], notes: ['注意成分'] },
    image_quality: { score: 90, issues: ['补侧拍'] },
  };

  const result = normalizeResult(raw, {
    platforms: ['taobao', 'temu'],
    strategies: ['flow', 'convert'],
    // 这个用例验证「过滤平台 / 截断字数」，故意要 3 条，不依赖默认值
    titlesPerPlatform: 3,
  });

  assert.equal(result.titles.length, 3);
  assert.ok(result.titles.every((title) => !['amazon'].includes(title.platform)));
  assert.ok(result.titles.filter((title) => title.platform === 'taobao').every((title) => title.chars <= 30));
  assert.equal(result.product.confidence, 0.92);
  assert.equal(result.titleCount, 3);
  assert.deepEqual(result.platformCounts, { taobao: 2, temu: 1 });
});

test('批量模式每平台只保留 1 条标题（省 token）', () => {
  const raw = {
    product: { name: '测试商品' },
    titles: [
      { platform: 'taobao', strategy: '流量型', text: '奶油白陶瓷咖啡杯办公室水杯' },
      { platform: 'taobao', strategy: '转化型', text: '奶油白陶瓷杯带手柄办公室水杯' },
      { platform: 'temu', strategy: '流量型', text: 'Cream Ceramic Coffee Mug with Handle' },
    ],
  };
  const result = normalizeResult(raw, {
    platforms: ['taobao', 'temu'],
    strategies: ['flow', 'convert'],
    titlesPerPlatform: 1,
  });
  assert.equal(result.titles.length, 2);
  assert.equal(result.titleCount, 2);
  assert.deepEqual(result.platformCounts, { taobao: 1, temu: 1 });
  assert.equal(result.titles.filter((title) => title.platform === 'taobao').length, 1);
});

test('默认每个平台只要求 1 条标题，单张与批量一致', () => {
  const batchPrompt = buildPrompt({
    brief: {},
    platforms: ['taobao', 'temu'],
    strategies: ['flow', 'convert', 'longtail'],
    titlesPerPlatform: 1,
  });
  assert.ok(batchPrompt.includes('每个平台只生成 1 条标题'));
  assert.ok(batchPrompt.includes('总共 2 条'));

  // 不传 titlesPerPlatform 时默认也是 1 条（单张模式省钱）
  const singlePrompt = buildPrompt({
    brief: {},
    platforms: ['taobao'],
    strategies: ['flow', 'convert', 'longtail'],
  });
  assert.ok(singlePrompt.includes('每个平台只生成 1 条标题'));
  assert.ok(singlePrompt.includes('总共 1 条'));
});

test('快速模式默认开启，可显式关闭', () => {
  assert.equal(DEFAULT_RULES.fastMode, true);
  assert.equal(normalizeRules({}).fastMode, true);
  assert.equal(normalizeRules({ fastMode: false }).fastMode, false);
  assert.equal(normalizeRules({ fastMode: true }).fastMode, true);
  // 旧模板没有这个字段时按开启处理（升级后默认省钱）
  assert.equal(normalizeRules({ rulesVersion: 2 }).fastMode, true);
});

test('快速模式只对认识 thinking 参数的服务开启', () => {
  assert.equal(fastModeSupported('https://api.deepseek.com/v1', 'deepseek-flash'), true);
  assert.equal(fastModeSupported('https://ark.cn-beijing.volces.com/api/v3', 'doubao-seed-1-6-vision'), true);
  assert.equal(fastModeSupported('https://api.openai.com/v1', 'gpt-4.1-mini'), false);
  assert.equal(fastModeSupported('https://open.bigmodel.cn/api/paas/v4', 'glm-4.5v'), false);
  assert.equal(fastModeSupported('不是URL', 'qwen-vl-max'), false);
  assert.equal(fastModeSupported('', 'deepseek-flash'), true);
});

test('快速模式请求体：DeepSeek 带 thinking disabled，关闭时与不支持的厂商都不带', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  const fake = (payload) => {
    calls.push(payload);
    return new Response(JSON.stringify({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: JSON.stringify({
            product: { name: '测试杯子' },
            titles: [{ platform: 'temu', strategy: '流量型', text: 'Cream Ceramic Mug for Office' }],
          }),
        },
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  globalThis.fetch = async (url, init) => fake(JSON.parse(init.body));
  const baseArgs = {
    image: 'data:image/png;base64,AAAA',
    brief: {},
    platforms: ['temu'],
    strategies: ['flow'],
    rules: {},
    titlesPerPlatform: 1,
  };
  try {
    await callVision({
      ...baseArgs,
      settings: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash', apiKey: 'k' },
      fastMode: true,
    });
    assert.equal(calls.at(-1).thinking?.type, 'disabled');

    await callVision({
      ...baseArgs,
      settings: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash', apiKey: 'k' },
      fastMode: false,
    });
    assert.equal(calls.at(-1).thinking, undefined);

    await callVision({
      ...baseArgs,
      settings: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKey: 'k' },
      fastMode: true,
    });
    assert.equal(calls.at(-1).thinking, undefined);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('自定义规则会约束标题长度、描述长度、禁用词与必含词', () => {
  const raw = {
    product: { name: '陶瓷咖啡杯', category: '家居 / 杯具' },
    description:
      '这是一段很长的商品描述，用来验证描述字数上限是否生效。它包含材质、场景、卖点和一些补充说明，应该被截断在设定范围内。',
    keywords: { core: ['陶瓷杯', '咖啡杯'] },
    titles: [
      {
        platform: 'taobao',
        strategy: '流量型',
        text: '超值咖啡杯',
      },
    ],
  };
  const result = normalizeResult(raw, {
    platforms: ['taobao'],
    strategies: ['flow'],
    rules: {
      titleMinZh: 12,
      titleMaxZh: 20,
      descriptionMin: 10,
      descriptionMax: 40,
      bannedWords: ['超值'],
      mustInclude: ['陶瓷'],
    },
  });
  const title = result.titles[0];
  assert.ok(title.chars <= 20);
  assert.equal(title.limit, 20);
  assert.equal(title.lengthOk, false);
  assert.ok(title.warnings.includes('超值'));
  assert.ok(title.missingRequired.includes('陶瓷'));
  assert.ok(result.description.chars <= 40);
  assert.equal(result.description.ok, true);
  assert.equal(result.rules.titleMaxZh, 20);
});

test('提示词会包含标题、描述、必含词、禁用词与关键词组合规则', () => {
  const prompt = buildPrompt({
    brief: { category: '家居 / 杯具' },
    platforms: ['taobao', 'temu'],
    strategies: ['flow'],
    rules: {
      titleMinZh: 14,
      titleMaxZh: 26,
      titleMinEn: 45,
      titleMaxEn: 110,
      descriptionMin: 70,
      descriptionMax: 130,
      mustInclude: ['陶瓷'],
      bannedWords: ['超值'],
      keywordCombos: ['品类 + 材质 + 场景'],
    },
  });
  assert.ok(prompt.includes('14–26 字'));
  assert.ok(prompt.includes('45–110 字符'));
  assert.ok(prompt.includes('70–130 字'));
  assert.ok(prompt.includes('必含关键词：陶瓷'));
  assert.ok(prompt.includes('自定义禁用词：超值'));
  assert.ok(prompt.includes('品类 + 材质 + 场景'));
  assert.ok(prompt.includes('"description"'));
});

test('标题前缀/后缀与中英对照会进入归一化结果', () => {
  const result = normalizeResult(
    {
      product: { name: '圣诞插画' },
      titles: [
        {
          platform: 'temu',
          strategy: '流量型',
          text: 'Christmas Santa Claus Reindeer Plaid Illustration',
          translation: '圣诞老人驯鹿格纹插画',
        },
      ],
    },
    {
      platforms: ['temu'],
      strategies: ['flow'],
      rules: { titlePrefix: 'Xmas ', titleSuffix: ' Print' },
    },
  );
  const title = result.titles[0];
  assert.ok(title.text.startsWith('Xmas '));
  assert.ok(title.text.endsWith(' Print'));
  assert.equal(title.translation, '圣诞老人驯鹿格纹插画');
});

test('长标题优先保留固定前缀与后缀，只压缩中间标题', () => {
  const prefix = '女士秋冬新款简约百搭开衫毛衣';
  const suffix = '宽松休闲长袖针织上衣，通勤日常内搭外穿皆可';
  const middle = '圣诞老人与驯鹿红黑格纹图案 '.repeat(12);
  const result = normalizeResult(
    {
      product: { name: '圣诞插画' },
      titles: [{
        platform: 'temu',
        strategy: '流量型',
        text: `${prefix} ${middle} ${suffix}`,
        translation: '圣诞插画',
      }],
    },
    {
      platforms: ['temu'],
      strategies: ['flow'],
      rules: {
        assetMode: true,
        targetCategory: 'generic',
        titlePrefix: prefix,
        titleSuffix: suffix,
      },
    },
  );
  const title = result.titles[0];
  assert.ok(title.text.startsWith(prefix));
  assert.ok(title.text.endsWith(suffix));
  assert.ok(title.text.split(prefix).length - 1 === 1);
  assert.ok(title.text.split(suffix).length - 1 === 1);
  assert.ok(title.chars <= title.limit);
});

test('素材模式会去掉家居/房间/品类词，只保留画面素材', () => {
  const result = normalizeResult(
    {
      product: {
        name: '暗黑哥特风蝙蝠与红花装饰画',
        category: '家居装饰 / 装饰画',
        summary: '适合客厅卧室墙面装饰',
      },
      description: '蝙蝠与红花插画，适合家居装饰、客厅卧室墙面。',
      keywords: {
        core: ['家居装饰', '蝙蝠插画'],
        long_tail: ['客厅装饰画'],
        emotion: ['暗黑哥特'],
      },
      titles: [{
        platform: 'temu',
        strategy: '流量型',
        text: 'Bat Wall Art Dark Gothic Floral Home Decor for Living Room Bedroom',
        translation: '蝙蝠墙面装饰画，适合家居装饰、客厅卧室',
      }],
    },
    { platforms: ['temu'], strategies: ['flow'] },
  );
  const title = result.titles[0];
  assert.ok(title.text.includes('Bat'));
  assert.ok(title.text.includes('Gothic'));
  assert.ok(!/home decor|living room|bedroom|wall art/i.test(title.text));
  assert.ok(!/家居|客厅|卧室|装饰画/.test(title.translation));
  assert.equal(result.product.category, '通用素材');
  assert.deepEqual(result.product.scenes, []);
});

test('标题和商品名不会出现通用/素材字样', () => {
  const result = normalizeResult(
    {
      product: { name: '圣诞图案素材', category: '图案素材' },
      description: '通用素材，圣诞老人图案。',
      titles: [{
        platform: 'temu',
        strategy: '流量型',
        text: 'Generic Asset Christmas Santa Claus Pattern',
        translation: '通用素材 圣诞老人图案',
      }],
    },
    { platforms: ['temu'], strategies: ['flow'] },
  );
  assert.ok(!/通用|素材/.test(result.product.name));
  assert.ok(!/通用|素材/.test(result.titles[0].text));
  assert.ok(!/通用|素材/.test(result.titles[0].translation));
  assert.ok(!/通用|素材/.test(result.description.text));
  assert.ok(/圣诞/.test(result.titles[0].translation));
});

test('选择目标类目后按该类目保留关键词', () => {
  const result = normalizeResult(
    {
      product: { name: '蝙蝠插画', category: '家居装饰 / 装饰画' },
      description: '蝙蝠与红花插画，适合家居装饰、客厅卧室。',
      titles: [{
        platform: 'temu',
        strategy: '流量型',
        text: 'Bat Wall Art Dark Gothic Floral Home Decor for Living Room Bedroom',
        translation: '蝙蝠墙面装饰画，适合客厅卧室',
      }],
    },
    {
      platforms: ['temu'],
      strategies: ['flow'],
      rules: { targetCategory: 'home' },
    },
  );
  const title = result.titles[0];
  assert.ok(/home decor|living room|bedroom/i.test(title.text));
  assert.equal(result.product.category, '家居 / 装饰画');
});

test('目标长度会受平台硬上限约束', () => {
  const rawTitle = 'A'.repeat(100);
  const result = normalizeResult(
    {
      product: { name: '测试商品' },
      titles: [{ platform: 'temu', strategy: '流量型', text: rawTitle }],
    },
    {
      platforms: ['temu'],
      strategies: ['flow'],
      rules: { targetLength: 50 },
    },
  );
  assert.equal(result.titles[0].limit, 50);
  assert.ok(result.titles[0].chars <= 50);
});

test('兼容服务拒绝 response_format 时会自动降级重试', async () => {
  let attempts = 0;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      attempts += 1;
      const payload = JSON.parse(body || '{}');
      if (payload.response_format) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'response format is not supported' } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { content: '{"product":{"name":"mock"},"titles":[]}' } }],
      }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const result = await callVision({
      image: 'data:image/jpeg;base64,AAAA',
      brief: {},
      platforms: ['taobao'],
      strategies: ['flow'],
      settings: {
        baseUrl: `http://127.0.0.1:${port}/v1`,
        model: 'mock-vision',
        apiKey: 'test-key',
      },
    });
    assert.equal(result.raw.product.name, 'mock');
    assert.equal(attempts, 2);
  } finally {
    server.close();
  }
});

test('content 为空但 reasoning_content 有 JSON 时会回退读取', async () => {
  const server = createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{
          finish_reason: 'stop',
          message: {
            content: '',
            reasoning_content: '{"product":{"name":"reasoning-mock"},"titles":[]}',
          },
        }],
      }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const result = await callVision({
      image: 'data:image/jpeg;base64,AAAA',
      brief: {},
      platforms: ['taobao'],
      strategies: ['flow'],
      settings: {
        baseUrl: `http://127.0.0.1:${port}/v1`,
        model: 'mock-vision',
        apiKey: 'test-key',
      },
    });
    assert.equal(result.raw.product.name, 'reasoning-mock');
  } finally {
    server.close();
  }
});

test('200 但 content 为空时会去掉 JSON Mode 重试一次', async () => {
  let attempts = 0;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      attempts += 1;
      const payload = JSON.parse(body || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (payload.response_format) {
        res.end(JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: '' } }],
        }));
        return;
      }
      res.end(JSON.stringify({
        choices: [{
          finish_reason: 'stop',
          message: { content: '{"product":{"name":"empty-retry-mock"},"titles":[]}' },
        }],
      }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const result = await callVision({
      image: 'data:image/jpeg;base64,AAAA',
      brief: {},
      platforms: ['taobao'],
      strategies: ['flow'],
      settings: {
        baseUrl: `http://127.0.0.1:${port}/v1`,
        model: 'mock-vision',
        apiKey: 'test-key',
      },
    });
    assert.equal(result.raw.product.name, 'empty-retry-mock');
    assert.equal(attempts, 2);
  } finally {
    server.close();
  }
});

test('模型只返回一个平台时不会凭空补标题', () => {
  const result = normalizeResult(
    {
      product: { name: '测试' },
      keywords: { core: ['杯子'] },
      titles: [{ platform: 'taobao', strategy: '流量型', text: '陶瓷杯子' }],
    },
    { platforms: ['taobao', 'temu'], strategies: ['flow'] },
  );
  assert.equal(result.titles.length, 1);
  assert.equal(result.platformCounts.temu, 0);
});

test('描述下限默认值是 40，上限仍为 120', () => {
  assert.equal(DEFAULT_RULES.descriptionMin, 40);
  assert.equal(DEFAULT_RULES.descriptionMax, 120);
  assert.equal(RULE_GUIDE.description.recommendedMin, DEFAULT_RULES.descriptionMin);
});

test('旧版 60/120 描述区间会自动升级到 40/120，用户自定义区间保持不动', () => {
  const migrated = normalizeRules(migrateRules({ descriptionMin: 60, descriptionMax: 120 }));
  assert.equal(migrated.descriptionMin, 40);
  assert.equal(migrated.descriptionMax, 120);

  const custom = normalizeRules(migrateRules({ descriptionMin: 90, descriptionMax: 160 }));
  assert.equal(custom.descriptionMin, 90);
  assert.equal(custom.descriptionMax, 160);

  const alreadyNew = normalizeRules(migrateRules({ rulesVersion: 2, descriptionMin: 60, descriptionMax: 120 }));
  assert.equal(alreadyNew.descriptionMin, 60);
});

test('下限等于或超过上限时会自动拉开区间', () => {
  const equal = normalizeRules({ titleMinZh: 20, titleMaxZh: 20, keywordMin: 5, keywordMax: 5 });
  assert.ok(equal.titleMinZh < equal.titleMaxZh);
  assert.ok(equal.keywordMin < equal.keywordMax);
  assert.equal(equal.titleMaxZh, 20);
  assert.equal(equal.keywordMax, 5);

  const reversed = normalizeRules({ descriptionMin: 120, descriptionMax: 80 });
  assert.equal(reversed.descriptionMin, 80);
  assert.equal(reversed.descriptionMax, 120);
});

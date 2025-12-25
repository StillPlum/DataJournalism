/* global Plotly */
const fmt = {
  piecesB: (x) => `${x.toFixed(1)} 亿件`,
  yuanB: (x) => `${x.toFixed(1)} 亿元`,
  pct: (x) => `${x.toFixed(1)}%`,
};

const state = {
  data: null,
  region: null,
  selectedProvince: null,
};

function rankOf(metricKey, provinceName) {
  const sorted = [...state.data.provinces].sort((a, b) => b[metricKey] - a[metricKey]);
  const idx = sorted.findIndex(d => d.province === provinceName);
  return idx >= 0 ? idx + 1 : null;
}

function fmtByKey(metricKey, value) {
  const { formatter } = byMetricKey(metricKey);
  return formatter(value);
}

async function loadData() {
  const [prov, region] = await Promise.all([
    fetch('data/province_2024.json').then(r => r.json()),
    fetch('data/region_share.json').then(r => r.json()),
  ]);
  state.data = prov;
  state.region = region;
}

function byMetricKey(key) {
  const label = {
    volume_billion: '快递业务量（亿件）',
    volume_yoy_pct: '业务量同比（%）',
    revenue_billion_yuan: '快递业务收入（亿元）',
    revenue_yoy_pct: '收入同比（%）',
  }[key];
  const formatter = {
    volume_billion: fmt.piecesB,
    volume_yoy_pct: fmt.pct,
    revenue_billion_yuan: fmt.yuanB,
    revenue_yoy_pct: fmt.pct,
  }[key];
  return { label, formatter };
}

function setCards(p) {
  const nat = state.data.national;

  document.getElementById('nationalVolume').textContent = fmt.piecesB(nat.volume_billion);
  document.getElementById('nationalVolumeYoy').textContent = `同比 ${fmt.pct(nat.volume_yoy_pct)}`;

  document.getElementById('selProvinceName').textContent = p.province;
  document.getElementById('selProvinceName2').textContent = p.province;

  document.getElementById('selVolume').textContent = fmt.piecesB(p.volume_billion);
  const share = (p.volume_billion / nat.volume_billion) * 100;
  document.getElementById('selVolumeMeta').textContent =
    `同比 ${fmt.pct(p.volume_yoy_pct)} · 占全国 ${share.toFixed(2)}%`;

  document.getElementById('selRevenue').textContent = fmt.yuanB(p.revenue_billion_yuan);
  document.getElementById('selRevenueMeta').textContent =
    `同比 ${fmt.pct(p.revenue_yoy_pct)}`;
}

function renderProvinceChart(metricKey) {
  const { label, formatter } = byMetricKey(metricKey);
  const data = [...state.data.provinces].sort((a,b) => b[metricKey] - a[metricKey]);

  const x = data.map(d => d[metricKey]);
  const y = data.map(d => d.province);

  // highlight selected
  const colors = data.map(d => d.province === state.selectedProvince ? 'rgba(125,211,252,.95)' : 'rgba(160,180,200,.55)');

  const customdata = x.map(v => formatter(v));

  const trace = {
    type: 'bar',
    orientation: 'h',
    x, y,
    marker: { color: colors },
    customdata,
    hovertemplate: `%{y}<br>${label}：%{customdata}<extra></extra>`,
  };

  const layout = {
    margin: { l: 70, r: 20, t: 10, b: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    xaxis: { title: label, gridcolor: 'rgba(255,255,255,.06)', zerolinecolor: 'rgba(255,255,255,.06)' },
    yaxis: { automargin: true },
    height: Math.max(420, 18 * y.length + 120),
  };

  Plotly.react('chartProvince', [trace], layout, {displayModeBar: false, responsive: true});

  const chartDiv = document.getElementById('chartProvince');
  chartDiv.on('plotly_click', (ev) => {
    const p = ev.points?.[0]?.y;
    if (!p) return;
    setSelectedProvince(p);
  });
}

function renderTopChart(metricKey) {
  const { label, formatter } = byMetricKey(metricKey);
  const top = [...state.data.provinces]
    .sort((a, b) => b[metricKey] - a[metricKey])
    .slice(0, 10);

  const x = top.map(d => d[metricKey]);
  const y = top.map(d => d.province);
  const colors = top.map(d => d.province === state.selectedProvince ? 'rgba(125,211,252,.95)' : 'rgba(160,180,200,.55)');
  const customdata = x.map(v => formatter(v));

  const trace = {
    type: 'bar',
    orientation: 'h',
    x, y,
    marker: { color: colors },
    customdata,
    hovertemplate: `%{y}<br>${label}：%{customdata}<extra></extra>`,
  };

  const layout = {
    margin: { l: 70, r: 20, t: 10, b: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    xaxis: { title: label, gridcolor: 'rgba(255,255,255,.06)', zerolinecolor: 'rgba(255,255,255,.06)' },
    yaxis: { automargin: true },
    height: 420,
  };

  Plotly.react('chartGrowth', [trace], layout, { displayModeBar: false, responsive: true });

  const chartDiv = document.getElementById('chartGrowth');
  chartDiv.on('plotly_click', (ev) => {
    const p = ev.points?.[0]?.y;
    if (!p) return;
    setSelectedProvince(p);
  });
}

function renderRegionTrend() {
  const years = state.region.map(d => d.year);
  const east = state.region.map(d => d.east);
  const central = state.region.map(d => d.central);
  const west = state.region.map(d => d.west);

  const traces = [
    { type:'scatter', mode:'lines+markers', name:'东部', x:years, y:east, hovertemplate:'%{x}：%{y}%<extra></extra>'},
    { type:'scatter', mode:'lines+markers', name:'中部', x:years, y:central, hovertemplate:'%{x}：%{y}%<extra></extra>'},
    { type:'scatter', mode:'lines+markers', name:'西部', x:years, y:west, hovertemplate:'%{x}：%{y}%<extra></extra>'},
  ];

  const layout = {
    margin: { l: 60, r: 20, t: 10, b: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    xaxis: { title:'年份', gridcolor:'rgba(255,255,255,.06)', zerolinecolor:'rgba(255,255,255,.06)' },
    yaxis: { title:'业务量占比（%）', rangemode:'tozero', gridcolor:'rgba(255,255,255,.06)', zerolinecolor:'rgba(255,255,255,.06)' },
    height: 420,
    legend: { orientation: 'h', y: 1.1, x: 0 },
  };

  Plotly.react('chartRegion', traces, layout, {displayModeBar: false, responsive: true});
}

function setSelectedProvince(name) {
  state.selectedProvince = name;
  const p = state.data.provinces.find(d => d.province === name) || state.data.provinces[0];
  setCards(p);

  // keep select in sync
  const provSel = document.getElementById('provinceSelect');
  if (provSel && provSel.value !== p.province) provSel.value = p.province;

  // auto summary sentence
  const nat = state.data.national;
  const share = (p.volume_billion / nat.volume_billion) * 100;
  const rankVol = rankOf('volume_billion', p.province);
  const rankYoY = rankOf('volume_yoy_pct', p.province);
  const rankRev = rankOf('revenue_billion_yuan', p.province);
  const summary = `【${p.province}】业务量 ${fmt.piecesB(p.volume_billion)}（第${rankVol}，占全国${share.toFixed(2)}%），同比 ${fmt.pct(p.volume_yoy_pct)}（第${rankYoY}）；收入 ${fmt.yuanB(p.revenue_billion_yuan)}（第${rankRev}），同比 ${fmt.pct(p.revenue_yoy_pct)}。`;
  const el = document.getElementById('autoSummary');
  if (el) el.textContent = summary;

  // hero meta (national + region shares 2024)
  const r2024 = state.region.find(d => d.year === 2024) || state.region[state.region.length - 1];
  const hero = document.getElementById('heroMeta');
  if (hero && r2024) {
    hero.textContent = `2024 全国：${fmt.piecesB(nat.volume_billion)}（同比${fmt.pct(nat.volume_yoy_pct)}）；东/中/西部占比：${r2024.east}% / ${r2024.central}% / ${r2024.west}%。`;
  }

  const metricKey = document.getElementById('metricSelect').value;
  renderProvinceChart(metricKey);

  const topKey = document.getElementById('topSelect')?.value || 'volume_yoy_pct';
  renderTopChart(topKey);
}

function initControls() {
  const provSel = document.getElementById('provinceSelect');
  provSel.innerHTML = state.data.provinces.map(p => `<option value="${p.province}">${p.province}</option>`).join('');
  provSel.addEventListener('change', () => setSelectedProvince(provSel.value));

  const provSearch = document.getElementById('provinceSearch');
  if (provSearch) {
    provSearch.addEventListener('input', () => {
      const q = (provSearch.value || '').trim();
      if (!q) return;
      const hit = state.data.provinces.find(p => p.province.includes(q));
      if (hit) setSelectedProvince(hit.province);
    });
  }

  const metricSel = document.getElementById('metricSelect');
  metricSel.addEventListener('change', () => {
    renderProvinceChart(metricSel.value);
    if (state.selectedProvince) setSelectedProvince(state.selectedProvince);
  });

  const topSel = document.getElementById('topSelect');
  if (topSel) topSel.addEventListener('change', () => renderTopChart(topSel.value));
}

async function main() {
  await loadData();
  initControls();

  // default: pick the top-volume province
  const top = [...state.data.provinces].sort((a,b) => b.volume_billion - a.volume_billion)[0];
  document.getElementById('provinceSelect').value = top.province;

  renderRegionTrend();
  setSelectedProvince(top.province);
}

main().catch(err => {
  console.error(err);
  document.body.innerHTML = '<div style="padding:24px;color:#e6edf3">加载失败：请在 GitHub Pages 或本地 HTTP 服务中打开（不要直接双击打开 HTML）。</div>';
});

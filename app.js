/* global Plotly */

// 格式化工具
const fmt = {
  piecesB: (x) => `${x.toFixed(2)}`, // 去掉单位，在UI中处理
  yuanB: (x) => `${x.toFixed(1)}`,
  pct: (x) => `${x.toFixed(1)}%`,
};

const state = {
  data: null,
  region: null,
  selectedProvince: null,
};

// 辅助函数：获取排名
function rankOf(metricKey, provinceName) {
  const sorted = [...state.data.provinces].sort((a, b) => b[metricKey] - a[metricKey]);
  const idx = sorted.findIndex(d => d.province === provinceName);
  return idx >= 0 ? idx + 1 : null;
}

// 辅助函数：图表配置
function getChartLayout(titleX, titleY) {
  return {
    margin: { l: 80, r: 30, t: 30, b: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#94a3b8', family: '-apple-system, sans-serif' },
    xaxis: { 
      title: titleX, 
      gridcolor: 'rgba(255,255,255,0.05)', 
      zerolinecolor: 'rgba(255,255,255,0.1)' 
    },
    yaxis: { 
      automargin: true,
      gridcolor: 'rgba(255,255,255,0.05)'
    },
    barcorner: 4,
  };
}

async function loadData() {
  try {
    const [prov, region] = await Promise.all([
      fetch('data/province_2024.json').then(r => r.json()),
      fetch('data/region_share.json').then(r => r.json()),
    ]);
    state.data = prov;
    state.region = region;
  } catch (e) {
    console.error("Data Load Error", e);
    alert("数据加载失败，请确保通过本地服务器或 GitHub Pages 访问。");
  }
}

function updateCards(p) {
  const nat = state.data.national;
  const share = (p.volume_billion / nat.volume_billion) * 100;
  
  // 全国卡片
  document.getElementById('nationalVolume').innerHTML = 
    `${fmt.piecesB(nat.volume_billion)} <span style="font-size:14px;color:#94a3b8">亿件</span>`;
  document.getElementById('nationalVolumeYoy').textContent = 
    `同比增长 ${fmt.pct(nat.volume_yoy_pct)}`;

  // 省份卡片
  document.getElementById('selProvinceName').textContent = p.province;
  document.getElementById('selProvinceName2').textContent = p.province;

  document.getElementById('selVolume').innerHTML = 
    `${fmt.piecesB(p.volume_billion)} <span style="font-size:14px;color:#94a3b8">亿件</span>`;
  document.getElementById('selVolumeMeta').innerHTML =
    `<span style="color:${p.volume_yoy_pct > nat.volume_yoy_pct ? '#facc15' : '#94a3b8'}">同比 ${p.volume_yoy_pct > 0 ? '+' : ''}${fmt.pct(p.volume_yoy_pct)}</span> · 贡献全国 ${share.toFixed(1)}%`;

  document.getElementById('selRevenue').innerHTML = 
    `${fmt.yuanB(p.revenue_billion_yuan)} <span style="font-size:14px;color:#94a3b8">亿元</span>`;
  document.getElementById('selRevenueMeta').innerHTML =
    `同比 ${p.revenue_yoy_pct > 0 ? '+' : ''}${fmt.pct(p.revenue_yoy_pct)}`;
}

function generateNarrative(p) {
  const nat = state.data.national;
  const rankVol = rankOf('volume_billion', p.province);
  const rankYoY = rankOf('volume_yoy_pct', p.province);
  
  let tone = "";
  if (rankVol <= 3) tone = "作为全国快递重镇，";
  else if (p.volume_yoy_pct > 30) tone = "作为快速崛起的黑马，";
  
  const compareNat = p.volume_yoy_pct > nat.volume_yoy_pct 
    ? `跑赢全国大盘（${nat.volume_yoy_pct}%）` 
    : `低于全国平均增速`;

  const html = `
    <strong>${tone}【${p.province}】</strong> 2024年快递业务量达到 <span class="highlight-num">${fmt.piecesB(p.volume_billion)}亿件</span>，
    在全国排名第 <span class="highlight-num">${rankVol}</span> 位。
    <br><br>
    这一年，该省业务量同比增长 <span class="highlight-num">${fmt.pct(p.volume_yoy_pct)}</span>，
    增速排名第 ${rankYoY} 位，${compareNat}。
    无论是规模还是活力，数据都反映出当地电商与物流产业的最新温差。
  `;
  
  document.getElementById('autoSummary').innerHTML = html;
}

function renderCharts() {
  const metricKey = document.getElementById('metricSelect').value;
  const topKey = document.getElementById('topSelect').value;
  
  // 1. 省份排名图
  const pData = [...state.data.provinces].sort((a,b) => b[metricKey] - a[metricKey]);
  const x = pData.map(d => d[metricKey]);
  const y = pData.map(d => d.province);
  // 高亮选中颜色
  const colors = pData.map(d => d.province === state.selectedProvince ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)');
  
  const trace1 = {
    type: 'bar', orientation: 'h',
    x, y,
    marker: { color: colors, opacity: 0.9, line: { width:0 } },
    hovertemplate: `%{y}: %{x}<extra></extra>`
  };
  
  const layout1 = getChartLayout('', '');
  layout1.height = Math.max(500, y.length * 25);
  layout1.margin.l = 70;
  
  Plotly.react('chartProvince', [trace1], layout1, {displayModeBar: false, responsive: true});
  
  // 绑定点击事件
  document.getElementById('chartProvince').on('plotly_click', data => {
    const clickedProv = data.points[0].y;
    setSelectedProvince(clickedProv);
  });

  // 2. Top 10 图
  const topData = [...state.data.provinces].sort((a, b) => b[topKey] - a[topKey]).slice(0, 10);
  const trace2 = {
    type: 'bar', orientation: 'h',
    x: topData.map(d => d[topKey]),
    y: topData.map(d => d.province),
    marker: { color: '#818cf8' }, // 不同的颜色
    text: topData.map(d => d[topKey].toFixed(1)),
    textposition: 'auto',
    hovertemplate: `%{y}: %{x}<extra></extra>`
  };
  Plotly.react('chartGrowth', [trace2], getChartLayout('', ''), {displayModeBar: false, responsive: true});

  // 3. 区域趋势图 (只渲染一次，或者不需要重新排序)
  // 如果尚未初始化，则不重复渲染以免浪费性能，这里简化处理直接重绘
  const years = state.region.map(d => d.year);
  const traceRegion = [
    { name:'东部', x:years, y:state.region.map(d=>d.east), type:'scatter', mode:'lines+markers', line:{color:'#38bdf8'} },
    { name:'中部', x:years, y:state.region.map(d=>d.central), type:'scatter', mode:'lines+markers', line:{color:'#facc15'} },
    { name:'西部', x:years, y:state.region.map(d=>d.west), type:'scatter', mode:'lines+markers', line:{color:'#f472b6'} },
  ];
  const layout3 = getChartLayout('年份', '占比 (%)');
  layout3.legend = { orientation: 'h', y: 1.1 };
  Plotly.react('chartRegion', traceRegion, layout3, {displayModeBar: false, responsive: true});
}

function setSelectedProvince(name) {
  state.selectedProvince = name;
  const p = state.data.provinces.find(d => d.province === name) || state.data.provinces[0];
  
  // 同步下拉框
  document.getElementById('provinceSelect').value = p.province;
  
  updateCards(p);
  generateNarrative(p);
  renderCharts(); // 重绘图表以更新高亮
}

async function init() {
  await loadData();
  
  // 填充下拉框
  const sel = document.getElementById('provinceSelect');
  sel.innerHTML = state.data.provinces.map(p => `<option value="${p.province}">${p.province}</option>`).join('');
  
  // 绑定事件
  sel.addEventListener('change', (e) => setSelectedProvince(e.target.value));
  document.getElementById('provinceSearch').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    const hit = state.data.provinces.find(p => p.province.includes(val));
    if (hit) setSelectedProvince(hit.province);
  });
  document.getElementById('metricSelect').addEventListener('change', renderCharts);
  document.getElementById('topSelect').addEventListener('change', renderCharts);

  // 默认选中量最大的省
  const topProv = [...state.data.provinces].sort((a,b) => b.volume_billion - a.volume_billion)[0];
  setSelectedProvince(topProv.province);
}

init();

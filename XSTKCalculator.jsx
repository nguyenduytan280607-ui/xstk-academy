import React, { useMemo, useState } from 'react';
import { Calculator, Sigma, Info, RotateCcw } from 'lucide-react';
import katex from 'katex';

const phi = z => { // Abramowitz–Stegun approximation, |error| < 8e-8
  const x = Math.abs(z), t = 1 / (1 + 0.2316419 * x);
  const density = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const tail = density * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
};
const invPhi = p => { let lo = -9, hi = 9; for(let i=0;i<80;i++){const mid=(lo+hi)/2; if(phi(mid)<p)lo=mid;else hi=mid;} return (lo+hi)/2; };
const num = (x, digits=6) => Number.isFinite(x) ? x.toLocaleString('vi-VN',{maximumFractionDigits:digits}) : '—';
const tex = (s, block=false) => { try { return {__html:katex.renderToString(s,{displayMode:block,throwOnError:false,strict:'ignore'})}; } catch { return {__html:s}; } };
function Formula({value,block=false}) { return <span className={block?'xc-math-block':'xc-math'} dangerouslySetInnerHTML={tex(value,block)}/>; }
const Field=({label,value,onChange,step='any',min,max,help})=><label className="xc-field"><span>{label}</span><input type="number" step={step} min={min} max={max} value={value} onChange={e=>onChange(e.target.value)} />{help&&<small>{help}</small>}</label>;
function BellChart({mu,sigma,a,b,kind}) {
  const W=680,H=260,L=35,R=18,T=18,B=35;
  const lo=mu-4*sigma, hi=mu+4*sigma, plotW=W-L-R, base=H-B, peak=1/(sigma*Math.sqrt(2*Math.PI));
  const x=v=>L+(v-lo)/(hi-lo)*plotW;
  const y=v=>base-(Math.exp(-0.5*((v-mu)/sigma)**2)/(sigma*Math.sqrt(2*Math.PI)))/peak*(base-T-12);
  const path=Array.from({length:241},(_,i)=>{const v=lo+(hi-lo)*i/240;return `${i?'L':'M'}${x(v).toFixed(2)},${y(v).toFixed(2)}`;}).join(' ');
  const inRegion=v=>kind==='left'?v<=a:kind==='right'?v>=a:v>=a&&v<=b;
  const segments=[]; let current=[];
  for(let i=0;i<=400;i++){const v=lo+(hi-lo)*i/400;if(inRegion(v))current.push([x(v),y(v)]);else if(current.length){segments.push(current);current=[];}}
  if(current.length)segments.push(current);
  const shaded=segments.map((pts,i)=>`M${pts[0][0]},${base} `+pts.map(p=>`L${p[0]},${p[1]}`).join(' ')+` L${pts[pts.length-1][0]},${base} Z`);
  return <svg className="xc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Đồ thị phân phối chuẩn, vùng tô thể hiện xác suất cần tìm"><line x1={L} y1={base} x2={W-R} y2={base} stroke="#9cacc1" strokeWidth="1.5"/>{shaded.map((d,i)=><path key={i} d={d} fill="#2a88ca" fillOpacity=".32"/>)}<path d={path} fill="none" stroke="#0c477e" strokeWidth="3"/>{[mu-3*sigma,mu-2*sigma,mu-sigma,mu,mu+sigma,mu+2*sigma,mu+3*sigma].map((v,i)=><g key={i}><line x1={x(v)} y1={base} x2={x(v)} y2={base+6} stroke="#8a9ab0"/><text x={x(v)} y={base+21} fontSize="11" fill="#586b80" textAnchor="middle">{num(v,2)}</text></g>)}{[a,...(kind==='between'?[b]:[])].filter(v=>v>=lo&&v<=hi).map((v,i)=><line key={i} x1={x(v)} y1={y(v)} x2={x(v)} y2={base} stroke="#d21d43" strokeWidth="2" strokeDasharray="5 4"/>)}</svg>;
}
function Bars({data,selected}) {const W=680,H=235,L=28,R=16,B=34,T=12,max=Math.max(...data.map(d=>d.p),.01),bw=(W-L-R)/data.length;return <svg className="xc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ xác suất theo số lần xuất hiện"><line x1={L} y1={H-B} x2={W-R} y2={H-B} stroke="#9cacc1"/>{data.map((d,i)=>{const h=d.p/max*(H-B-T),xx=L+i*bw+2;return <g key={d.k}><rect x={xx} y={H-B-h} width={Math.max(1,bw-4)} height={h} rx="3" fill={selected(d.k)?'#d21d43':'#71a9d5'}/>{(data.length<=22||i%Math.ceil(data.length/16)===0)&&<text x={xx+(bw-4)/2} y={H-12} fontSize="11" textAnchor="middle" fill="#5a6b7e">{d.k}</text>}</g>})}</svg>}
const factorialLog=n=>{let a=0;for(let i=2;i<=n;i++)a+=Math.log(i);return a;};
const binom=(n,k,p)=>k<0||k>n?0:(p===0?(k===0?1:0):p===1?(k===n?1:0):Math.exp(factorialLog(n)-factorialLog(k)-factorialLog(n-k)+k*Math.log(p)+(n-k)*Math.log1p(-p)));
const poisson=(k,lambda)=>k<0?0:lambda===0?(k===0?1:0):Math.exp(-lambda+k*Math.log(lambda)-factorialLog(k));
export default function XSTKCalculator(){
 const [mode,setMode]=useState('normal'); const [mu,setMu]=useState('80'),[sigma,setSigma]=useState('10'),[a,setA]=useState('95'),[b,setB]=useState('105'),[region,setRegion]=useState('left');
 const [lam,setLam]=useState('3'),[n,setN]=useState('10'),[prob,setProb]=useState('0.3'),[k,setK]=useState('2'),[discreteMode,setDiscreteMode]=useState('exact');
 const [mean,setMean]=useState('80'),[sd,setSd]=useState('12'),[sample,setSample]=useState('36'),[confidence,setConfidence]=useState('0.95');
 const result=useMemo(()=>{
  const m=Number(mu),s=Number(sigma),av=Number(a),bv=Number(b),lambda=Number(lam),N=Number(n),P=Number(prob),K=Number(k),xbar=Number(mean),S=Number(sd),sampleN=Number(sample),conf=Number(confidence);
  if(mode==='normal'){
   if(![m,s,av,bv].every(Number.isFinite)||s<=0)return {error:'Độ lệch chuẩn σ phải lớn hơn 0 và các ô phải là số hợp lệ.'};
   if(region==='between'&&av>bv)return {error:'Giới hạn dưới phải nhỏ hơn hoặc bằng giới hạn trên.'};
   const za=(av-m)/s,zb=(bv-m)/s; const answer=region==='left'?phi(za):region==='right'?1-phi(za):phi(zb)-phi(za);
   return {answer,formula:region==='left'?String.raw`P(X\le ${av})=\Phi(${num(za,4)})`:region==='right'?String.raw`P(X\ge ${av})=1-\Phi(${num(za,4)})`:String.raw`P(${av}\le X\le ${bv})=\Phi(${num(zb,4)})-\Phi(${num(za,4)})`,steps:[`Chuẩn hóa: z = (x − ${num(m)}) / ${num(s)}.`,`Với x = ${num(av)}, z = ${num(za,4)}.`,...(region==='between'?[`Với x = ${num(bv)}, z = ${num(zb,4)}.`]:[]),'Tra bảng chuẩn tích lũy Φ(z). Nếu bảng chỉ có z dương, dùng Φ(−z) = 1 − Φ(z).'],chart:<BellChart mu={m} sigma={s} a={av} b={bv} kind={region}/>};
  }
  if(mode==='poisson'||mode==='binomial'){
   if(!Number.isInteger(K)||K<0||K>500)return {error:'k phải là số nguyên từ 0 đến 500.'};
   if(mode==='poisson'&&(!Number.isFinite(lambda)||lambda<0||lambda>500))return {error:'λ phải nằm trong khoảng 0 đến 500.'};
   if(mode==='binomial'&&(!Number.isInteger(N)||N<1||N>500||!Number.isFinite(P)||P<0||P>1))return {error:'n phải là số nguyên từ 1 đến 500; p từ 0 đến 1.'};
   const pmf=mode==='poisson'?i=>poisson(i,lambda):i=>binom(N,i,P);
   const maxK=mode==='poisson'?Math.min(500,Math.max(K+5,Math.ceil(lambda+5*Math.sqrt(lambda+1)))):N;
   if(mode==='binomial'&&K>N&&discreteMode==='exact')return {answer:0,steps:['k lớn hơn n nên xác suất bằng 0.']};
   let answer=0;
   if(discreteMode==='exact')answer=pmf(K);
   else if(discreteMode==='atmost'){for(let i=0;i<=Math.min(K,maxK);i++)answer+=pmf(i);}
   else {let cdf=0;for(let i=0;i<K;i++)cdf+=pmf(i);answer=1-cdf;}
   answer=Math.max(0,Math.min(1,answer));
   const label=discreteMode==='exact'?'P(X=k)':discreteMode==='atmost'?'P(X≤k)':'P(X≥k)';
   const f=mode==='poisson'?String.raw`P(X=k)=\frac{e^{-\lambda}\lambda^k}{k!}`:String.raw`P(X=k)=\binom{n}{k}p^k(1-p)^{n-k}`;
   const maxBars=Math.min(maxK,Math.max(20,K+5));const data=Array.from({length:maxBars+1},(_,i)=>({k:i,p:pmf(i)}));
   return {answer,formula:f,steps:[mode==='poisson'?`X ~ Poisson(λ = ${num(lambda)}).`:`X ~ Binomial(n = ${N}, p = ${num(P)}).`,`Yêu cầu ${label.replace('k',String(K))}.`,discreteMode==='exact'?'Thay k vào công thức xác suất điểm.':discreteMode==='atmost'?`Cộng P(X=i) từ i = 0 đến ${K}.`:`Lấy 1 − P(X≤${K-1}) (quy tắc biến cố đối).`],chart:<Bars data={data} selected={v=>discreteMode==='exact'?v===K:discreteMode==='atmost'?v<=K:v>=K}/>};
  }
  if(![xbar,S,sampleN,conf].every(Number.isFinite)||S<=0||!Number.isInteger(sampleN)||sampleN<2||sampleN>10000000||conf<=0||conf>=1)return {error:'Nhập x̄ hợp lệ, σ > 0, n nguyên ≥ 2 và độ tin cậy nằm giữa 0 và 1.'};
  const alpha=1-conf,z=invPhi(1-alpha/2),margin=z*S/Math.sqrt(sampleN);
  return {answer:null,interval:[xbar-margin,xbar+margin],formula:String.raw`\bar{x}\pm z_{1-\alpha/2}\frac{\sigma}{\sqrt{n}}`,steps:[`Độ tin cậy = ${num(conf*100,3)}%, α = ${num(alpha,5)}.`,`Tra z_(1−α/2) = ${num(z,5)}.`,`Sai số = ${num(z,5)} × ${num(S)} / √${sampleN} = ${num(margin,5)}.`,`Khoảng ước lượng: [${num(xbar-margin,5)}; ${num(xbar+margin,5)}].`],note:'Chỉ áp dụng khi biết độ lệch chuẩn tổng thể σ và mô hình ước lượng z phù hợp. Nếu chưa biết σ, mẫu nhỏ và tổng thể chuẩn, cần dùng phân phối t-Student.'};
 },[mode,mu,sigma,a,b,region,lam,n,prob,k,discreteMode,mean,sd,sample,confidence]);
 return <div className="xc-root"><div className="xc-hero"><span className="xc-kicker"><Calculator size={17}/> CÔNG CỤ HỌC TẬP 4.0</span><h1>Máy tính XSTK trực quan</h1><p>Nhập dữ kiện, xem công thức thay số, kết quả xác suất và vùng xác suất trên đồ thị. Tính trực tiếp trên trình duyệt, không cần API AI.</p></div><div className="xc-tabs" role="tablist" aria-label="Chọn loại bài toán">{[['normal','Phân phối chuẩn'],['poisson','Poisson'],['binomial','Nhị thức'],['ci','Ước lượng trung bình']].map(([id,label])=><button role="tab" aria-selected={mode===id} className={mode===id?'active':''} key={id} onClick={()=>setMode(id)}>{label}</button>)}</div><div className="xc-grid"><section className="xc-panel"><div className="xc-panel-heading"><Sigma size={20}/><h2>Thông số bài toán</h2></div>{mode==='normal'&&<><div className="xc-fields"><Field label="Trung bình μ" value={mu} onChange={setMu}/><Field label="Độ lệch chuẩn σ" value={sigma} onChange={setSigma} min="0.000001"/><Field label="Mốc a" value={a} onChange={setA}/>{region==='between'&&<Field label="Mốc b" value={b} onChange={setB}/>}</div><label className="xc-field"><span>Vùng cần tính</span><select value={region} onChange={e=>setRegion(e.target.value)}><option value="left">P(X ≤ a) — bên trái</option><option value="right">P(X ≥ a) — bên phải</option><option value="between">P(a ≤ X ≤ b) — ở giữa</option></select></label></>}{(mode==='poisson'||mode==='binomial')&&<><div className="xc-fields">{mode==='poisson'?<Field label="Tham số λ" value={lam} onChange={setLam} min="0"/>:<><Field label="Số phép thử n" value={n} onChange={setN} step="1" min="1"/><Field label="Xác suất thành công p" value={prob} onChange={setProb} min="0" max="1"/></>}<Field label="Số lần xuất hiện k" value={k} onChange={setK} step="1" min="0"/></div><label className="xc-field"><span>Dạng xác suất</span><select value={discreteMode} onChange={e=>setDiscreteMode(e.target.value)}><option value="exact">Đúng k lần — P(X = k)</option><option value="atmost">Không quá k lần — P(X ≤ k)</option><option value="atleast">Ít nhất k lần — P(X ≥ k)</option></select></label></>}{mode==='ci'&&<><div className="xc-fields"><Field label="Trung bình mẫu x̄" value={mean} onChange={setMean}/><Field label="Độ lệch chuẩn tổng thể σ (đã biết)" value={sd} onChange={setSd} min="0.000001"/><Field label="Cỡ mẫu n" value={sample} onChange={setSample} min="2" step="1"/><Field label="Độ tin cậy (ví dụ 0.95)" value={confidence} onChange={setConfidence} min="0" max="1"/></div><p className="xc-warning"><Info size={16}/> Chỉ dành cho ước lượng z khi biết σ tổng thể.</p></>}</section><section className="xc-panel xc-result"><div className="xc-panel-heading"><Calculator size={20}/><h2>Kết quả & đồ thị</h2></div>{result.error?<div className="xc-error" role="alert">{result.error}</div>:<><div className="xc-answer"><small>{mode==='ci'?'Khoảng tin cậy':'Xác suất tính được'}</small><strong>{result.interval?`[${num(result.interval[0],5)}; ${num(result.interval[1],5)}]`:num(result.answer,8)}</strong>{result.answer!==null&&<span>Tương đương {num(result.answer*100,4)}%</span>}</div>{result.chart||null}<div className="xc-formula"><strong>Công thức</strong><Formula value={result.formula} block/></div><div className="xc-steps"><strong>Cách giải từng bước</strong><ol>{result.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></div>{result.note&&<p className="xc-warning"><Info size={16}/>{result.note}</p>}</>}</section></div><p className="xc-disclaimer"><Info size={15}/> Kết quả số được làm tròn để hiển thị. Với bài kiểm định hoặc ước lượng chưa biết σ, cần chọn mô hình phù hợp trước khi áp dụng.</p></div>
}

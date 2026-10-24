import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, Copy, NotebookPen, RotateCcw, Search, Shuffle, Star, Trash2, X } from 'lucide-react';
import katex from 'katex';

// Ngân hàng biên soạn độc lập; không ghi đè dữ liệu chương/bài học hiện có.
const ITEMS = [
  [1,'Quy tắc cộng','P(A\\cup B)=P(A)+P(B)-P(A\\cap B)','Xác suất A hoặc B xảy ra. Nếu xung khắc thì giao bằng 0.','Khi nào được cộng P(A)+P(B) trực tiếp?','Khi A và B xung khắc.'],
  [1,'Xác suất có điều kiện','P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}','Điều kiện P(B)>0.','Mẫu số của xác suất có điều kiện là gì?','Xác suất của biến cố điều kiện.'],
  [1,'Công thức nhân','P(A\\cap B)=P(A)P(B\\mid A)','Nếu độc lập, P(B|A)=P(B).','Khi độc lập, P(A∩B) bằng gì?','P(A)×P(B).'],
  [1,'Xác suất toàn phần','P(B)=\\sum_i P(A_i)P(B\\mid A_i)','Các A_i tạo thành hệ đầy đủ các biến cố.','Khi nào dùng xác suất toàn phần?','Khi chia bài toán theo các trường hợp đầy đủ.'],
  [1,'Công thức Bayes','P(A_i\\mid B)=\\frac{P(A_i)P(B\\mid A_i)}{\\sum_jP(A_j)P(B\\mid A_j)}','Cập nhật xác suất sau khi biết kết quả B.','Bayes dùng để tính xác suất gì?','Xác suất nguyên nhân khi đã biết kết quả.'],
  [2,'Kỳ vọng rời rạc','E(X)=\\sum_i x_i p_i','Trung bình có trọng số của các giá trị X.','Kỳ vọng của biến rời rạc tính ra sao?','Lấy tổng giá trị nhân xác suất tương ứng.'],
  [2,'Phương sai','V(X)=E(X^2)-[E(X)]^2','Đo mức phân tán; độ lệch chuẩn là căn phương sai.','Độ lệch chuẩn liên hệ phương sai thế nào?','Là căn bậc hai của phương sai.'],
  [2,'Kỳ vọng tuyến tính','E(aX+b)=aE(X)+b','Đúng với mọi a, b hữu hạn.','E(3X+2) bằng gì?','3E(X)+2.'],
  [3,'Nhị thức','P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}','X đếm số thành công qua n phép thử Bernoulli độc lập.','Nhị thức cần những điều kiện nào?','n cố định, độc lập, hai kết quả, p không đổi.'],
  [3,'Poisson','P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}','Đếm số sự kiện trong khoảng thời gian/không gian; λ là số trung bình trong khoảng xét.','Nếu 6 lỗi/giờ thì λ trong 10 phút?','λ = 1.'],
  [3,'Chuẩn hóa phân phối chuẩn','Z=\\frac{X-\\mu}{\\sigma}','Z có phân phối chuẩn tắc nếu X chuẩn, σ>0.','X nhỏ hơn trung bình thì Z âm hay dương?','Z âm.'],
  [3,'Đối xứng chuẩn','\\Phi(-z)=1-\\Phi(z)','Dùng để tra bảng chỉ có giá trị z dương.','P(Z<-1) liên hệ Φ(1) thế nào?','1−Φ(1).'],
  [3,'Kỳ vọng Poisson','E(X)=V(X)=\\lambda','Poisson có trung bình bằng phương sai.','Phương sai của Poisson bằng gì?','Bằng λ.'],
  [4,'Trung bình mẫu','\\bar{x}=\\frac{1}{n}\\sum_{i=1}^n x_i','Tổng các quan sát chia cỡ mẫu n.','Trung bình mẫu khác tổng thể ở ký hiệu nào?','Trung bình mẫu x̄; tổng thể μ.'],
  [4,'Phương sai mẫu hiệu chỉnh','s^2=\\frac{1}{n-1}\\sum_{i=1}^n(x_i-\\bar{x})^2','Dùng mẫu số n−1 cho ước lượng không chệch phương sai tổng thể.','Vì sao mẫu số là n−1?','Do mất một bậc tự do khi ước lượng x̄.'],
  [5,'Khoảng tin cậy μ khi biết σ','\\bar{x}\\pm z_{1-\\alpha/2}\\frac{\\sigma}{\\sqrt n}','Dùng σ tổng thể đã biết, giả thiết phân phối thích hợp.','Biết σ, dùng phân phối tới hạn nào?','Chuẩn tắc Z.'],
  [5,'Khoảng tin cậy μ khi chưa biết σ','\\bar{x}\\pm t_{1-\\alpha/2,n-1}\\frac{s}{\\sqrt n}','Mẫu từ tổng thể chuẩn; dùng t khi chưa biết σ.','n=25, chưa biết σ, tổng thể chuẩn: bậc tự do?','24.'],
  [5,'Khoảng tin cậy tỷ lệ','\\hat p\\pm z_{1-\\alpha/2}\\sqrt{\\frac{\\hat p(1-\\hat p)}{n}}','Xấp xỉ chuẩn khi cỡ mẫu đủ lớn.','Sai số chuẩn của tỷ lệ mẫu phụ thuộc gì?','p̂ và n.'],
  [6,'Thống kê Z kiểm định trung bình','Z=\\frac{\\bar X-\\mu_0}{\\sigma/\\sqrt n}','Dùng khi σ đã biết và điều kiện áp dụng được thỏa mãn.','Giá trị μ₀ lấy từ đâu?','Giả thuyết H₀.'],
  [6,'Thống kê t một mẫu','t=\\frac{\\bar X-\\mu_0}{s/\\sqrt n}','Khi σ chưa biết, tổng thể chuẩn; bậc tự do n−1.','Kiểm định t một mẫu có bậc tự do?','n−1.'],
  [6,'Sai lầm loại I','P(\\text{bác bỏ }H_0\\mid H_0\\text{ đúng})=\\alpha','Bác bỏ H₀ trong khi H₀ đúng.','Sai lầm loại I là gì?','Bác bỏ giả thuyết không đúng ra phải giữ.'],
  [7,'Hiệu hai trung bình độc lập','SE(\\bar X-\\bar Y)=\\sqrt{\\frac{\\sigma_1^2}{n_1}+\\frac{\\sigma_2^2}{n_2}}','Công thức sai số chuẩn khi hai mẫu độc lập và biết phương sai tổng thể.','Điều kiện then chốt của công thức này?','Hai mẫu độc lập.'],
  [7,'Kiểm định cặp','t=\\frac{\\bar d-\\mu_{d,0}}{s_d/\\sqrt n}','Đặt d_i là hiệu từng cặp, rồi kiểm định một mẫu trên các hiệu.','Dữ liệu trước–sau cùng người dùng kiểm định nào?','Kiểm định t ghép cặp.'],
  [7,'Hiệu hai tỷ lệ','SE=\\sqrt{\\frac{\\hat p_1(1-\\hat p_1)}{n_1}+\\frac{\\hat p_2(1-\\hat p_2)}{n_2}}','Sai số chuẩn không gộp cho ước lượng hiệu hai tỷ lệ độc lập.','Công thức này dùng gộp tỷ lệ không?','Không, đây là sai số chuẩn không gộp.']
].map(([chapter,title,latex,hint,front,back],i)=>({id:`fc-${i+1}`,chapter,title,latex,hint,front,back}));
const KEY='xstk-flashcards-v3';
const load=()=>{try {const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}};
const math=(latex)=>{try{return {__html:katex.renderToString(latex,{throwOnError:false,displayMode:true,output:'html'})};}catch{return {__html:''};}};
export default function FlashcardNotebook({notes=[],note='',setNote=()=>{},update=()=>{}}){
  const [tab,setTab]=useState('formula');
  const [chapter,setChapter]=useState('all');
  const [query,setQuery]=useState('');
  const [favorites,setFavorites]=useState(false);
  const [ratings,setRatings]=useState(load);
  const [deck,setDeck]=useState([]);
  const [index,setIndex]=useState(0);
  const [flipped,setFlipped]=useState(false);
  const [review,setReview]=useState('all');
  const [noteQuery,setNoteQuery]=useState('');
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(ratings));}catch{}},[ratings]);
  const visible=useMemo(()=>ITEMS.filter(x=>(chapter==='all'||String(x.chapter)===chapter)&&(!favorites||ratings[x.id]?.favorite)&&(`${x.title} ${x.hint} ${x.front} ${x.back}`.toLowerCase().includes(query.toLowerCase()))),[chapter,favorites,ratings,query]);
  const selected=deck.length?ITEMS.find(x=>x.id===deck[index]):null;
  const start=()=>{const ids=visible.filter(x=>review==='all'||(review==='missed'?ratings[x.id]?.last==='missed':!ratings[x.id]?.last)).map(x=>x.id);setDeck(ids);setIndex(0);setFlipped(false);setTab('cards');};
  const mark=(value)=>{if(!selected)return;setRatings(p=>({...p,[selected.id]:{...p[selected.id],last:value,seen:(p[selected.id]?.seen||0)+1,updatedAt:Date.now()}}));setFlipped(false);setIndex(i=>Math.min(i+1,deck.length));};
  const favorite=(id)=>setRatings(p=>({...p,[id]:{...p[id],favorite:!p[id]?.favorite}}));
  const saveNote=()=>{if(!note.trim())return;update('notes',[{id:Date.now(),text:note.trim(),createdAt:new Date().toLocaleDateString('vi-VN')},...notes]);setNote('');};
  const deleteNote=(id)=>{if(window.confirm('Xóa ghi chú này?'))update('notes',notes.filter(x=>x.id!==id));};
  const copy=(txt)=>navigator.clipboard?.writeText(txt).catch(()=>{});
  return <div className="fc-root">
    <div className="fc-hero"><div className="eyebrow">XSTK ACADEMY · CÔNG CỤ ÔN TẬP</div><h1>Flashcard & sổ tay công thức</h1><p>Tra cứu nhanh, lật thẻ ghi nhớ và lưu lại kiến thức của riêng bạn. Dữ liệu học tập cũ được giữ nguyên.</p><div className="fc-stats"><span><b>{ITEMS.length}</b> công thức</span><span><b>{Object.values(ratings).filter(x=>x.last==='known').length}</b> thẻ đã nhớ</span><span><b>{Object.values(ratings).filter(x=>x.last==='missed').length}</b> thẻ cần ôn</span><span><b>{notes.length}</b> ghi chú</span></div></div>
    <div className="fc-tabs" role="tablist">{[['formula','Thư viện công thức'],['cards','Flashcard'],['notes','Ghi chú của tôi']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {tab!=='notes'&&<div className="fc-controls"><label className="fc-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm công thức, khái niệm..."/></label><select aria-label="Lọc chương" value={chapter} onChange={e=>setChapter(e.target.value)}><option value="all">Tất cả 7 chương</option>{Array.from({length:7},(_,i)=><option key={i} value={String(i+1)}>Chương {i+1}</option>)}</select><label className="fc-checkbox"><input type="checkbox" checked={favorites} onChange={e=>setFavorites(e.target.checked)}/> Chỉ mục yêu thích</label></div>}
    {tab==='formula'&&<><div className="fc-sectionline"><strong>{visible.length} công thức</strong><button className="fc-primary" onClick={start}><BookOpen size={17}/> Ôn bằng flashcard</button></div><div className="fc-grid">{visible.map(x=><article className="fc-formula" key={x.id}><div className="fc-formula-top"><span>CHƯƠNG {x.chapter}</span><button aria-label={ratings[x.id]?.favorite?'Bỏ yêu thích':'Thêm yêu thích'} title="Yêu thích" className={ratings[x.id]?.favorite?'fc-faved':''} onClick={()=>favorite(x.id)}><Star size={19} fill={ratings[x.id]?.favorite?'currentColor':'none'}/></button></div><h3>{x.title}</h3><div className="fc-math" dangerouslySetInnerHTML={math(x.latex)}/><p>{x.hint}</p><button className="fc-copy" onClick={()=>copy(x.latex)}><Copy size={14}/> Sao chép LaTeX</button></article>)}</div>{!visible.length&&<p className="fc-empty">Không tìm thấy công thức phù hợp.</p>}</>}
    {tab==='cards'&&<div className="fc-card-area"><div className="fc-card-toolbar"><label>Chế độ ôn <select value={review} onChange={e=>setReview(e.target.value)}><option value="all">Tất cả</option><option value="missed">Chỉ thẻ cần ôn</option><option value="new">Chưa ôn lần nào</option></select></label><button className="fc-primary" onClick={start}><RotateCcw size={16}/> Bắt đầu / Làm lại</button></div>{deck.length===0?<div className="fc-empty">Chọn bộ lọc rồi nhấn “Bắt đầu / Làm lại” để học.</div>:index>=deck.length?<div className="fc-finished"><Check size={34}/><h2>Đã hoàn thành lượt ôn!</h2><p>Bạn đã xem {deck.length} thẻ. Chọn “Làm lại” để tiếp tục.</p><button className="fc-primary" onClick={start}>Ôn lại</button></div>:<><div className="fc-count">Thẻ {index+1} / {deck.length} · Chương {selected?.chapter}</div><button className={'fc-flip '+(flipped?'flipped':'')} onClick={()=>setFlipped(v=>!v)} aria-label="Lật thẻ"><span className="fc-flip-hint">{flipped?'MẶT SAU · ĐÁP ÁN':'MẶT TRƯỚC · CÂU HỎI'}</span><strong>{flipped?selected?.back:selected?.front}</strong><small>Nhấn để lật thẻ</small></button><div className="fc-card-actions"><button disabled={index===0} onClick={()=>{setIndex(i=>i-1);setFlipped(false);}}><ChevronLeft size={17}/> Trước</button><button className="fc-missed" onClick={()=>mark('missed')}>Chưa nhớ</button><button className="fc-known" onClick={()=>mark('known')}>Đã nhớ <Check size={17}/></button><button disabled={index>=deck.length-1} onClick={()=>{setIndex(i=>i+1);setFlipped(false);}}>Tiếp <ChevronRight size={17}/></button></div></>}</div>}
    {tab==='notes'&&<div className="fc-notes"><section className="fc-note-editor"><h2><NotebookPen size={21}/> Ghi chú mới</h2><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Viết công thức, mẹo bấm máy, lưu ý khi làm bài..."/><div className="fc-note-bottom"><span>{note.length} ký tự</span><button className="fc-primary" disabled={!note.trim()} onClick={saveNote}><Bookmark size={16}/> Lưu ghi chú</button></div></section><section className="fc-note-list"><h2>Ghi chú đã lưu ({notes.length})</h2><label className="fc-search"><Search size={16}/><input value={noteQuery} onChange={e=>setNoteQuery(e.target.value)} placeholder="Tìm trong ghi chú..."/></label>{notes.filter(n=>String(n.text||'').toLowerCase().includes(noteQuery.toLowerCase())).map(n=><article className="fc-note" key={n.id}><div><small>{n.createdAt||'Đã lưu'}</small><div className="fc-note-buttons"><button title="Sao chép" onClick={()=>copy(n.text)}><Copy size={16}/></button><button title="Xóa ghi chú" onClick={()=>deleteNote(n.id)}><Trash2 size={16}/></button></div></div><p>{n.text}</p></article>)}{!notes.length&&<p className="fc-empty">Chưa có ghi chú. Những ghi chú đã lưu từ phiên bản cũ vẫn sẽ xuất hiện ở đây.</p>}</section></div>}
    <p className="fc-disclaimer">Công thức và thẻ ghi nhớ được biên soạn để ôn tập nhanh; hãy đối chiếu ký hiệu, điều kiện áp dụng với giáo trình của bạn.</p>
  </div>;
}

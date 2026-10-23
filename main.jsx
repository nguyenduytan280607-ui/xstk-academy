import XSTKCalculator from './XSTKCalculator.jsx';
import FlashcardNotebook from './FlashcardNotebook.jsx';
import hubCampusImage from './hub-campus-optimized.webp';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Award, BookOpen, Bookmark, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, UploadCloud, Copy, Flame, GraduationCap, Home, Library, ListChecks, Menu, NotebookPen, Search, Sigma, Sparkles, Target, Trophy, Users, X, RotateCcw, ChartNoAxesCombined } from 'lucide-react';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { chapters, lessons, questions } from './data';
import './styles.css';
// Bộ hiển thị thống nhất cho nội dung AI: Markdown + công thức toán.
function normalizeMath(text) {
  if (typeof text !== 'string') return '';
  let value = text.replace(/\r\n?/g, '\n');

  // Chuẩn hóa các dấu phân cách mà mô hình AI thường sử dụng.
  value = value
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n\n$$\n${math.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // Một số câu trả lời viết dấu [ ] thay cho \[ \] ở dòng riêng.
  value = value.replace(/(^|\n)\s*\[\s*\n([\s\S]*?)\n\s*\](?=\n|$)/g,
    (full, prefix, math) =>
      /\\(?:frac|sum|operatorname|text|sqrt|left|right|infty|quad)|[_^]/.test(math)
        ? `${prefix}\n\n$$\n${math.trim()}\n$$\n\n`
        : full
  );

  // Chỉ bao công thức trần khi dòng chưa chứa dấu $.
  value = value.split('\n').map(line => {
    if (/\$|`|https?:\/\//.test(line)) return line;
    const match = line.match(/^(\s*(?:[-*+]\s+)?(?:[^:：\n]{1,65}[:：]\s*)?)(\(?\s*(?:[A-Za-z][A-Za-z0-9]*(?:\[[^\]]+\]|\([^)]*\))?\s*=|\\(?:operatorname|displaystyle|sum|frac|sqrt))[\s\S]*)$/);
    if (!match || !/\\(?:frac|sum|operatorname|sqrt|text|infty|displaystyle)|\^\{|_\{/.test(match[2])) return line;
    return `${match[1]}$${match[2].trim()}$`;
  }).join('\n');

  return value;
}

// KaTeX báo lỗi khi AI vô tình lồng dấu $ hoặc tạo mã chưa chuẩn.
// Thử sửa và render lại thay vì để nguyên công thức màu đỏ.
function MathErrorFallback({ children, className, ...props }) {
  if (!String(className || '').split(' ').includes('katex-error')) {
    return <span className={className} {...props}>{children}</span>;
  }
  const source = String(children ?? '').trim();
  const candidates = [
    source,
    source.replace(/^\$+|\$+$/g, '').trim(),
    source.replace(/^\\\(|\\\)$/g, '').replace(/^\\\[|\\\]$/g, '').trim()
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const html = katex.renderToString(candidate, {
        throwOnError: true,
        strict: 'ignore',
        trust: false
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch { /* Thử phương án tiếp theo */ }
  }
  // Giữ nội dung đọc được nếu AI thật sự trả về LaTeX không hợp lệ.
  return <span title="Công thức AI chưa đúng cú pháp" style={{ color: 'inherit' }}>{source}</span>;
}

function MathMarkdown({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, {
        throwOnError: false,
        strict: 'ignore',
        trust: false
      }]]}
      components={{ span: MathErrorFallback }}
    >
      {normalizeMath(children)}
    </ReactMarkdown>
  );
}

const initial = () => { try { return JSON.parse(localStorage.getItem('xstk-state')) || {}; } catch { return {}; } };
function App() {
  const [saved, setSaved] = useState(initial);
  const [page, setPage] = useState('Dashboard');
  const [dashboardProblem, setDashboardProblem] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [query, setQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [lessonStatus, setLessonStatus] = useState('all');
  const [quizIndex, setQuizIndex] = useState(0);
  const [chosen, setChosen] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [note, setNote] = useState('');
  const [activeNote, setActiveNote] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const completed = saved.completed || [];
  const wrong = saved.wrong || [];
  const notes = saved.notes || [];
  const attempts = saved.attempts || {};
  const xp = completed.length * 10 + Object.values(submitted).filter(Boolean).length * 5;
  const progress = Math.round(completed.length / lessons.length * 100);
  useEffect(() => { localStorage.setItem('xstk-state', JSON.stringify(saved)); }, [saved]);
  const update = (key, value) => setSaved(prev => ({ ...prev, [key]: value }));
  const markComplete = (lesson) => { if (!completed.includes(lesson.id)) update('completed', [...completed, lesson.id]); setSelectedLesson(null); };
  const filteredLessons = useMemo(() => lessons.filter(l => (chapterFilter === 'all' || l.chapterId === Number(chapterFilter)) && `${l.title} ${l.description} ${chapters[l.chapterId-1].title}`.toLowerCase().includes(query.toLowerCase())), [chapterFilter, query]);
  const nav = [
    { name: 'Dashboard', icon: Home }, { name: 'Lộ trình học', icon: Target }, { name: 'Bài học', icon: BookOpen }, { name: 'Phòng thực hành', icon: Calculator }, { name: 'AI tạo đề luyện tập', icon: Sparkles }, { name: 'Giải bài tập', icon: Sparkles }, { name: 'Ôn tập câu sai', icon: RotateCcw }, { name: 'Sổ tay công thức', icon: NotebookPen }, { name: 'Máy tính XSTK', icon: Calculator }, { name: 'Thống kê kết quả', icon: ChartNoAxesCombined }
  ];
  const go = (name) => { setPage(name); setSelectedLesson(null); setShowMobileNav(false); };
  const nextLesson = lessons.find(l => !completed.includes(l.id)) || lessons[0];
  const renderLesson = (lesson) => setSelectedLesson(lesson);

  return <div className="app-shell">
    <aside className={`sidebar ${showMobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sigma size={25}/></div><div><strong>XSTK</strong><span>ACADEMY</span></div><button className="mobile-close icon-button" aria-label="Đóng menu" onClick={() => setShowMobileNav(false)}><X size={18}/></button></div>
      <button className="search-box" onClick={() => setSearchOpen(!searchOpen)}><Search size={16}/><span>Tìm kiếm bài học...</span><kbd>⌘ K</kbd></button>
      {searchOpen && <div className="sidebar-search"><input autoFocus value={query} onChange={e => {setQuery(e.target.value); setPage('Bài học')}} placeholder="Tên bài học, công thức..."/><button onClick={() => setSearchOpen(false)}><X size={15}/></button></div>}
      <div className="nav-label">KHÔNG GIAN HỌC TẬP</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.name} title={item.name} aria-label={item.name} aria-current={page === item.name ? "page" : undefined} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => go(item.name)}><Icon size={18}/><span>{item.name}</span>{item.name === 'Ôn tập câu sai' && wrong.length > 0 && <em>{wrong.length}</em>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="mini-progress"><div className="mini-progress-icon"><Flame size={16}/></div><div><strong>{completed.length} bài hoàn thành</strong><span>Tiếp tục giữ nhịp học nhé!</span></div></div><div className="profile"><div className="avatar" aria-label="Ảnh đại diện người học">X</div><div><strong>Người học XSTK</strong><span>Hành trình của bạn</span></div><ChevronDown size={16}/></div></div>
    </aside>
    {showMobileNav && <div className="overlay" onClick={() => setShowMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Mở menu điều hướng" onClick={() => setShowMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Không gian học tập <ChevronRight size={14}/> <strong>{selectedLesson ? 'Bài học' : page}</strong></div><div className="top-actions"><span className="top-streak"><Flame size={15}/>{completed.length ? 'Đang tiến bộ' : 'Bắt đầu hôm nay'}</span><div className="top-avatar" aria-label="Hồ sơ người học">X</div></div></header>
      <div className="content-wrap">
        {selectedLesson ? <LessonView lesson={selectedLesson} completed={completed.includes(selectedLesson.id)} onBack={() => setSelectedLesson(null)} onComplete={() => markComplete(selectedLesson)} onPractice={() => {setSelectedLesson(null);go('Phòng thực hành')}} /> : <>
          {page === 'Dashboard' && <Dashboard completed={completed} progress={progress} xp={xp} nextLesson={nextLesson} onGo={go} onLesson={renderLesson} wrongCount={wrong.length} onSolve={(text) => { setDashboardProblem(text); go('Giải bài tập'); }} />}
          {page === 'Lộ trình học' && <PathPage completed={completed} onGo={go} onLesson={renderLesson} />}
          {page === 'Bài học' && <LessonsPage lessonStatus={lessonStatus} setLessonStatus={setLessonStatus} filteredLessons={filteredLessons} query={query} setQuery={setQuery} chapterFilter={chapterFilter} setChapterFilter={setChapterFilter} completed={completed} onLesson={renderLesson} />}
          {page === 'AI tạo đề luyện tập' && <AIPracticeGenerator />}
          {page === 'Phòng thực hành' && <PracticePage chosen={chosen} setChosen={setChosen} submitted={submitted} setSubmitted={setSubmitted} wrong={wrong} update={update} quizIndex={quizIndex} setQuizIndex={setQuizIndex} />}
          {page === 'Giải bài tập' && <SolvePage initialProblem={dashboardProblem} onSaveNote={(text)=>update('notes',[{id:Date.now(),text,createdAt:new Date().toLocaleDateString('vi-VN')},...notes])} />} 
          {page === 'Ôn tập câu sai' && <ReviewPage wrong={wrong} onPractice={() => go('Phòng thực hành')} />}
          {page === 'Sổ tay công thức' && <FlashcardNotebook notes={notes} note={note} setNote={setNote} update={update} />}
          {page === 'Máy tính XSTK' && <XSTKCalculator />}
          {page === 'Thống kê kết quả' && <StatsPage completed={completed} xp={xp} attempts={attempts} />}
        </>}
        <footer className="footer"><span>© XSTK Academy</span><span>Học chắc bản chất · Luyện tập có phương pháp</span></footer>
      </div>
    </main>
  </div>;
}

function PageHeading({eyebrow,title,desc,action}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>; }
function ProgressBar({value}) { return <div className="progress-track"><div className="progress-fill" style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>; }
function Dashboard({completed,progress,xp,nextLesson,onGo,onLesson,wrongCount,onSolve}) {
  const [quickProblem, setQuickProblem] = useState('');
  const recent = lessons.filter(l => completed.includes(l.id)).slice(-3).reverse();
  return <>
    <section className="welcome-banner hub-hero-full" style={{'--hub-hero-image': `url("${hubCampusImage}")`}} aria-label="Chào mừng đến với XSTK Academy"><div className="welcome-copy"><div className="welcome-chip"><Sparkles size={13}/> XSTK ACADEMY · KHÔNG GIAN HỌC TẬP</div><h1>Chào mừng trở lại! 👋<br/>Chinh phục Xác suất thống kê</h1><p>Học chắc bản chất, luyện từng dạng bài và tiến bộ mỗi ngày cùng cộng đồng sinh viên.</p><button className="primary-button" onClick={() => onLesson(nextLesson)}>Học tiếp: Chương {nextLesson.chapterId} · {nextLesson.title} <ArrowRight size={16}/></button></div></section>
    <section className="daily-suggestions"><strong><Sparkles size={18}/> Gợi ý hôm nay</strong><button onClick={()=>onLesson(nextLesson)}>Học bài tiếp theo: {nextLesson.title} <ArrowRight size={16}/></button>{wrongCount>0&&<button onClick={()=>onGo("Ôn tập câu sai")}>Ôn {wrongCount} câu làm sai <ArrowRight size={16}/></button>}</section>
    <section className="learning-overview" aria-label="Tổng quan tiến độ học tập">
      <div className="learning-progress-card">
        <div className="learning-card-heading"><div><span className="learning-kicker">TỔNG QUAN HỌC TẬP</span><h2>Tiến độ của bạn</h2></div></div>
        <div className="learning-progress-body">
          <div className="learning-ring" role="img" aria-label={`Đã hoàn thành ${progress}% lộ trình`} style={{'--progress': `${Math.max(0, Math.min(100, progress))}%`}}>
            <div className="learning-ring-inner"><strong>{progress}%</strong><span>Hoàn thành</span></div>
          </div>
          <div className="learning-progress-info"><strong>{completed.length} / {lessons.length} bài học</strong><p>{completed.length === 0 ? 'Mỗi bài học hoàn thành là một bước tiến mới!' : `Bạn đã hoàn thành ${completed.length} bài. Tiếp tục phát huy nhé!`}</p><button className="learning-inline-link" onClick={() => onGo('Lộ trình học')}>Xem lộ trình <ArrowRight size={15}/></button></div>
        </div>
      </div>
      <div className="learning-achievements-card">
        <div className="learning-card-heading"><div><span className="learning-kicker">THÀNH TÍCH</span><h2>Hành trình chinh phục</h2></div><Award size={22}/></div>
        <div className="learning-achievement-grid">
          <div><BookOpen size={20}/><strong>{completed.length}</strong><span>Bài đã học</span></div>
          <div><CheckCircle2 size={20}/><strong>{chapters.filter(c => lessons.filter(l => l.chapterId === c.id).every(l => completed.includes(l.id))).length}</strong><span>Chương hoàn thành</span></div>
          <div><Award size={20}/><strong>{xp}</strong><span>XP tích lũy</span></div>
          <div><RotateCcw size={20}/><strong>{wrongCount}</strong><span>Câu cần ôn tập</span></div>
        </div>
      </div>
      <div className="learning-chapter-card">
        <div className="learning-card-heading"><div><span className="learning-kicker">7 CHẶNG KIẾN THỨC</span><h2>Tiến độ theo chương</h2></div></div>
        <div className="learning-chapter-list">{chapters.map(c => { const chapterLessons = lessons.filter(l => l.chapterId === c.id); const done = chapterLessons.filter(l => completed.includes(l.id)).length; const percent = chapterLessons.length ? Math.round(done / chapterLessons.length * 100) : 0; return <div className="learning-chapter-row" key={c.id}><div className="learning-chapter-title"><span>Chương {c.id}</span><strong>{done}/{chapterLessons.length}</strong></div><div className="learning-chapter-track"><span style={{width: `${percent}%`}}/></div></div>; })}</div>
      </div>
    </section>
    <section className="dashboard-ai-section" aria-label="Giải bài tập với AI">
      <div className="dashboard-ai-panel">
        <div className="dashboard-ai-header"><div className="dashboard-ai-symbol"><Sparkles size={23}/></div><div><span className="learning-kicker">TRỢ LÝ HỌC TẬP</span><h2>Giải bài tập cùng AI</h2><p>Nhập đề bài để chuyển sang phòng giải chi tiết từng bước.</p></div></div>
        <label className="dashboard-ai-label" htmlFor="dashboard-ai-problem">Đề bài của bạn</label>
        <textarea id="dashboard-ai-problem" value={quickProblem} onChange={e => setQuickProblem(e.target.value)} placeholder="Ví dụ: X có phân phối chuẩn N(80, 10²). Tính P(X < 90)..." rows={4}/>
        <div className="dashboard-ai-actions"><span><CheckCircle2 size={15}/> Giải thích rõ công thức và cách tính</span><button className="primary-button" type="button" disabled={!quickProblem.trim()} onClick={() => onSolve(quickProblem.trim())}>Giải bài với AI <ArrowRight size={16}/></button></div>
      </div>
      <div className="dashboard-ai-side"><div className="dashboard-ai-side-icon"><BookOpen size={28}/></div><h3>Trợ giảng AI luôn sẵn sàng</h3><p>Giải bài theo từng bước, trình bày công thức rõ ràng và hỗ trợ bạn hiểu bản chất.</p><button className="text-button" type="button" onClick={() => onGo('Giải bài tập')}>Mở phòng giải bài <ArrowRight size={16}/></button></div>
    </section>
    <div className="stats-grid"><StatCard icon={BookOpen} label="Bài đã hoàn thành" value={`${completed.length}/${lessons.length}`} detail={`${progress}% lộ trình`} tone="green"/><StatCard icon={Award} label="Điểm kinh nghiệm" value={xp} detail="XP tích lũy" tone="gold"/><StatCard icon={Target} label="Chặng học" value={`${chapters.filter(c => lessons.filter(l=>l.chapterId===c.id).every(l=>completed.includes(l.id))).length}/7`} detail="Chương hoàn thành" tone="purple"/><StatCard icon={RotateCcw} label="Cần ôn tập" value={wrongCount} detail="Câu trả lời sai đã lưu" tone="blue"/></div>
    <div className="section-heading"><div><div className="eyebrow">TIẾP TỤC HỌC</div><h2>Bài học tiếp theo</h2></div><button className="text-button" onClick={() => onGo('Bài học')}>Xem tất cả bài học <ArrowRight size={15}/></button></div>
    <div className="continue-card"><div className="continue-icon"><BookOpen size={24}/></div><div className="continue-body"><div className="lesson-meta">CHƯƠNG {nextLesson.chapterId} · {nextLesson.minutes} PHÚT</div><h3>{nextLesson.title}</h3><p>{nextLesson.description}</p><div className="continue-progress"><ProgressBar value={Math.round(lessons.filter(l=>l.chapterId===nextLesson.chapterId&&completed.includes(l.id)).length/lessons.filter(l=>l.chapterId===nextLesson.chapterId).length*100)}/><span>{Math.round(lessons.filter(l=>l.chapterId===nextLesson.chapterId&&completed.includes(l.id)).length/lessons.filter(l=>l.chapterId===nextLesson.chapterId).length*100)}% chương</span></div></div><button className="primary-button" onClick={() => onLesson(nextLesson)}>Học ngay <ArrowRight size={16}/></button></div>
    <div className="section-heading"><div><div className="eyebrow">HÀNH TRÌNH HỌC</div><h2>7 chặng kiến thức</h2></div><button className="text-button" onClick={() => onGo('Lộ trình học')}>Mở lộ trình <ArrowRight size={15}/></button></div>
    <div className="chapter-grid">{chapters.slice(0,4).map((c,i)=><ChapterCard key={c.id} chapter={c} completed={completed} onClick={() => onGo('Bài học')} index={i}/>)}</div>
    <div className="section-heading"><div><div className="eyebrow">GẦN ĐÂY</div><h2>Những bài bạn đã học</h2></div></div>
    {recent.length ? <div className="simple-list">{recent.map(l=><LessonRow key={l.id} lesson={l} done onClick={() => onLesson(l)}/>)}</div> : <div className="empty-state"><BookOpen size={25}/><strong>Hành trình bắt đầu từ đây</strong><span>Hoàn thành bài học đầu tiên để lưu tiến độ của bạn.</span></div>}
  </>;
}
function StatCard({icon:Icon,label,value,detail,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>; }
function ChapterCard({chapter,completed,onClick,index=0}) { const list=lessons.filter(l=>l.chapterId===chapter.id);const count=list.filter(l=>completed.includes(l.id)).length; return <button className="chapter-card" onClick={onClick}><div className={`chapter-symbol symbol-${index%4}`}>{['P','X','ƒ','μ'][index%4]}</div><div className="chapter-card-top"><span>CHƯƠNG {chapter.id}</span><span>{count}/{list.length}</span></div><h3>{chapter.short}</h3><p>{chapter.description}</p><ProgressBar value={count/list.length*100}/><div className="chapter-card-bottom"><span>{count===list.length?'Hoàn thành':`${list.length-count} bài còn lại`}</span><ChevronRight size={16}/></div></button>; }
const ROADMAP_ICONS = [BookOpen, ChartNoAxesCombined, Activity, Users, Sigma, Search, ChartNoAxesCombined];
const ROADMAP_POSITIONS = [
  {x:24,y:78},{x:36,y:73},{x:47,y:65},{x:58,y:58},{x:69,y:51},{x:80,y:42},{x:90,y:32}
];
function ChapterCheckpoint({chapter,index,active,onClick}) {
  const Icon=ROADMAP_ICONS[index];
  const position=ROADMAP_POSITIONS[index];
  const current=chapter.done>0 || (chapter.id===1 && chapter.done===0);
  const status=chapter.pct===100?'HOÀN THÀNH':current?'ĐANG HỌC':'CHƯA BẮT ĐẦU';
  return <button type="button" className={`rm-checkpoint rm-cp-${index+1} ${current?'rm-current':''} ${active?'rm-selected':''}`} style={{'--x':`${position.x}%`,'--y':`${position.y}%`}} onClick={onClick} aria-label={`Mở chương ${chapter.id}: ${chapter.short}, ${chapter.done}/${chapter.items.length} bài`}>
    <span className="rm-float-card"><Icon size={24} aria-hidden="true"/><span className="rm-card-copy"><small>CHƯƠNG {chapter.id} · {status}</small><strong>{chapter.short}</strong><em>{chapter.done}/{chapter.items.length} bài · {chapter.pct}%</em></span></span>
    <span className="rm-platform"><span className="rm-beacon">{chapter.id}</span></span>
  </button>;
}
function JourneyProgress({done,total,chapterCount}) {
  const percent=total?Math.round(done/total*100):0;
  return <div className="rm-progress" aria-label={`Đã hoàn thành ${done} trên ${total} bài`}><div className="rm-progress-title"><span><Trophy size={20}/> Tiến độ toàn hành trình</span><b>{percent}%</b></div><div className="rm-progress-track"><span style={{width:`${percent}%`}}/></div><div className="rm-progress-stats"><span><BookOpen size={22}/><b>{done}</b><small>Bài hoàn thành</small></span><span><ChartNoAxesCombined size={22}/><b>{done}/{total}</b><small>Tổng số bài học</small></span><span><Target size={22}/><b>{chapterCount}</b><small>Chương kiến thức</small></span></div></div>;
}
function ChapterDetails({stats,active,view,setView,onSelect,onFirst,onLesson,completed}) {
  const selected=stats.find(c=>c.id===active)||stats[0];
  return <section className="rm-details"><div className="rm-details-head"><div><h2>Chi tiết từng chương</h2><p>Chọn một chương để xem danh sách bài học và bắt đầu chinh phục.</p></div><div className="rm-toggle" role="group" aria-label="Kiểu hiển thị lộ trình"><button type="button" aria-pressed={view==='map'} className={view==='map'?'active':''} onClick={()=>setView('map')}><BookOpen size={16}/> Dạng bản đồ</button><button type="button" aria-pressed={view==='list'} className={view==='list'?'active':''} onClick={()=>setView('list')}><ListChecks size={16}/> Dạng danh sách</button></div></div>
    <div className="rm-chapter-grid">{stats.map((c,i)=>{const Icon=ROADMAP_ICONS[i];const current=c.done>0 || (c.id===1&&c.done===0);return <article key={c.id} className={`rm-chapter ${current?'rm-chapter-current':''}`}><span className="rm-chapter-index">{c.id}</span><Icon size={30} aria-hidden="true"/><small>Chương {c.id}</small><strong>{c.short}</strong><p>{c.done}/{c.items.length} bài · {c.pct}%</p><button type="button" onClick={()=>{if(c.id===1&&view==='map')onFirst(c);else onSelect(c.id)}}>{current&&c.id===1?'Bắt đầu học':'Xem chi tiết'} <ArrowRight size={15}/></button></article>})}</div>
    {view==='list'&&<div className="rm-lesson-detail"><div className="rm-lesson-heading"><div><span>CHƯƠNG {selected.id}</span><h3>{selected.title}</h3><p>{selected.description}</p></div><button className="primary-button" onClick={()=>onFirst(selected)}>Học tiếp <ArrowRight size={16}/></button></div><div className="rm-lesson-rows">{selected.items.length?selected.items.map(l=><button key={l.id} onClick={()=>onLesson(l)}><span>{completed.includes(l.id)?<CheckCircle2 size={18}/>:<BookOpen size={18}/>}</span><strong>{l.title}</strong><ChevronRight size={17}/></button>):<p>Chương này chưa có bài học. Hãy chọn chương khác.</p>}</div></div>}
  </section>;
}
function PathPage({completed,onGo,onLesson}) {
  const [view,setView]=useState('map');
  const [active,setActive]=useState(1);
  const stats=chapters.map(c=>{const items=lessons.filter(l=>l.chapterId===c.id);const done=items.filter(l=>completed.includes(l.id)).length;return {...c,items,done,pct:items.length?Math.round(done/items.length*100):0};});
  const doneTotal=lessons.filter(l=>completed.includes(l.id)).length;
  const openChapter=id=>{setActive(id);setView('list');};
  const openFirst=c=>{const item=c.items.find(l=>!completed.includes(l.id))||c.items[0];if(item)onLesson(item);};
  return <section className="rm-page">
    <div className="rm-hero"><div className="rm-campus" role="img" aria-label="Khuôn viên Đại học Ngân hàng TP.HCM với tòa nhà và cây xanh"/><div className="rm-hero-light"/>
      <div className="rm-intro"><span>XSTK ACADEMY</span><h1>Hành trình chinh phục XSTK</h1><p>{chapters.length} chương kiến thức · Từ nền tảng đến vận dụng thực tiễn.</p><blockquote>“Kiến thức hôm nay<br/>là nền tảng cho những cơ hội ngày mai.”<cite>— XSTK Academy</cite></blockquote></div>
      <div className="rm-journey" aria-label="Bản đồ hành trình 7 chương"><svg className="rm-road-svg" viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="rm-road-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7fbff"/><stop offset="1" stopColor="#b8d6fa"/></linearGradient><filter id="rm-shadow" x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur stdDeviation="11"/></filter></defs><path d="M80 468 C 380 460, 620 360, 850 290 S 1130 170, 1155 75" fill="none" stroke="#082e62" strokeWidth="100" opacity=".3" filter="url(#rm-shadow)"/><path d="M80 468 C 380 460, 620 360, 850 290 S 1130 170, 1155 75" fill="none" stroke="#376ca6" strokeWidth="86"/><path d="M80 455 C 380 447, 620 347, 850 277 S 1130 157, 1155 62" fill="none" stroke="url(#rm-road-fill)" strokeWidth="79"/><path d="M80 455 C 380 447, 620 347, 850 277 S 1130 157, 1155 62" fill="none" stroke="#fff" strokeDasharray="12 28" strokeWidth="3" opacity=".95"/></svg>
        {stats.map((c,i)=><ChapterCheckpoint key={c.id} chapter={c} index={i} active={active===c.id} onClick={()=>openChapter(c.id)}/>)}
        <span className="rm-start-sign" aria-hidden="true">BẮT ĐẦU<br/>HÀNH TRÌNH →</span><span className="rm-finish" aria-hidden="true">🏆</span>
      </div>
      <div className="rm-bottom-widgets"><JourneyProgress done={doneTotal} total={lessons.length} chapterCount={chapters.length}/><div className="rm-message"><span>💡</span><p>Mỗi chương là một cột mốc,<br/>mỗi cột mốc đưa bạn gần hơn<br/>đến mục tiêu của mình.</p></div></div>
    </div>
    <ChapterDetails stats={stats} active={active} view={view} setView={setView} onSelect={openChapter} onFirst={openFirst} onLesson={onLesson} completed={completed}/>
  </section>;
}

function LessonsPage({filteredLessons,query,setQuery,chapterFilter,setChapterFilter,completed,onLesson,lessonStatus,setLessonStatus}) {
  const current=lessons.find(l=>!completed.includes(l.id));
  const [expanded,setExpanded]=useState(()=>current?.chapterId||1);
  const shown=filteredLessons.filter(l=>lessonStatus==='all'||(lessonStatus==='done'?completed.includes(l.id):!completed.includes(l.id)));
  return <><PageHeading eyebrow="THƯ VIỆN KIẾN THỨC" title="Danh mục bài học" desc={`${lessons.length} bài học theo ${chapters.length} chương, đi từ nền tảng đến vận dụng thực tiễn.`}/><div className="filter-bar"><div className="input-with-icon"><Search size={17}/><input aria-label="Tìm kiếm bài học" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm bài học, chủ đề..."/></div><select aria-label="Lọc theo chương" value={chapterFilter} onChange={e=>setChapterFilter(e.target.value)}><option value="all">Tất cả chương</option>{chapters.map(c=><option value={c.id} key={c.id}>Chương {c.id}: {c.short}</option>)}</select><select aria-label="Lọc trạng thái" value={lessonStatus} onChange={e=>setLessonStatus(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="new">Chưa học</option><option value="done">Đã học</option></select></div><div className="results-line">Hiển thị <strong>{shown.length}</strong> bài học <span>· {shown.filter(l=>completed.includes(l.id)).length} bài đã hoàn thành</span></div>{shown.length?<div className="lesson-groups">{chapters.map(c=>{const items=shown.filter(l=>l.chapterId===c.id);if(!items.length)return null;const total=lessons.filter(l=>l.chapterId===c.id).length;const done=lessons.filter(l=>l.chapterId===c.id&&completed.includes(l.id)).length;return <section className="lesson-group" key={c.id}><button className="lesson-group-head" aria-expanded={expanded===c.id} onClick={()=>setExpanded(expanded===c.id?null:c.id)}><span className="chapter-bubble">{c.id}</span><span><strong>Chương {c.id}: {c.title}</strong><small>{done}/{total} bài hoàn thành</small></span><ChevronDown size={19}/></button>{expanded===c.id&&<div className="lesson-catalog">{items.map(l=><LessonRow key={l.id} lesson={l} done={completed.includes(l.id)} onClick={()=>onLesson(l)}/>)}</div>}</section>})}</div>:<div className="empty-state"><Search size={24}/><strong>Không tìm thấy bài học</strong><span>Thử từ khóa hoặc bộ lọc khác.</span><button className="secondary-button" onClick={()=>{setQuery('');setChapterFilter('all');setLessonStatus('all')}}>Xóa bộ lọc</button></div>}</>;
}

function LessonRow({lesson,done,onClick}) { return <button className="lesson-row" onClick={onClick}><div className={`lesson-status ${done?'done':''}`}>{done?<Check size={16}/>:<BookOpen size={16}/>}</div><div className="lesson-row-main"><div className="lesson-meta">CHƯƠNG {lesson.chapterId} · BÀI {lesson.number}</div><h3>{lesson.title}</h3><p>{lesson.description || `Tìm hiểu ${lesson.title.toLowerCase()} và áp dụng vào bài tập xác suất thống kê.`}</p></div><div className="lesson-row-side"><span><Clock3 size={13}/>{lesson.minutes} phút</span><span className={`status-text ${done?'is-done':''}`}>{done?<><Check size={13}/> Đã học</>:'Chưa học'}</span></div><ChevronRight className="row-chevron" size={17}/></button>; }
function LessonView({lesson,completed,onBack,onComplete,onPractice}) { const [showHint,setShowHint]=useState(false);return <><button className="back-button" onClick={onBack}><ChevronRight size={15} className="back-arrow"/> Quay lại danh sách</button><div className="lesson-layout"><article className="lesson-article"><div className="eyebrow">CHƯƠNG {lesson.chapterId} · BÀI {lesson.number}</div><h1>{lesson.title}</h1><p className="article-lead">{lesson.description}</p><div className="article-meta"><span><Clock3 size={14}/>{lesson.minutes} phút đọc</span><span><Library size={14}/>{lesson.source}</span></div><div className="article-divider"/><h2>Mục tiêu bài học</h2><p>Sau bài này, bạn cần hiểu khái niệm, nhận diện dữ kiện trong đề và biết khi nào nên áp dụng công thức.</p><h2>Giải thích cốt lõi</h2><p>{lesson.content}</p><div className="lesson-detail-list"><div><strong>Điểm cần nhớ</strong><p>{lesson.note}</p></div><div><strong>Ví dụ / cách vận dụng</strong><p>{lesson.example}</p></div></div><div className="formula-box"><div className="formula-label"><Sigma size={17}/> CÔNG THỨC / QUY TẮC GHI NHỚ</div><div className="formula-text">{lesson.formula}</div><button className="small-outline" onClick={()=>navigator.clipboard?.writeText(lesson.formula)}><Bookmark size={14}/> Sao chép công thức</button></div><h2>Cách giải một bài tập</h2><div className="steps-list"><div><b>01</b><span><strong>Đọc đề và xác định dữ kiện</strong><small>Gạch chân các giá trị đã biết và đại lượng cần tìm.</small></span></div><div><b>02</b><span><strong>Chọn đúng công thức</strong><small>Kiểm tra điều kiện áp dụng, không chọn công thức chỉ vì thấy quen.</small></span></div><div><b>03</b><span><strong>Thay số và tính toán</strong><small>Viết từng bước để dễ phát hiện lỗi.</small></span></div><div><b>04</b><span><strong>Diễn giải kết quả</strong><small>Trả lời đúng câu hỏi bằng ngôn ngữ của bài toán.</small></span></div></div><div className="source-note"><CircleHelp size={17}/><span><strong>Nguồn nội dung</strong><br/>Khung chủ đề được tổ chức theo file tài liệu gốc. Phần khái niệm và công thức được biên soạn theo chủ đề của PDF. Các ví dụ diễn giải trên website là phần hỗ trợ học tập; khi có khác biệt ký hiệu, hãy ưu tiên quy ước trong tài liệu gốc.<br/><a className="source-pdf-link" href={`/tai-lieu/bai-${lesson.chapterId}-${({1:'xac-suat',2:'bien-ngau-nhien',3:'phan-phoi',4:'mau-ngau-nhien',5:'uoc-luong',6:'kiem-dinh',7:'so-sanh'})[lesson.chapterId]}.pdf`} target="_blank" rel="noreferrer">Mở PDF gốc Bài {lesson.chapterId} ↗</a></span></div><div className="article-actions"><button className="primary-button" onClick={onComplete}>{completed?<CheckCircle2 size={16}/>:<Check size={16}/>} {completed?'Đã hoàn thành':'Đánh dấu hoàn thành'}</button><button className="secondary-button" onClick={onPractice}>Luyện tập ngay <ArrowRight size={15}/></button></div></article><aside className="lesson-aside"><div className="aside-card"><div className="aside-title"><ListChecks size={17}/> Trong bài này</div><a href="#" onClick={e=>{e.preventDefault();document.querySelector('.formula-box')?.scrollIntoView({behavior:'smooth'})}}>Công thức cần nhớ</a><a href="#" onClick={e=>{e.preventDefault();document.querySelector('.steps-list')?.scrollIntoView({behavior:'smooth'})}}>Quy trình giải bài</a><div className="aside-separator"/><div className="aside-title"><Award size={17}/> Tiến độ bài học</div><div className="aside-progress"><ProgressBar value={completed?100:0}/><span>{completed?'100%':'0%'} hoàn thành</span></div></div><div className="aside-tip"><Sparkles size={18}/><strong>Mẹo học hiệu quả</strong><p>Hãy tự giải thích công thức bằng lời của bạn, sau đó làm một bài tập mà không nhìn lời giải.</p></div></aside></div></>; }
function PracticePage({chosen,setChosen,submitted,setSubmitted,wrong,update,quizIndex,setQuizIndex}) {
  const [chapter, setChapter] = useState('all');
  const [mode, setMode] = useState('practice');
  const [showExplain, setShowExplain] = useState(true);
  const [examAnswers, setExamAnswers] = useState({});
  const [examDone, setExamDone] = useState(false);
  const [duration, setDuration] = useState(15);
  const [seconds, setSeconds] = useState(15 * 60);
  const [startedAt, setStartedAt] = useState(null);
  const [history, setHistory] = useState([]);
  const finishLock = useRef(false);
  const qs = useMemo(() => questions.filter(q => chapter === 'all' || q.chapterId === Number(chapter)), [chapter]);
  const index = Math.max(0, Math.min(quizIndex, qs.length - 1));
  const q = qs[index];
  const answers = mode === 'exam' ? examAnswers : chosen;
  const answer = q ? answers[q.id] : undefined;
  const revealed = mode === 'exam' ? examDone : !!(q && submitted[q.id]);
  const answered = qs.filter(item => answers[item.id] !== undefined).length;
  const correct = qs.filter(item => answers[item.id] === item.answer).length;
  const percent = qs.length ? Math.round(correct / qs.length * 100) : 0;
  const goQuestion = n => { setQuizIndex(Math.max(0, Math.min(n, qs.length - 1))); setShowExplain(true); };
  const choose = n => {
    if (!q || revealed) return;
    if (mode === 'exam') setExamAnswers(prev => ({ ...prev, [q.id]: n }));
    else setChosen(prev => ({ ...prev, [q.id]: n }));
  };
  const resetExam = (nextMode = mode, nextChapter = chapter, nextDuration = duration) => {
    setMode(nextMode); setChapter(nextChapter); setDuration(nextDuration);
    setExamAnswers({}); setExamDone(false); finishLock.current = false;
    setSeconds(nextDuration * 60); setStartedAt(nextMode === 'exam' ? Date.now() : null);
    setQuizIndex(0); setShowExplain(true);
  };
  const checkAnswer = () => {
    if (!q || answer === undefined || revealed || mode !== 'practice') return;
    setSubmitted(prev => ({ ...prev, [q.id]: true }));
    update('wrong', answer === q.answer ? wrong.filter(id => id !== q.id) : [...new Set([...wrong, q.id])]);
    setShowExplain(true);
  };
  const finishExam = () => {
    if (examDone || finishLock.current || mode !== 'exam') return;
    finishLock.current = true;
    const wrongIds = qs.filter(item => examAnswers[item.id] !== item.answer).map(item => item.id);
    const nextWrong = [...new Set([...wrong, ...wrongIds])];
    update('wrong', nextWrong);
    const record = { id: `practice-${Date.now()}`, type: 'exam', chapter, total: qs.length,
      answered: qs.filter(item => examAnswers[item.id] !== undefined).length,
      correct: qs.filter(item => examAnswers[item.id] === item.answer).length,
      durationSeconds: duration * 60 - seconds, date: new Date().toISOString() };
    setHistory(prev => [record, ...prev]);
    // Không ghi đè các cấu trúc attempts cũ của những tính năng khác.
    try { const prev = JSON.parse(localStorage.getItem('xstk-practice-exams-v2') || '[]');
      localStorage.setItem('xstk-practice-exams-v2', JSON.stringify([record, ...prev].slice(0, 50))); } catch { /* Trình duyệt có thể chặn lưu trữ */ }
    setExamDone(true); setShowExplain(true);
  };
  useEffect(() => {
    if (mode !== 'exam' || examDone || startedAt === null) return;
    const tick = () => setSeconds(Math.max(0, duration * 60 - Math.floor((Date.now() - startedAt) / 1000)));
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [mode, examDone, duration, startedAt]);
  useEffect(() => { if (mode === 'exam' && seconds === 0 && !examDone) finishExam(); }, [mode, seconds, examDone]);
  useEffect(() => {
    const handle = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat || !q) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
      const n = 'abcd'.indexOf(e.key.toLowerCase());
      if (n >= 0 && n < q.options.length && !revealed) { e.preventDefault(); choose(n); }
      if (e.key === 'Enter' && revealed && index < qs.length - 1) { e.preventDefault(); goQuestion(index + 1); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [q, revealed, index, mode, examDone, qs.length]);
  const timeString = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  if (mode === 'mixed') return <MixedExamPage onBack={() => resetExam('practice')} />;
  return <section className="practice-v2">
    <PageHeading eyebrow="PHÒNG THỰC HÀNH 2.0" title="Luyện tập thông minh" desc="Học từ mỗi câu hỏi, thi thử đúng thời gian và ôn lại những câu chưa vững." />
    <div className="pv2-toolbar">
      <div className="pv2-bank"><Calculator size={22}/><div><strong>Ngân hàng câu hỏi</strong><span>{qs.length} câu · {answered} câu đã chọn</span></div></div>
      <div className="pv2-controls">
        <label>Chế độ<select aria-label="Chế độ làm bài" value={mode} onChange={e => resetExam(e.target.value)}><option value="practice">Luyện tập</option><option value="exam">Thi thử</option><option value="mixed">Thi kết hợp (trắc nghiệm + tự luận)</option></select></label>
        <label>Chương<select aria-label="Chọn chương" value={chapter} onChange={e => resetExam(mode, e.target.value)}><option value="all">Tất cả chương</option>{chapters.map(c => <option key={c.id} value={c.id}>Chương {c.id} · {c.short}</option>)}</select></label>
        {mode === 'exam' && <label>Thời gian<select aria-label="Thời gian thi thử" value={duration} onChange={e => resetExam(mode, chapter, Number(e.target.value))} disabled={answered > 0 && !examDone}><option value={10}>10 phút</option><option value={15}>15 phút</option><option value={30}>30 phút</option></select></label>}
      </div>
    </div>
    {mode === 'exam' && <div className="pv2-exam-strip" role="status"><span><Clock3 size={18}/> Còn lại <strong>{timeString}</strong></span><span>Chỉ hiển thị đáp án sau khi nộp bài</span><button type="button" onClick={finishExam} disabled={examDone || !qs.length}>{examDone ? 'Đã nộp bài' : 'Nộp bài thi'}</button></div>}
    {qs.length === 0 ? <div className="pv2-empty"><CircleHelp size={28}/><strong>Chưa có câu hỏi cho chương này</strong><p>Hãy chọn “Tất cả chương” để tiếp tục luyện tập.</p><button className="primary-button" onClick={() => resetExam(mode, 'all')}>Xem tất cả câu hỏi</button></div> : <>
      <div className="pv2-steps" aria-label="Chọn câu hỏi">{qs.map((item, n) => {
        const done = answers[item.id] !== undefined; const evaluated = mode === 'exam' ? examDone : !!submitted[item.id];
        return <button key={item.id} type="button" aria-label={`Câu ${n+1}${done?' đã chọn đáp án':''}`} aria-current={index === n ? 'step' : undefined} title={`Câu ${n+1}`} className={`pv2-step ${index === n ? 'current' : ''} ${done ? 'answered' : ''} ${evaluated ? (answers[item.id] === item.answer ? 'right' : 'wrong') : ''}`} onClick={() => goQuestion(n)}>{n+1}</button>;
      })}</div>
      <article className="pv2-question-card">
        <div className="pv2-question-head"><div><span className="pv2-chip">Chương {q.chapterId}</span><span className="pv2-chip muted">{q.difficulty}</span></div><strong>Câu {index+1}/{qs.length}</strong></div>
        <div className="pv2-progress" role="progressbar" aria-label="Tiến độ làm bài" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={qs.length}><span style={{width:`${answered / qs.length * 100}%`}}/></div>
        <div className="pv2-prompt"><MathMarkdown>{q.prompt}</MathMarkdown></div>
        <div className="pv2-options">{q.options.map((opt, n) => <button key={n} type="button" disabled={revealed} aria-pressed={answer === n} onClick={() => choose(n)} className={`pv2-option ${answer === n ? 'picked' : ''} ${revealed && n === q.answer ? 'correct' : ''} ${revealed && n === answer && n !== q.answer ? 'incorrect' : ''}`}><span className="pv2-letter">{String.fromCharCode(65+n)}</span><span className="pv2-option-content"><MathMarkdown>{opt}</MathMarkdown></span>{revealed && n === q.answer && <CheckCircle2 size={20} aria-label="Đáp án đúng"/>}{revealed && n === answer && n !== q.answer && <X size={20} aria-label="Đáp án sai"/>}</button>)}</div>
        {revealed && <div className={`pv2-feedback ${answer === q.answer ? 'is-correct' : 'is-wrong'}`}><button type="button" aria-expanded={showExplain} onClick={() => setShowExplain(!showExplain)}><span>{answer === q.answer ? '✓ Chính xác!' : answer === undefined ? 'Chưa trả lời' : 'Cần ôn lại'} · Giải thích</span><ChevronDown size={18}/></button>{showExplain && <div className="pv2-explain"><MathMarkdown>{q.explanation}</MathMarkdown></div>}</div>}
        <div className="pv2-actions"><button className="secondary-button" disabled={index === 0} onClick={() => goQuestion(index - 1)}>← Câu trước</button><button className="secondary-button" disabled={index === qs.length - 1} onClick={() => goQuestion(index + 1)}>Bỏ qua</button>{mode === 'practice' && !revealed && <button className="primary-button" disabled={answer === undefined} onClick={checkAnswer}>Kiểm tra đáp án</button>}{revealed && index < qs.length - 1 && <button className="primary-button" onClick={() => goQuestion(index + 1)}>Câu tiếp theo <ArrowRight size={16}/></button>}{mode === 'exam' && !examDone && <button className="primary-button" disabled={index === qs.length - 1} onClick={() => goQuestion(index + 1)}>Câu sau <ArrowRight size={16}/></button>}</div>
      </article>
      {mode === 'exam' && examDone && <section className="pv2-results" aria-live="polite"><div><Trophy size={27}/><div><h3>Kết quả thi thử</h3><p>{correct}/{qs.length} câu đúng · {percent}% · {answered}/{qs.length} câu đã trả lời</p></div></div><button className="primary-button" onClick={() => resetExam('exam')}>Làm bài thi mới</button></section>}
      <div className="pv2-footer"><div><RotateCcw size={20}/><span><strong>Ôn câu sai</strong><small>Các câu trả lời sai được lưu trong mục “Ôn tập câu sai”.</small></span></div><strong>{wrong.length} câu cần ôn</strong></div>
      <p className="pv2-shortcuts">Phím tắt: A/B/C/D để chọn đáp án · Enter để sang câu tiếp theo sau khi xem kết quả.</p>
    </>}
  </section>;
}

function MixedExamPage({onBack}) {
  const [chapter,setChapter]=useState('3');
  const [difficulty,setDifficulty]=useState('medium');
  const [mcCount,setMcCount]=useState(5);
  const [essayCount,setEssayCount]=useState(2);
  const [duration,setDuration]=useState(30);
  const [items,setItems]=useState([]);
  const [responses,setResponses]=useState({});
  const [phase,setPhase]=useState('setup');
  const [index,setIndex]=useState(0);
  const [endsAt,setEndsAt]=useState(0);
  const [remaining,setRemaining]=useState(0);
  const [grades,setGrades]=useState({});
  const [error,setError]=useState('');
  const [gradingStatus,setGradingStatus]=useState('');
  const finishing=useRef(false);
  const responseRef=useRef({});
  const questionsRef=useRef([]);
  const chapterRef=useRef(chapter);
  const setResponse=(id,value)=>{responseRef.current={...responseRef.current,[id]:value};setResponses(responseRef.current);};
  const generate=async()=>{
    setError('');setPhase('loading');setItems([]);setGrades({});setIndex(0);finishing.current=false;
    try {
      const request=async(type,count)=>{
        if(!count)return [];
        const r=await fetch('https://xstk-academy.onrender.com/api/practice/generate',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({chapter,difficulty,type,count})
        });
        const data=await r.json();
        if(!r.ok)throw new Error(data.error||'API tạo đề không hoạt động.');
        if(!Array.isArray(data.questions)||data.questions.length!==count)throw new Error('AI trả về thiếu số câu đã chọn. Vui lòng thử lại.');
        return data.questions.map((q,i)=>({...q,id:`mixed-${type}-${i}`,type}));
      };
      const [multiple,essay]=await Promise.all([request('multiple',mcCount),request('essay',essayCount)]);
      const all=[...multiple,...essay];
      if(!all.length)throw new Error('Hãy chọn ít nhất một câu hỏi.');
      questionsRef.current=all;chapterRef.current=chapter;responseRef.current={};setResponses({});
      setItems(all);setRemaining(duration*60);setEndsAt(Date.now()+duration*60000);setPhase('taking');
    }catch(e){setError(e.message||'Không tạo được đề.');setPhase('setup');}
  };
  const finish=async()=>{
    if(finishing.current)return;
    finishing.current=true;setPhase('grading');setError('');
    const all=questionsRef.current,answers=responseRef.current;
    const initial={};
    for(const q of all.filter(q=>q.type==='multiple')){
      const selected=answers[q.id];
      initial[q.id]={score:selected!==undefined&&selected!==''&&Number(selected)===Number(q.correctIndex)?10:0,max:10,method:'auto'};
    }
    setGrades(initial);
    const essay=all.filter(q=>q.type==='essay');
    const updated={...initial};
    for(let i=0;i<essay.length;i++){
      const q=essay[i],studentAnswer=String(answers[q.id]||'').trim();
      setGradingStatus(`Đang chấm tự luận ${i+1}/${essay.length}...`);
      if(!studentAnswer){updated[q.id]={score:0,max:10,method:'empty',feedback:'Không có bài làm.'};continue;}
      try{
        const r=await fetch('https://xstk-academy.onrender.com/api/grade',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({problem:`${q.prompt}\n\nYÊU CẦU CHẤM ĐIỂM: Đánh giá bài làm theo thang 10; dòng đầu tiên phải có định dạng chính xác "Điểm: X/10" với X từ 0 đến 10. Sau đó nhận xét, chỉ lỗi và trình bày lời giải tham khảo.`,studentAnswer,chapter:chapterRef.current,level:'chi-tiet'})
        });
        const data=await r.json();if(!r.ok)throw new Error(data.error||'API chấm tự luận bị lỗi.');
        const feedback=typeof data.answer==='string'?data.answer:typeof data.feedback==='string'?data.feedback:'';
        const explicit=feedback.match(/(?:điểm|score)\s*[:：]\s*(10(?:[.,]0+)?|[0-9](?:[.,][0-9]+)?)\s*\/\s*10\b/i);
        const score=explicit?Number(explicit[1].replace(',','.')):null;
        updated[q.id]=score!==null&&score>=0&&score<=10?{score,max:10,method:'ai',feedback}:{score:null,max:10,method:'pending',feedback:feedback||'AI chưa trả về nhận xét có thể đọc được.'};
      }catch(e){updated[q.id]={score:null,max:10,method:'error',feedback:e.message||'Không thể chấm tự luận.'};}
      setGrades({...updated});
    }
    setGrades({...updated});setGradingStatus('');setPhase('done');
    try{const prev=JSON.parse(localStorage.getItem('xstk-mixed-exams-v1')||'[]');
      const record={date:new Date().toISOString(),chapter:chapterRef.current,duration,mcCount,essayCount,
        scores:Object.values(updated).map(g=>g.score),pending:Object.values(updated).filter(g=>g.score===null).length};
      localStorage.setItem('xstk-mixed-exams-v1',JSON.stringify([record,...prev].slice(0,30)));
    }catch{/* localStorage có thể bị khóa */}
  };
  useEffect(()=>{
    if(phase!=='taking')return;
    const tick=()=>setRemaining(Math.max(0,Math.ceil((endsAt-Date.now())/1000)));
    tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[phase,endsAt]);
  useEffect(()=>{if(phase==='taking'&&remaining===0)finish();},[phase,remaining]);
  const current=items[index];
  const graded=items.filter(q=>grades[q.id]?.score!==null&&grades[q.id]?.score!==undefined);
  const scoreTotal=graded.reduce((sum,q)=>sum+grades[q.id].score,0);
  const pending=items.length-graded.length;
  const finalScore=items.length&&pending===0?Math.round(scoreTotal/items.length*100)/10:null;
  return <section className="practice-v2 mixed-exam">
    <button className="back-button" onClick={onBack}>← Trở về phòng thực hành</button>
    <PageHeading eyebrow="PHÒNG THỰC HÀNH 2.1" title="Thi kết hợp trắc nghiệm & tự luận" desc="Chọn số câu mỗi loại, làm bài có giới hạn thời gian, chấm trắc nghiệm tự động và chấm tự luận bằng AI." />
    {phase==='setup'&&<div className="mixed-setup">
      <div className="mixed-grid">
        <label>Chương<select value={chapter} onChange={e=>setChapter(e.target.value)}>{chapters.map(c=><option key={c.id} value={String(c.id)}>Chương {c.id} · {c.short}</option>)}</select></label>
        <label>Độ khó<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select></label>
        <label>Số câu trắc nghiệm<select value={mcCount} onChange={e=>setMcCount(Number(e.target.value))}>{[0,3,5,10,15,20].map(n=><option key={n} value={n}>{n} câu</option>)}</select></label>
        <label>Số câu tự luận<select value={essayCount} onChange={e=>setEssayCount(Number(e.target.value))}>{[0,1,2,3,5,10].map(n=><option key={n} value={n}>{n} câu</option>)}</select></label>
        <label>Thời gian<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[15,30,45,60,90,120].map(n=><option key={n} value={n}>{n} phút</option>)}</select></label>
      </div>
      <p>Đề gồm <strong>{mcCount+essayCount} câu</strong>. Mỗi câu tối đa 10 điểm; điểm tổng kết tính theo trung bình các câu. Câu tự luận do AI chấm nên cần kiểm tra lại nếu dùng để đánh giá chính thức.</p>
      {error&&<div className="solver-error">{error}</div>}
      <button className="primary-button" disabled={mcCount+essayCount===0} onClick={generate}>✨ Tạo đề & bắt đầu thi</button>
    </div>}
    {phase==='loading'&&<div className="mixed-setup">AI đang tạo {mcCount+essayCount} câu hỏi. Vui lòng đợi...</div>}
    {phase==='taking'&&current&&<>
      <div className="pv2-exam-strip"><span><Clock3 size={18}/> Còn lại <strong>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</strong></span><span>Đã làm {items.filter(q=>String(responses[q.id]??'').trim()!=='').length}/{items.length} câu</span><button onClick={finish}>Nộp bài</button></div>
      <div className="pv2-steps">{items.map((q,i)=><button key={q.id} className={`pv2-step ${i===index?'current':''} ${String(responses[q.id]??'').trim()!==''?'answered':''}`} onClick={()=>setIndex(i)} title={q.type==='essay'?'Tự luận':'Trắc nghiệm'}>{i+1}</button>)}</div>
      <article className="pv2-question-card">
        <div className="pv2-question-head"><span className="pv2-chip">{current.type==='essay'?'TỰ LUẬN':'TRẮC NGHIỆM'}</span><strong>Câu {index+1}/{items.length}</strong></div>
        <div className="pv2-prompt"><MathMarkdown>{current.prompt}</MathMarkdown></div>
        {current.type==='multiple'?<div className="pv2-options">{(current.options||[]).map((opt,n)=><button key={n} className={`pv2-option ${Number(responses[current.id])===n&&responses[current.id]!==undefined?'picked':''}`} onClick={()=>setResponse(current.id,n)}><span className="pv2-letter">{String.fromCharCode(65+n)}</span><span className="pv2-option-content"><MathMarkdown>{opt}</MathMarkdown></span></button>)}</div>:<textarea className="mixed-essay" aria-label="Bài làm tự luận" placeholder="Trình bày các bước giải, công thức, phép tính và kết luận..." value={responses[current.id]||''} onChange={e=>setResponse(current.id,e.target.value)} />}
        <div className="pv2-actions"><button className="secondary-button" disabled={index===0} onClick={()=>setIndex(i=>i-1)}>← Câu trước</button><button className="primary-button" disabled={index===items.length-1} onClick={()=>setIndex(i=>i+1)}>Câu tiếp theo →</button></div>
      </article>
    </>}
    {phase==='grading'&&<div className="mixed-setup"><strong>Đã nhận bài thi.</strong><p>{gradingStatus||'Đang chấm điểm...'}</p><p>Không đóng trang khi đang chấm tự luận.</p></div>}
    {phase==='done'&&<div className="mixed-setup">
      <h2>Kết quả bài thi</h2><div className="mixed-score">{finalScore===null?'Đang thiếu điểm tự luận':`${finalScore.toFixed(1)}/10`}</div>
      <p>Trắc nghiệm: {items.filter(q=>q.type==='multiple'&&grades[q.id]?.score===10).length}/{items.filter(q=>q.type==='multiple').length} câu đúng. {pending>0?`${pending} câu chưa được AI trả điểm hợp lệ; chưa thể kết luận điểm tổng.`:'Đã chấm tất cả các câu.'}</p>
      {items.map((q,i)=><div key={q.id} className="mixed-result-item"><strong>Câu {i+1} · {q.type==='essay'?'Tự luận':'Trắc nghiệm'} · {grades[q.id]?.score===null?'Chưa chấm được':`${grades[q.id]?.score}/10`}</strong><div><MathMarkdown>{q.prompt}</MathMarkdown></div>{q.type==='multiple'?<p>Đáp án đúng: {String.fromCharCode(65+Number(q.correctIndex))}. Bạn chọn: {responses[q.id]===undefined?'Bỏ trống':String.fromCharCode(65+Number(responses[q.id]))}.</p>:<><p><strong>Bài làm:</strong> {responses[q.id]||'(Bỏ trống)'}</p><div className="mixed-feedback"><MathMarkdown>{grades[q.id]?.feedback||'Chưa có nhận xét.'}</MathMarkdown></div></>}</div>)}
      <button className="primary-button" onClick={()=>{setPhase('setup');setItems([]);setGrades({});setError('');}}>Tạo đề thi mới</button>
    </div>}
  </section>;
}

function AIPracticeGenerator() {
  const [chapter,setChapter]=useState('3');
  const [difficulty,setDifficulty]=useState('medium');
  const [type,setType]=useState('mixed');
  const [count,setCount]=useState(10);
  const [items,setItems]=useState([]);
  const [responses,setResponses]=useState({});
  const [revealed,setRevealed]=useState({});
  const [feedback,setFeedback]=useState({});
  const [loading,setLoading]=useState(false);
  const [busyId,setBusyId]=useState(null);
  const [error,setError]=useState('');
  const [showAnswers,setShowAnswers]=useState(false);
  const generate=async()=>{
    if(loading)return;
    setLoading(true);setError('');setItems([]);setResponses({});setRevealed({});setFeedback({});setShowAnswers(false);
    try{
      const r=await fetch('https://xstk-academy.onrender.com/api/practice/generate',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chapter,difficulty,type,count})
      });
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||'Không thể tạo bộ đề.');
      if(!Array.isArray(data.questions)||data.questions.length!==count)throw new Error('Bộ đề AI trả về thiếu câu hỏi, hãy thử tạo lại.');
      setItems(data.questions);
    }catch(e){setError(e.message||'Không thể kết nối AI.');}
    finally{setLoading(false);}
  };
  const gradeEssay=async(q)=>{
    const studentAnswer=(responses[q.id]||'').trim();
    if(!studentAnswer||busyId)return;
    setBusyId(q.id);setError('');
    try{
      const r=await fetch('https://xstk-academy.onrender.com/api/grade',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({problem:q.prompt,studentAnswer,chapter,level:'ngan-gon'})
      });
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Không chấm được bài.');
      setFeedback(prev=>({...prev,[q.id]:data.answer}));
      setRevealed(prev=>({...prev,[q.id]:true}));
    }catch(e){setError(e.message||'Không chấm được bài.');}
    finally{setBusyId(null);}
  };
  const mc=items.filter(q=>q.type==='multiple');
  const attempted=mc.filter(q=>revealed[q.id]);
  const correct=attempted.filter(q=>Number(responses[q.id])===q.correctIndex).length;
  return <>
    <PageHeading eyebrow="PHASE 20.3 · AI PRACTICE GENERATOR" title="AI tạo đề luyện tập" desc="Tạo đề mới theo chương, độ khó và hình thức; làm bài, kiểm tra đáp án và chấm tự luận bằng AI."/>
    <section className="solver-card" style={{marginBottom:20}}>
      <div className="solver-controls" style={{display:'flex',gap:16,flexWrap:'wrap'}}>
        <div><label htmlFor="ai-practice-chapter">Chương</label><select id="ai-practice-chapter" value={chapter} onChange={e=>setChapter(e.target.value)}>{chapters.map(c=><option key={c.id} value={String(c.id)}>Chương {c.id}: {c.short}</option>)}</select></div>
        <div><label htmlFor="ai-practice-difficulty">Độ khó</label><select id="ai-practice-difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select></div>
        <div><label htmlFor="ai-practice-type">Hình thức</label><select id="ai-practice-type" value={type} onChange={e=>setType(e.target.value)}><option value="multiple">Trắc nghiệm</option><option value="essay">Tự luận</option><option value="mixed">Kết hợp</option></select></div>
        <div><label htmlFor="ai-practice-count">Số câu</label><select id="ai-practice-count" value={count} onChange={e=>setCount(Number(e.target.value))}><option value={5}>5 câu</option><option value={10}>10 câu</option><option value={20}>20 câu</option></select></div>
      </div>
      <button type="button" className="primary-button" disabled={loading} onClick={generate} style={{marginTop:16}}>{loading?'AI đang tạo đề...':'✨ Tạo bộ đề mới'}</button>
      <p className="solver-privacy">Mặc định: chương 3 · trung bình · kết hợp · 10 câu. Đáp án AI có thể sai; hãy kiểm tra lại các phép tính.</p>
      {error&&<div className="solver-error"><strong>Thông báo</strong><p>{error}</p><button className="secondary-button" onClick={submit}>Thử lại</button></div>}
    </section>
    {items.length>0&&<>
      <div className="section-heading"><div><h2>Bộ đề {items.length} câu</h2><p>{attempted.length}/{mc.length} câu trắc nghiệm đã kiểm tra · {correct} câu đúng</p></div><button className="secondary-button" onClick={()=>setShowAnswers(x=>!x)}>{showAnswers?'Ẩn đáp án tham khảo':'Hiện đáp án tham khảo'}</button></div>
      {items.map((q,i)=><section key={q.id} className="quiz-card" style={{marginBottom:18}}>
        <div className="quiz-top"><span className="pill">CÂU {i+1} · {q.type==='multiple'?'TRẮC NGHIỆM':'TỰ LUẬN'}</span><span className="difficulty">{difficulty}</span></div>
        <div className="solver-answer"><MathMarkdown>{q.prompt}</MathMarkdown></div>
        {q.type==='multiple'?<>
          <div className="answer-options">{q.options.map((opt,j)=><button type="button" key={j} disabled={!!revealed[q.id]} className={`answer-option ${Number(responses[q.id])===j?'selected':''} ${revealed[q.id]&&j===q.correctIndex?'correct':''} ${revealed[q.id]&&Number(responses[q.id])===j&&j!==q.correctIndex?'incorrect':''}`} onClick={()=>setResponses(p=>({...p,[q.id]:String(j)}))}><span className="option-letter">{String.fromCharCode(65+j)}</span><span>{opt}</span></button>)}</div>
          <button className="primary-button" type="button" disabled={responses[q.id]===undefined||!!revealed[q.id]} onClick={()=>setRevealed(p=>({...p,[q.id]:true}))}>Kiểm tra đáp án</button>
          {revealed[q.id]&&<p><strong>{Number(responses[q.id])===q.correctIndex?'Chính xác!':'Chưa chính xác.'}</strong> Đáp án: {String.fromCharCode(65+q.correctIndex)}</p>}
        </>:<>
          <label htmlFor={`essay-${q.id}`}>Bài làm của bạn</label><textarea id={`essay-${q.id}`} rows={5} value={responses[q.id]||''} onChange={e=>setResponses(p=>({...p,[q.id]:e.target.value}))} placeholder="Trình bày dữ kiện, công thức, thay số và kết luận..."/>
          <button className="primary-button" type="button" disabled={!String(responses[q.id]||'').trim()||busyId!==null} onClick={()=>gradeEssay(q)}>{busyId===q.id?'AI đang chấm...':'Chấm bài tự luận'}</button>
          {feedback[q.id]&&<div className="solver-answer" style={{marginTop:16}}><MathMarkdown>{feedback[q.id]}</MathMarkdown></div>}
        </>}
        {(showAnswers||revealed[q.id])&&<div className="explanation good" style={{marginTop:14}}><strong>Giải thích / đáp án tham khảo</strong><div className="solver-answer"><MathMarkdown>{q.explanation}</MathMarkdown></div></div>}
      </section>)}
    </>}
  </>;
}

// Chuyển ảnh sang JPEG dung lượng phù hợp giới hạn backend (4 MB/ảnh).
async function prepareSolverImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không thể xử lý ảnh này.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let quality = 0.88;
    let result = canvas.toDataURL('image/jpeg', quality);
    while (result.length > 5_000_000 && quality > 0.35) {
      quality -= 0.12;
      result = canvas.toDataURL('image/jpeg', quality);
    }
    if (result.length > 5_000_000) {
      throw new Error('Ảnh quá lớn. Hãy chụp lại hoặc giảm độ phân giải.');
    }
    return result;
  } finally {
    bitmap.close?.();
  }
}

function SolvePage({ initialProblem = '', onSaveNote = () => {} }) {
  const [mode, setMode] = useState('solve');
  const [problem, setProblem] = useState(initialProblem);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [problemImages, setProblemImages] = useState([]);
  const [answerImages, setAnswerImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [chapter, setChapter] = useState('auto');
  const [level, setLevel] = useState('chi-tiet');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const problemPickerRef = useRef(null);
  const answerPickerRef = useRef(null);

  useEffect(() => {
    if (initialProblem) setProblem(initialProblem);
  }, [initialProblem]);

  const changeMode = (next) => {
    if (loading || next === mode) return;
    setMode(next);
    setAnswer('');
    setError('');
  };

  const addImages = async (event, target) => {
    const files = Array.from(event.target.files || []);
    if (event.target.value !== undefined) event.target.value = '';
    if (!files.length) return;
    const existing = problemImages.length + answerImages.length;
    if (existing + files.length > 3) {
      setError('Tổng cộng chỉ được tải tối đa 3 ảnh cho mỗi lần gửi AI.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const prepared = await Promise.all(files.map(async file => ({
        name: file.name,
        data: await prepareSolverImage(file)
      })));
      if (target === 'problem') setProblemImages(old => [...old, ...prepared]);
      else setAnswerImages(old => [...old, ...prepared]);
    } catch (e) {
      setError(e.message || 'Không thể xử lý ảnh.');
    } finally {
      setUploading(false);
    }
  };
  const removeImage = (target, index) => {
    if (target === 'problem') setProblemImages(old => old.filter((_, i) => i !== index));
    else setAnswerImages(old => old.filter((_, i) => i !== index));
  };
  useEffect(()=>{const paste=e=>{const files=Array.from(e.clipboardData?.files||[]).filter(f=>f.type.startsWith('image/'));if(files.length){e.preventDefault();addImages({target:{files,value:''}},mode==='grade'&&document.activeElement?.id==='student-answer-input'?'answer':'problem');}};document.addEventListener('paste',paste);return()=>document.removeEventListener('paste',paste);},[mode,problemImages,answerImages,loading,uploading]);
  const imagePicker = (target, items, title) => {
    const inputRef=target==='problem'?problemPickerRef:answerPickerRef;
    return <div className="solver-upload"><label className="solver-field-label">{title}</label><div className="solver-dropzone" role="button" tabIndex={0} aria-label={`${title}, bấm hoặc kéo ảnh vào đây`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inputRef.current?.click();}}} onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));addImages({target:{files,value:''}},target);}}><UploadCloud size={25}/><strong>Kéo ảnh vào đây hoặc bấm để chọn</strong><small>JPG, PNG, WebP · tối đa 3 ảnh · Có thể dán bằng Ctrl+V</small><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={loading||uploading||problemImages.length+answerImages.length>=3} onChange={e=>addImages(e,target)} onClick={e=>e.stopPropagation()} /></div>{items.length>0&&<div className="solver-thumbnails">{items.map((item,index)=><div key={`${target}-${index}`}><img src={item.data} alt={`Ảnh đã tải: ${item.name}`} /><button aria-label={`Xóa ${item.name}`} onClick={()=>removeImage(target,index)}><X size={15}/></button></div>)}</div>}</div>;
  };

  const submit = async () => {
    if (loading || uploading || (!problem.trim() && !problemImages.length) || (mode === 'grade' && !studentAnswer.trim() && !answerImages.length)) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const endpoint = mode === 'grade' ? '/api/grade' : '/api/solve';
      const response = await fetch(`https://xstk-academy.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problem.trim() || (problemImages.length ? '[Đề bài trong ảnh đính kèm]' : ''),
          ...(mode === 'grade' ? { studentAnswer: studentAnswer.trim() || (answerImages.length ? '[Bài làm trong ảnh đính kèm]' : '') } : {}),
          images: [...problemImages, ...(mode === 'grade' ? answerImages : [])].map(item => item.data),
          chapter,
          level
        })
      });
      const data = await response.json().catch(() => {
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
      });
      if (!response.ok) throw new Error(data?.error || `Máy chủ AI gặp lỗi (${response.status}).`);
      if (typeof data?.answer !== 'string' || !data.answer.trim()) {
        throw new Error('AI chưa trả về kết quả. Vui lòng thử lại.');
      }
      setAnswer(data.answer);
    } catch (e) {
      setError(e instanceof TypeError && e.message === 'Failed to fetch'
        ? 'Không kết nối được máy chủ AI. Kiểm tra Render và cấu hình CORS.'
        : e?.message || 'Có lỗi khi xử lý yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageHeading
      eyebrow="TRỢ GIẢNG XSTK"
      title={mode === 'grade' ? 'Chấm điểm bài làm bằng AI' : 'Giải bài tập từng bước'}
      desc={mode === 'grade'
        ? 'Nhập đề bài và bài làm để AI nhận xét, chấm điểm theo thang 10 và hướng dẫn sửa lỗi.'
        : 'Nhập nguyên đề bài. Trợ giảng sẽ nhận diện dữ kiện, chọn công thức và giải từng bước.'}
    />
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      <button type="button" className={mode === 'solve' ? 'primary-button' : 'secondary-button'} onClick={() => changeMode('solve')} disabled={loading}>
        <Sparkles size={16}/> Giải bài tập
      </button>
      <button type="button" className={mode === 'grade' ? 'primary-button' : 'secondary-button'} onClick={() => changeMode('grade')} disabled={loading}>
        <Award size={16}/> Chấm điểm bài làm
      </button>
    </div>
    <div className="solver-layout">
      <section className="solver-card">
        <label htmlFor="problem-input">Đề bài của bạn</label>
        <textarea id="problem-input" value={problem} onChange={e => setProblem(e.target.value)} rows={6}
          placeholder="Nhập đề bài hoặc tải ảnh chụp đề bài..."/>
        <div className="solver-helpers"><button className="secondary-button" onClick={()=>setPreview(!preview)}>{preview?'Ẩn':'Xem trước'} công thức</button><button className="solver-example" onClick={()=>setProblem('Một hệ thống ghi nhận trung bình 6 lỗi mỗi giờ theo phân phối Poisson. Tính xác suất có đúng 2 lỗi trong 10 phút.')}>Ví dụ: Poisson</button><button className="solver-example" onClick={()=>setProblem('X có phân phối chuẩn với trung bình 80 và độ lệch chuẩn 8. Tính P(X > 90).')}>Ví dụ: Phân phối chuẩn</button></div>{preview&&<div className="solver-preview"><MathMarkdown>{problem}</MathMarkdown></div>}
        {imagePicker('problem', problemImages, 'Tải ảnh đề bài')}
        {mode === 'grade' && <>
          <label htmlFor="student-answer-input" style={{ display: 'block', marginTop: 18 }}>Bài làm của bạn</label>
          <textarea id="student-answer-input" value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} rows={8}
            placeholder="Nhập bài làm hoặc tải ảnh chụp bài làm..."/>
          {imagePicker('answer', answerImages, 'Tải ảnh bài làm để chấm')}
          <p className="solver-privacy">AI chấm theo thang điểm 10 và giải thích lỗi sai. Điểm số chỉ mang tính tham khảo.</p>
        </>}
        <div className="solver-controls">
          <div>
            <label htmlFor="chapter-select">Chủ đề</label>
            <select id="chapter-select" value={chapter} onChange={e => setChapter(e.target.value)}>
              <option value="auto">Tự nhận diện</option>
              {chapters.map(c => <option key={c.id} value={String(c.id)}>Bài {c.id}: {c.short}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="level-select">Cách trình bày</label>
            <select id="level-select" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="chi-tiet">Giải thích chi tiết</option>
              <option value="ngan-gon">Công thức và tính toán ngắn gọn</option>
              <option value="goi-y">Gợi ý từng bước</option>
            </select>
          </div>
        </div>
        <button type="button" className="primary-button solver-submit" onClick={submit}
          disabled={(!problem.trim() && !problemImages.length) || loading || uploading || (mode === 'grade' && !studentAnswer.trim() && !answerImages.length)}>
          {loading ? <><span className="spinner"/> {mode === 'grade' ? 'AI đang chấm...' : 'Đang giải...'}</>
            : mode === 'grade' ? <><Award size={16}/> Chấm điểm bài làm</>
              : <><Sparkles size={16}/> Giải bài từng bước</>}
        </button>
        {!problem.trim()&&!problemImages.length&&<p className="solver-privacy">Nhập đề bài hoặc tải ảnh để bắt đầu.</p>}
        <p className="solver-privacy">Không nhập thông tin cá nhân. Hãy kiểm tra lại kết quả do AI tạo.</p>
        {error && <div className="solver-error"><strong>Chưa xử lý được</strong><p>{error}</p><button className="secondary-button" onClick={submit}>Thử lại</button></div>}
      </section>
      <section className="solver-result">
        <div className="solver-result-head">
          <div className="solver-result-icon">{mode === 'grade' ? <Award size={20}/> : <Sigma size={20}/>}</div>
          <div><h2>{mode === 'grade' ? 'Kết quả chấm điểm' : 'Lời giải'}</h2>
            <p>{mode === 'grade' ? 'Điểm, nhận xét và hướng dẫn sửa lỗi sẽ hiển thị tại đây' : 'Các bước sẽ hiển thị tại đây'}</p>
          </div>
        </div>
        {answer ? <div className="solver-answer"><div className="solver-answer-actions"><button className="secondary-button" onClick={()=>navigator.clipboard?.writeText(answer)}><Copy size={15}/> Sao chép</button><button className="secondary-button" onClick={()=>onSaveNote(answer)}><Bookmark size={15}/> Lưu vào sổ tay</button><button className="secondary-button" onClick={()=>{setProblem(p=>`${p}\nHãy giải thích rõ hơn bước tôi chưa hiểu trong lời giải trước.`);setAnswer('')}}><CircleHelp size={15}/> Hỏi thêm</button></div><MathMarkdown>{answer}</MathMarkdown></div>
          : <div className="solver-empty">
              <div className="solver-empty-icon">{mode === 'grade' ? <Award size={25}/> : <NotebookPen size={25}/>}</div>
              <strong>{mode === 'grade' ? 'Sẵn sàng chấm bài của bạn' : 'Hãy bắt đầu từ đề bài'}</strong>
              <p>{mode === 'grade'
                ? 'Nhập đề và bài làm để AI đánh giá công thức, phương pháp, tính toán và kết luận.'
                : 'Một lời giải tốt cần chỉ ra dữ kiện, công thức phù hợp, thay số và kết luận.'}</p>
              <div className="solver-checklist">
                <span><CheckCircle2 size={15}/> {mode === 'grade' ? 'Chấm theo thang 10' : 'Xác định dạng toán'}</span>
                <span><CheckCircle2 size={15}/> {mode === 'grade' ? 'Nhận xét bước làm đúng' : 'Nêu công thức và điều kiện'}</span>
                <span><CheckCircle2 size={15}/> {mode === 'grade' ? 'Chỉ ra lỗi sai' : 'Tính toán từng bước'}</span>
                <span><CheckCircle2 size={15}/> {mode === 'grade' ? 'Đưa lời giải tham khảo' : 'Kết luận dễ hiểu'}</span>
              </div>
            </div>}
      </section>
    </div>
  </>;
}

function ReviewPage({wrong,onPractice}) { const wrongQs=questions.filter(q=>wrong.includes(q.id));return <><PageHeading eyebrow="ÔN TẬP THÔNG MINH" title="Câu sai cần ôn tập" desc="Tập trung vào câu hỏi bạn đã trả lời chưa đúng." action={<button className="primary-button" onClick={onPractice}>Luyện tập <ArrowRight size={15}/></button>}/>{wrongQs.length?<div className="review-list">{wrongQs.map(q=><div className="review-card" key={q.id}><div className="review-icon"><RotateCcw size={17}/></div><div><span className="lesson-meta">CHƯƠNG {q.chapterId} · {q.topic}</span><h3>{q.prompt}</h3><p>{q.explanation}</p></div></div>)}</div>:<div className="empty-state"><CheckCircle2 size={28}/><strong>Chưa có câu sai cần ôn</strong><span>Hãy làm bài trong Phòng thực hành. Câu trả lời sai sẽ xuất hiện ở đây.</span><button className="primary-button" onClick={onPractice}>Bắt đầu luyện tập <ArrowRight size={15}/></button></div>}</>; }
function NotesPage({notes,note,setNote,activeNote,setActiveNote,update}) { const add=()=>{if(!note.trim())return;update('notes',[{id:Date.now(),text:note.trim(),createdAt:new Date().toLocaleDateString('vi-VN')},...notes]);setNote('');};const remove=(id)=>update('notes',notes.filter(n=>n.id!==id));return <><PageHeading eyebrow="GÓC GHI NHỚ" title="Sổ tay công thức" desc="Lưu lại công thức, lưu ý và cách giải do chính bạn ghi chép."/><div className="notes-layout"><div className="note-editor"><label htmlFor="note">Ghi chú mới</label><textarea id="note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ví dụ: Khi dùng Poisson, cần đổi λ theo độ dài khoảng thời gian..."/><div className="note-editor-footer"><span>{note.length} ký tự</span><button className="primary-button" onClick={add} disabled={!note.trim()}>Lưu ghi chú <Bookmark size={15}/></button></div></div><div className="notes-list"><div className="section-heading compact"><h2>Ghi chú của bạn <span className="count-badge">{notes.length}</span></h2></div>{notes.length?notes.map(n=><div className="saved-note" key={n.id}><div className="saved-note-top"><span><NotebookPen size={14}/>{n.createdAt}</span><button className="icon-button" onClick={()=>remove(n.id)} aria-label="Xóa ghi chú"><X size={15}/></button></div><p>{n.text}</p></div>):<div className="empty-state small-empty"><NotebookPen size={23}/><strong>Chưa có ghi chú</strong><span>Ghi lại công thức hoặc điều bạn hay nhầm.</span></div>}</div></div></>; }
function StatsPage({completed,xp,attempts}) { const byChapter=chapters.map(c=>{const ls=lessons.filter(l=>l.chapterId===c.id);return {...c,done:ls.filter(l=>completed.includes(l.id)).length,total:ls.length}});return <><PageHeading eyebrow="BÁO CÁO TIẾN BỘ" title="Thống kê kết quả học" desc="Theo dõi mức độ hoàn thành các chương trong hành trình XSTK."/><div className="stats-grid stats-grid-wide"><StatCard icon={BookOpen} label="Bài hoàn thành" value={completed.length} detail={`trên tổng ${lessons.length} bài`} tone="green"/><StatCard icon={Award} label="XP tích lũy" value={xp} detail="Điểm kinh nghiệm" tone="gold"/><StatCard icon={Activity} label="Chương đang học" value={byChapter.filter(c=>c.done>0&&c.done<c.total).length} detail="Đã bắt đầu nhưng chưa xong" tone="purple"/></div><div className="panel"><div className="section-heading compact"><h2>Tiến độ theo chương</h2></div><div className="chapter-progress-list">{byChapter.map(c=><div className="chapter-progress-row" key={c.id}><div className="chapter-progress-label"><span>Chương {c.id}</span><strong>{c.short}</strong></div><ProgressBar value={c.done/c.total*100}/><span className="progress-number">{c.done}/{c.total}</span></div>)}</div></div><div className="source-note stats-note"><CircleHelp size={17}/><span>Độ chính xác và thời gian làm bài sẽ được bổ sung khi hệ thống lưu kết quả chi tiết cho từng lượt làm. Bản hiện tại ưu tiên tiến độ bài học và điểm XP cơ bản.</span></div></>; }

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error('XSTK Academy render error:', error); }
  render() {
    if (this.state.hasError) return <main style={{maxWidth:720,margin:'12vh auto',padding:24,fontFamily:'system-ui,sans-serif',color:'#26352b'}}><h1>Đã xảy ra lỗi khi hiển thị trang</h1><p>Website không bị mất dữ liệu học đã lưu. Hãy tải lại trang; nếu lỗi tiếp diễn, mở Console của trình duyệt để xem chi tiết kỹ thuật.</p><button onClick={()=>window.location.reload()} style={{padding:'10px 16px',borderRadius:8,border:0,background:'#2f7651',color:'#fff',cursor:'pointer'}}>Tải lại trang</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppErrorBoundary><App/></AppErrorBoundary></React.StrictMode>);
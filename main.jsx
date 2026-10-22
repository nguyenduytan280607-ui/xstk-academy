import hub3dRoadmapImage from './hub-roadmap-clean.webp';
import vangoghHubHero from './vangogh-hub-hero.webp';
import hubCampusImage from './hub-campus.png';
import hubLogoImage from './hub-logo.png';
import React, { useEffect, useMemo, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Award, BookOpen, Bookmark, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, CalendarDays, Flame, GraduationCap, Home, Library, ListChecks, Menu, NotebookPen, Search, Sigma, Sparkles, Target, Trophy, Users, X, RotateCcw, ChartNoAxesCombined } from 'lucide-react';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { chapters, lessons, questions } from './data';
import './styles.css';
const initial = () => { try { return JSON.parse(localStorage.getItem('xstk-state')) || {}; } catch { return {}; } };
function App() {
  const [saved, setSaved] = useState(initial);
  const [page, setPage] = useState('Dashboard');
  const [dashboardProblem, setDashboardProblem] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [query, setQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState('all');
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
    { name: 'Dashboard', icon: Home }, { name: 'Lộ trình học', icon: Target }, { name: 'Bài học', icon: BookOpen }, { name: 'Phòng thực hành', icon: Calculator }, { name: 'Giải bài tập', icon: Sparkles }, { name: 'Ôn tập câu sai', icon: RotateCcw }, { name: 'Sổ tay công thức', icon: NotebookPen }, { name: 'Thống kê kết quả', icon: ChartNoAxesCombined }
  ];
  const go = (name) => { setPage(name); setSelectedLesson(null); setShowMobileNav(false); };
  const nextLesson = lessons.find(l => !completed.includes(l.id)) || lessons[0];
  const renderLesson = (lesson) => setSelectedLesson(lesson);

  return <div className="app-shell">
    <aside className={`sidebar ${showMobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><img src={hubLogoImage} alt="Logo HUB" style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} /></div><div><strong>XSTK</strong><span>ACADEMY</span></div><button className="mobile-close icon-button" onClick={() => setShowMobileNav(false)}><X size={18}/></button></div>
      <button className="search-box" onClick={() => setSearchOpen(!searchOpen)}><Search size={16}/><span>Tìm kiếm bài học...</span><kbd>⌘ K</kbd></button>
      {searchOpen && <div className="sidebar-search"><input autoFocus value={query} onChange={e => {setQuery(e.target.value); setPage('Bài học')}} placeholder="Tên bài học, công thức..."/><button onClick={() => setSearchOpen(false)}><X size={15}/></button></div>}
      <div className="nav-label">KHÔNG GIAN HỌC TẬP</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => go(item.name)}><Icon size={18}/><span>{item.name}</span>{item.name === 'Ôn tập câu sai' && wrong.length > 0 && <em>{wrong.length}</em>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="mini-progress"><div className="mini-progress-icon"><Flame size={16}/></div><div><strong>{completed.length} bài hoàn thành</strong><span>Tiếp tục giữ nhịp học nhé!</span></div></div><div className="profile"><div className="avatar">X</div><div><strong>Người học XSTK</strong><span>Hành trình của bạn</span></div><ChevronDown size={16}/></div></div>
    </aside>
    {showMobileNav && <div className="overlay" onClick={() => setShowMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setShowMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Không gian học tập <ChevronRight size={14}/> <strong>{selectedLesson ? 'Bài học' : page}</strong></div><div className="top-actions"><span className="top-streak"><Flame size={15}/>{completed.length ? 'Đang tiến bộ' : 'Bắt đầu hôm nay'}</span><div className="top-avatar">X</div></div></header>
      <div className="content-wrap">
        {selectedLesson ? <LessonView lesson={selectedLesson} completed={completed.includes(selectedLesson.id)} onBack={() => setSelectedLesson(null)} onComplete={() => markComplete(selectedLesson)} onPractice={() => {setSelectedLesson(null);go('Phòng thực hành')}} /> : <>
          {page === 'Dashboard' && <Dashboard completed={completed} progress={progress} xp={xp} nextLesson={nextLesson} onGo={go} onLesson={renderLesson} wrongCount={wrong.length} onSolve={(text) => { setDashboardProblem(text); go('Giải bài tập'); }} />}
          {page === 'Lộ trình học' && <PathPage completed={completed} onGo={go} onLesson={renderLesson} />}
          {page === 'Bài học' && <LessonsPage filteredLessons={filteredLessons} query={query} setQuery={setQuery} chapterFilter={chapterFilter} setChapterFilter={setChapterFilter} completed={completed} onLesson={renderLesson} />}
          {page === 'Phòng thực hành' && <PracticePage chosen={chosen} setChosen={setChosen} submitted={submitted} setSubmitted={setSubmitted} wrong={wrong} update={update} quizIndex={quizIndex} setQuizIndex={setQuizIndex} />}
          {page === 'Giải bài tập' && <SolvePage initialProblem={dashboardProblem} />} 
          {page === 'Ôn tập câu sai' && <ReviewPage wrong={wrong} onPractice={() => go('Phòng thực hành')} />}
          {page === 'Sổ tay công thức' && <NotesPage notes={notes} note={note} setNote={setNote} activeNote={activeNote} setActiveNote={setActiveNote} update={update} />}
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
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'}).format(today);
  const weekday = new Intl.DateTimeFormat('vi-VN', {weekday:'long'}).format(today);
  const recent = lessons.filter(l => completed.includes(l.id)).slice(-3).reverse();
  return <>
    <section className="welcome-banner vangogh-welcome" style={{"--vangogh-hub-hero": `url("${vangoghHubHero}")`}}><div className="welcome-copy"><div className="welcome-chip"><Sparkles size={13}/> XSTK ACADEMY · KHÔNG GIAN HỌC TẬP</div><h1>Chào mừng trở lại! 👋<br/>Cùng chinh phục Xác suất thống kê.</h1><p>Học chắc bản chất, luyện từng dạng bài và tiến bộ mỗi ngày cùng cộng đồng sinh viên.</p><button className="primary-button" onClick={() => onLesson(nextLesson)}>Học tiếp <ArrowRight size={16}/></button></div><div className="welcome-art hub-campus-art vangogh-campus-art" style={{"--hub-campus-photo": `url("${hubCampusImage}")`}} role="img" aria-label="Khuôn viên Trường Đại học Ngân hàng TP.HCM"><div className="hub-campus-label"><span>HUB CAMPUS</span><strong>Đại học Ngân hàng TP.HCM</strong></div></div>
    <section className="dashboard-date-strip" aria-label="Ngày hiện tại và tiến độ học tập">
      <div className="dashboard-date-tile"><span className="dashboard-date-icon"><CalendarDays size={23}/></span><div><strong>{formattedDate}</strong><span>{weekday.charAt(0).toUpperCase() + weekday.slice(1)}</span></div></div>
      <div className="dashboard-date-tile"><span className="dashboard-date-icon"><BookOpen size={23}/></span><div><strong>{completed.length} bài</strong><span>Đã hoàn thành</span></div></div>
      <div className="dashboard-date-tile"><span className="dashboard-date-icon"><Award size={23}/></span><div><strong>{xp} XP</strong><span>Điểm tích lũy</span></div></div>
      <div className="dashboard-date-tile"><span className="dashboard-date-icon"><Target size={23}/></span><div><strong>{progress}%</strong><span>Tiến độ học tập</span></div></div>
    </section>
    </section>
    <section className="vangogh-quick-grid" aria-label="Truy cập học tập nhanh">
      <button type="button" onClick={() => onLesson(nextLesson)}><span className="vgq-icon"><BookOpen size={21}/></span><span><strong>Tiếp tục học</strong><small>{nextLesson.title}</small></span><ArrowRight size={17}/></button>
      <button type="button" onClick={() => onGo('Phòng thực hành')}><span className="vgq-icon"><Calculator size={21}/></span><span><strong>Phòng thực hành</strong><small>Luyện tập kiến thức ngay</small></span><ArrowRight size={17}/></button>
      <button type="button" onClick={() => onGo('Lộ trình học')}><span className="vgq-icon"><Target size={21}/></span><span><strong>Lộ trình 7 chương</strong><small>Khám phá hành trình của bạn</small></span><ArrowRight size={17}/></button>
      <button type="button" onClick={() => onGo('Giải bài tập')}><span className="vgq-icon"><Sparkles size={21}/></span><span><strong>AI Solver</strong><small>Hỗ trợ giải bài từng bước</small></span><ArrowRight size={17}/></button>
    </section>
    <section className="learning-overview" aria-label="Tổng quan tiến độ học tập">
      <div className="learning-progress-card">
        <div className="learning-card-heading"><div><span className="learning-kicker">TỔNG QUAN HỌC TẬP</span><h2>Tiến độ của bạn</h2></div><span className="learning-live-dot">Dữ liệu thực tế</span></div>
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
function PathPage({completed,onGo,onLesson}) {
  const [selectedChapter,setSelectedChapter]=useState(null);
  const [view,setView]=useState('map');
  const progressPercent=lessons.length?Math.round(completed.length/lessons.length*100):0;
  const journey=chapters.map((chapter)=>{
    const items=lessons.filter(l=>l.chapterId===chapter.id);
    const done=items.filter(l=>completed.includes(l.id)).length;
    const percent=items.length?Math.round(done/items.length*100):0;
    return {chapter,items,done,percent,status:items.length>0&&done===items.length?'done':done>0?'active':'upcoming'};
  });
  const currentIndex=journey.findIndex(s=>s.status!=='done');
  const currentId=journey[Math.max(0,currentIndex)]?.chapter.id ?? chapters[chapters.length-1]?.id;
  const chosen=selectedChapter===null?currentId:selectedChapter;
  const openChapter=(id)=>{
    setSelectedChapter(id);
    window.requestAnimationFrame(()=>document.getElementById('journey-detail')?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  // Hit targets aligned with the seven markers in the clean Phase 16 artwork.
  // Artwork contains the decorative chapter labels already: do not render duplicates.
  const nodes=[
    {x:20.4,y:83.9},{x:32.3,y:79.1},{x:44.1,y:74.0},
    {x:56.2,y:69.0},{x:67.8,y:64.8},{x:79.9,y:57.8},{x:92.3,y:46.4}
  ];
  return <div className="journey-page journey-phase15 journey-phase16 vangogh-journey">
    <section className="p15-stage-scroll" aria-label="Bản đồ hành trình 7 chương XSTK tại HUB">
      <div className="p15-stage">
        <img className="p15-artwork" src={hub3dRoadmapImage} alt="Phối cảnh 3D trường HUB, con đường chinh phục XSTK và bảy cột mốc học tập" draggable="false"/>
        {journey.map((step,i)=><button key={step.chapter.id} type="button"
          className="p15-marker-button"
          style={{left:`${nodes[i].x}%`,top:`${nodes[i].y}%`}}
          onClick={()=>openChapter(step.chapter.id)}
          title={`Chương ${step.chapter.id}: ${step.chapter.short} — ${step.done}/${step.items.length} bài (${step.percent}%)`}
          aria-label={`Mở chương ${step.chapter.id}: ${step.chapter.title}, ${step.done} trên ${step.items.length} bài đã hoàn thành`}>
          <span className="p15-marker-tooltip">Chương {step.chapter.id}: {step.chapter.short} · {step.percent}%</span>
        </button>)}
      </div>
    </section>
    <section className="p15-live-bar" aria-label="Tiến độ học tập thực tế">
      <div className="p15-live-summary"><span className="p15-live-eyebrow">TIẾN ĐỘ CỦA BẠN</span><strong>{progressPercent}% <span>toàn hành trình</span></strong><div className="p15-progress-track"><span style={{width:`${progressPercent}%`}}/></div></div>
      <div className="p15-live-metric"><BookOpen size={20}/><div><strong>{completed.length}/{lessons.length}</strong><span>Bài đã hoàn thành</span></div></div>
      <div className="p15-live-metric"><Target size={20}/><div><strong>{chapters.length}</strong><span>Chương kiến thức</span></div></div>
      <button className="p15-live-cta" type="button" onClick={()=>openChapter(currentId)}>{completed.length?'Tiếp tục học':'Bắt đầu học'} <ArrowRight size={16}/></button>
    </section>
    <div className="p13-mobile-hint"><ChevronRight size={15}/> Vuốt ngang để khám phá đủ 7 cột mốc và nhấn vào cột mốc để mở bài học.</div>
    <section id="journey-detail" className="journey-detail">
      <div className="journey-detail-heading"><div><span className="journey-kicker">KHÁM PHÁ 7 CHẶNG</span><h2>Chi tiết từng chương</h2><p>Chọn chương để xem các bài học và tiếp tục chinh phục.</p></div><div className="journey-view-switch"><button type="button" className={view==='map'?'selected':''} onClick={()=>setView('map')}><Target size={15}/> Thẻ chương</button><button type="button" className={view==='list'?'selected':''} onClick={()=>setView('list')}><ListChecks size={15}/> Danh sách</button></div></div>
      <div className={`journey-chapters ${view==='list'?'is-list':''}`}>{journey.map(({chapter,items,done,percent,status})=>{const active=chosen===chapter.id;return <button type="button" key={chapter.id} className={`journey-chapter-card ${active?'selected':''} ${status}`} onClick={()=>setSelectedChapter(active?null:chapter.id)} aria-expanded={active}>
        <span className="journey-card-index">{status==='done'?<Check size={16}/>:chapter.id}</span><span className="journey-card-symbol">{[<Sigma size={28}/>,<Calculator size={28}/>,<Activity size={28}/>,<Users size={28}/>,<Target size={28}/>,<ListChecks size={28}/>,<Trophy size={28}/>][chapter.id-1]||<BookOpen size={28}/>}</span><small>CHƯƠNG {chapter.id}</small><strong>{chapter.short}</strong><span className="journey-card-description">{chapter.description}</span><span className="journey-card-progress"><span>{done}/{items.length} bài</span><b>{percent}%</b></span><span className="journey-card-track"><span style={{width:`${percent}%`}}/></span><span className="journey-card-action">{active?'Đang xem bài học':status==='done'?'Xem lại':status==='active'?'Tiếp tục học':'Khám phá chương'} <ChevronRight size={14}/></span>
      </button>})}</div>
      {chosen!=null&&journey.filter(s=>s.chapter.id===chosen).map(s=><div className="journey-lessons-panel" key={s.chapter.id}><div className="journey-lessons-head"><div><span className="journey-kicker">DANH SÁCH BÀI HỌC</span><h3>Chương {s.chapter.id}: {s.chapter.title}</h3><p>{s.done}/{s.items.length} bài đã hoàn thành</p></div><button type="button" className="journey-collapse" onClick={()=>setSelectedChapter(null)} aria-label="Thu gọn danh sách bài học"><ChevronDown size={18}/></button></div><div className="journey-lesson-grid">{s.items.map((lesson,index)=><button type="button" key={lesson.id} className="journey-lesson-item" onClick={()=>onLesson(lesson)}><span className={`journey-lesson-check ${completed.includes(lesson.id)?'complete':''}`}>{completed.includes(lesson.id)?<Check size={15}/>:String(index+1).padStart(2,'0')}</span><span><strong>{lesson.title}</strong><small>{lesson.minutes} phút · {completed.includes(lesson.id)?'Đã hoàn thành':'Sẵn sàng học'}</small></span><ChevronRight size={16}/></button>)}</div></div>)}
    </section>
  </div>;
}

function LessonsPage({filteredLessons,query,setQuery,chapterFilter,setChapterFilter,completed,onLesson}) { return <><PageHeading eyebrow="THƯ VIỆN KIẾN THỨC" title="Danh mục bài học" desc="Nội dung được tổ chức theo 7 file chương XSTK bạn đã gửi."/><div className="filter-bar"><div className="input-with-icon"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm bài học, chủ đề..."/></div><select value={chapterFilter} onChange={e=>setChapterFilter(e.target.value)}><option value="all">Tất cả chương</option>{chapters.map(c=><option value={c.id} key={c.id}>Chương {c.id}: {c.short}</option>)}</select></div><div className="results-line">Hiển thị <strong>{filteredLessons.length}</strong> bài học <span>· {filteredLessons.filter(l=>completed.includes(l.id)).length} bài đã hoàn thành</span></div>{filteredLessons.length ? <div className="lesson-catalog">{filteredLessons.map(l=><LessonRow key={l.id} lesson={l} done={completed.includes(l.id)} onClick={()=>onLesson(l)}/>)}</div>:<div className="empty-state"><Search size={24}/><strong>Không tìm thấy bài học</strong><span>Thử từ khóa khác hoặc chọn tất cả chương.</span></div>}</>; }
function LessonRow({lesson,done,onClick}) { return <button className="lesson-row" onClick={onClick}><div className={`lesson-status ${done?'done':''}`}>{done?<Check size={16}/>:<BookOpen size={16}/>}</div><div className="lesson-row-main"><div className="lesson-meta">CHƯƠNG {lesson.chapterId} · BÀI {lesson.number}</div><h3>{lesson.title}</h3><p>{lesson.description}</p></div><div className="lesson-row-side"><span><Clock3 size={13}/>{lesson.minutes} phút</span><span className={`status-text ${done?'is-done':''}`}>{done?'Đã học':'Chưa học'}</span></div><ChevronRight className="row-chevron" size={17}/></button>; }
function LessonView({lesson,completed,onBack,onComplete,onPractice}) { const [showHint,setShowHint]=useState(false);return <><button className="back-button" onClick={onBack}><ChevronRight size={15} className="back-arrow"/> Quay lại danh sách</button><div className="lesson-layout"><article className="lesson-article"><div className="eyebrow">CHƯƠNG {lesson.chapterId} · BÀI {lesson.number}</div><h1>{lesson.title}</h1><p className="article-lead">{lesson.description}</p><div className="article-meta"><span><Clock3 size={14}/>{lesson.minutes} phút đọc</span><span><Library size={14}/>{lesson.source}</span></div><div className="article-divider"/><h2>Mục tiêu bài học</h2><p>Sau bài này, bạn cần hiểu khái niệm, nhận diện dữ kiện trong đề và biết khi nào nên áp dụng công thức.</p><h2>Giải thích cốt lõi</h2><p>{lesson.content}</p><div className="lesson-detail-list"><div><strong>Điểm cần nhớ</strong><p>{lesson.note}</p></div><div><strong>Ví dụ / cách vận dụng</strong><p>{lesson.example}</p></div></div><div className="formula-box"><div className="formula-label"><Sigma size={17}/> CÔNG THỨC / QUY TẮC GHI NHỚ</div><div className="formula-text">{lesson.formula}</div><button className="small-outline" onClick={()=>navigator.clipboard?.writeText(lesson.formula)}><Bookmark size={14}/> Sao chép công thức</button></div><h2>Cách giải một bài tập</h2><div className="steps-list"><div><b>01</b><span><strong>Đọc đề và xác định dữ kiện</strong><small>Gạch chân các giá trị đã biết và đại lượng cần tìm.</small></span></div><div><b>02</b><span><strong>Chọn đúng công thức</strong><small>Kiểm tra điều kiện áp dụng, không chọn công thức chỉ vì thấy quen.</small></span></div><div><b>03</b><span><strong>Thay số và tính toán</strong><small>Viết từng bước để dễ phát hiện lỗi.</small></span></div><div><b>04</b><span><strong>Diễn giải kết quả</strong><small>Trả lời đúng câu hỏi bằng ngôn ngữ của bài toán.</small></span></div></div><div className="source-note"><CircleHelp size={17}/><span><strong>Nguồn nội dung</strong><br/>Khung chủ đề được tổ chức theo file tài liệu gốc. Phần khái niệm và công thức được biên soạn theo chủ đề của PDF. Các ví dụ diễn giải trên website là phần hỗ trợ học tập; khi có khác biệt ký hiệu, hãy ưu tiên quy ước trong tài liệu gốc.<br/><a className="source-pdf-link" href={`/tai-lieu/bai-${lesson.chapterId}-${({1:'xac-suat',2:'bien-ngau-nhien',3:'phan-phoi',4:'mau-ngau-nhien',5:'uoc-luong',6:'kiem-dinh',7:'so-sanh'})[lesson.chapterId]}.pdf`} target="_blank" rel="noreferrer">Mở PDF gốc Bài {lesson.chapterId} ↗</a></span></div><div className="article-actions"><button className="primary-button" onClick={onComplete}>{completed?<CheckCircle2 size={16}/>:<Check size={16}/>} {completed?'Đã hoàn thành':'Đánh dấu hoàn thành'}</button><button className="secondary-button" onClick={onPractice}>Luyện tập ngay <ArrowRight size={15}/></button></div></article><aside className="lesson-aside"><div className="aside-card"><div className="aside-title"><ListChecks size={17}/> Trong bài này</div><a href="#" onClick={e=>{e.preventDefault();document.querySelector('.formula-box')?.scrollIntoView({behavior:'smooth'})}}>Công thức cần nhớ</a><a href="#" onClick={e=>{e.preventDefault();document.querySelector('.steps-list')?.scrollIntoView({behavior:'smooth'})}}>Quy trình giải bài</a><div className="aside-separator"/><div className="aside-title"><Award size={17}/> Tiến độ bài học</div><div className="aside-progress"><ProgressBar value={completed?100:0}/><span>{completed?'100%':'0%'} hoàn thành</span></div></div><div className="aside-tip"><Sparkles size={18}/><strong>Mẹo học hiệu quả</strong><p>Hãy tự giải thích công thức bằng lời của bạn, sau đó làm một bài tập mà không nhìn lời giải.</p></div></aside></div></>; }
function PracticePage({chosen,setChosen,submitted,setSubmitted,wrong,update,quizIndex,setQuizIndex}) { const [filter,setFilter]=useState('all'); const qs=questions.filter(q=>filter==='all'||q.chapterId===Number(filter)); const q=qs[Math.min(quizIndex,qs.length-1)]||qs[0]; const result=submitted[q?.id]; const answer=chosen[q?.id]; const choose=(idx)=>setChosen(p=>({...p,[q.id]:idx})); const submit=()=>{if(answer===undefined)return;setSubmitted(p=>({...p,[q.id]:true}));const isWrong=answer!==q.answer;const nextWrong=isWrong?[...new Set([...wrong,q.id])]:wrong.filter(id=>id!==q.id);update('wrong',nextWrong);};return <><PageHeading eyebrow="PHÒNG THỰC HÀNH" title="Luyện tập và kiểm tra" desc="Làm câu hỏi theo chủ đề, xem giải thích và lưu câu cần ôn tập."/><div className="practice-toolbar"><div><span className="eyebrow">NGÂN HÀNG CÂU HỎI</span><h3>{qs.length} câu hỏi mẫu</h3></div><select value={filter} onChange={e=>{setFilter(e.target.value);setQuizIndex(0)}}><option value="all">Tất cả chương</option>{chapters.map(c=><option key={c.id} value={c.id}>Chương {c.id}</option>)}</select></div>{q&&<div className="quiz-card"><div className="quiz-top"><span className="pill">CHƯƠNG {q.chapterId}</span><span className="difficulty">{q.difficulty}</span><span className="quiz-number">Câu {quizIndex+1}/{qs.length}</span></div><h2>{q.prompt}</h2><div className="answer-options">{q.options.map((opt,i)=><button key={opt} disabled={!!result} className={`answer-option ${answer===i?'selected':''} ${result&&i===q.answer?'correct':''} ${result&&answer===i&&i!==q.answer?'incorrect':''}`} onClick={()=>choose(i)}><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{opt}</span>{result&&i===q.answer&&<CheckCircle2 size={18}/>}</button>)}</div>{result&&<div className={`explanation ${answer===q.answer?'good':'bad'}`}><strong>{answer===q.answer?'Chính xác!':'Chưa chính xác.'}</strong><p>{q.explanation}</p></div>}<div className="quiz-footer"><span>{result?'Đã ghi nhận kết quả':'Chọn một đáp án để tiếp tục'}</span>{!result?<button className="primary-button" disabled={answer===undefined} onClick={submit}>Kiểm tra đáp án <ArrowRight size={15}/></button>:<button className="primary-button" onClick={()=>{setQuizIndex((quizIndex+1)%qs.length)}}>Câu tiếp theo <ArrowRight size={15}/></button>}</div></div>}<div className="practice-bottom"><div><Target size={19}/><span><strong>Ôn tập có mục tiêu</strong><small>Câu trả lời sai được lưu để bạn có thể quay lại luyện tập.</small></span></div><div><strong>{wrong.length}</strong><span>câu cần ôn</span></div></div></>; }
function SolvePage({initialProblem = ''}) {
  const [problem,setProblem]=useState(initialProblem);
  const [solverMode,setSolverMode]=useState('solve');
  const [studentAnswer,setStudentAnswer]=useState('');
  const [chapter,setChapter]=useState('auto');
  const [level,setLevel]=useState('chi-tiet');
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [attachment,setAttachment]=useState(null);
  const [fileBusy,setFileBusy]=useState(false);
  const selectAttachment = async (event) => {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setError('');
    if(file.size>8*1024*1024){setError('Tệp quá lớn. Giới hạn 8 MB.');return;}
    const isImage=['image/png','image/jpeg','image/webp'].includes(file.type);
    const isPDF=file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf');
    if(!isImage&&!isPDF){setError('Chỉ hỗ trợ JPG, PNG, WebP hoặc PDF.');return;}
    setFileBusy(true);
    try {
      const readDataURL=(blob)=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Không đọc được tệp.'));r.readAsDataURL(blob);});
      let images=[];
      if(isImage){images=[await readDataURL(file)];}
      else {
        const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
        if(pdf.numPages>3)throw new Error('PDF tối đa 3 trang. Hãy tách tài liệu dài thành các phần nhỏ.');
        for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
          const page=await pdf.getPage(pageNo);
          const viewport=page.getViewport({scale:1.4});
          const scale=Math.min(1,1600/Math.max(viewport.width,viewport.height));
          const view=page.getViewport({scale:1.4*scale});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
          await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
          images.push(canvas.toDataURL('image/jpeg',0.82));
          canvas.width=0;canvas.height=0;
        }
        await pdf.destroy();
      }
      setAttachment({name:file.name,size:file.size,images});
    }catch(e){setAttachment(null);setError(e?.message||'Không đọc được tệp đính kèm.');}
    finally{setFileBusy(false);}
  };
  const solve = async () => {
    if ((solverMode === 'solve' && !problem.trim() && !attachment) || (solverMode === 'grade' && (!problem.trim() || (!studentAnswer.trim() && !attachment))) || loading || fileBusy) return;
    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const response = await fetch(`https://xstk-academy.onrender.com/api/${solverMode === 'grade' ? 'grade' : 'solve'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problem.trim() || 'Hãy đọc đề bài trong ảnh/PDF và giải từng bước.',
          ...(solverMode === 'grade' ? {studentAnswer: studentAnswer.trim()} : {}),
          images: attachment?.images || [],
          chapter,
          level
        })
      });

      const data = await response.json().catch(() => {
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
      });

      if (!response.ok) {
        throw new Error(data?.error || `Máy chủ AI gặp lỗi (${response.status}).`);
      }

      if (typeof data?.answer !== 'string' || !data.answer.trim()) {
        throw new Error('AI chưa trả về lời giải. Vui lòng thử lại.');
      }

      setAnswer(data.answer);
    } catch (e) {
      setError(
        e instanceof TypeError && e.message === 'Failed to fetch'
          ? 'Không kết nối được máy chủ AI. Hãy kiểm tra mạng, Render và cấu hình FRONTEND_URL (CORS).'
          : e?.message || 'Có lỗi khi giải bài. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };
  const formattedAnswer = answer
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);
  return <><PageHeading eyebrow="TRỢ GIẢNG XSTK" title={solverMode === 'grade' ? 'AI chấm bài theo thang 10' : 'Giải bài tập từng bước'} desc={solverMode === 'grade' ? 'Nhập đề bài và bài làm để AI đánh giá từng tiêu chí, chỉ lỗi và hướng dẫn sửa.' : 'Nhập nguyên đề bài. Trợ giảng sẽ nhận diện dữ kiện, chọn công thức, trình bày phép tính và viết kết luận.'}/><div className="solver-mode-switch" style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}><button type="button" className={solverMode==='solve'?'primary-button':'secondary-button'} onClick={()=>{setSolverMode('solve');setAnswer('');setError('');}}>Giải bài với AI</button><button type="button" className={solverMode==='grade'?'primary-button':'secondary-button'} onClick={()=>{setSolverMode('grade');setAnswer('');setError('');}}>Chấm bài làm (Phase 20.2)</button></div><div className="solver-layout"><section className="solver-card"><label htmlFor="problem-input">Đề bài của bạn</label><textarea id="problem-input" value={problem} onChange={e=>setProblem(e.target.value)} rows={7} placeholder="Ví dụ: Số lỗi trung bình là 6 lỗi/giờ. Tính xác suất có đúng 2 lỗi trong 10 phút theo phân phối Poisson..."/>{solverMode === 'grade' && <div style={{marginTop:16,marginBottom:16}}><label htmlFor="student-answer-input">Bài làm của sinh viên</label><textarea id="student-answer-input" rows={7} value={studentAnswer} onChange={e=>setStudentAnswer(e.target.value)} placeholder="Nhập các bước giải của bạn; hoặc đính kèm ảnh/PDF bài làm ở dưới..."/><p className="solver-privacy">Đề bài cần nhập bằng chữ; ảnh/PDF đính kèm được hiểu là bài làm của sinh viên. Nếu ảnh chứa cả đề và bài làm, hãy chép đề vào ô phía trên.</p></div>}<div className="solver-upload"><div className="solver-upload-heading"><strong>{solverMode === 'grade' ? 'Đính kèm ảnh/PDF bài làm' : 'Đính kèm đề bài / bài làm'}</strong><span>Ảnh JPG, PNG, WebP hoặc PDF (tối đa 3 trang, 8 MB)</span></div><label className="solver-upload-target" htmlFor="solver-attachment"><span>＋</span> {fileBusy?'Đang đọc tệp...':'Chọn ảnh hoặc PDF từ thiết bị'}</label><input id="solver-attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" onChange={selectAttachment} disabled={loading||fileBusy} hidden/>{attachment&&<div className="solver-upload-file"><span>📎 {attachment.name} · {(attachment.size/1024/1024).toFixed(2)} MB · {attachment.images.length} trang/ảnh</span><button type="button" onClick={()=>setAttachment(null)} disabled={loading}>Xóa</button></div>}</div><div className="solver-controls"><div><label htmlFor="chapter-select">Chủ đề</label><select id="chapter-select" value={chapter} onChange={e=>setChapter(e.target.value)}><option value="auto">Tự nhận diện</option>{chapters.map(c=><option key={c.id} value={c.id}>Bài {c.id}: {c.short}</option>)}</select></div><div><label htmlFor="level-select">Cách trình bày</label><select id="level-select" value={level} onChange={e=>setLevel(e.target.value)}><option value="chi-tiet">Giải thích chi tiết</option><option value="ngan-gon">Công thức và tính toán ngắn gọn</option><option value="goi-y">Gợi ý từng bước, chưa đưa đáp án ngay</option></select></div></div><button className="primary-button solver-submit" onClick={solve} disabled={(solverMode==='solve' ? (!problem.trim()&&!attachment) : (!problem.trim()||(!studentAnswer.trim()&&!attachment)))||loading||fileBusy}>{loading?<><span className="spinner"/> {solverMode==='grade'?'Đang chấm...':'Đang giải...'}</>:<><Sparkles size={16}/> {solverMode==='grade'?'Chấm bài theo thang 10':'Giải bài từng bước'}</>}</button><p className="solver-privacy">Không nhập thông tin cá nhân. Kết quả do AI tạo có thể sai; điểm chấm chỉ mang tính tham khảo, không thay thế đánh giá của giảng viên.</p>{error&&<div className="solver-error"><strong>Chưa giải được</strong><p>{error}</p></div>}</section><section className="solver-result"><div className="solver-result-head"><div className="solver-result-icon"><Sigma size={20}/></div><div><h2>{solverMode==='grade'?'Phiếu chấm bài AI':'Lời giải'}</h2><p>{solverMode==='grade'?'Điểm và nhận xét theo từng tiêu chí':'Các bước sẽ hiển thị tại đây'}</p></div></div>{answer?
<div className="solver-answer">
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[[rehypeKatex, {
      throwOnError: false,
      strict: 'ignore'
    }]]}
  >
    {formattedAnswer}
  </ReactMarkdown>
</div>
: <div className="solver-empty">
    <div className="solver-empty-icon"><NotebookPen size={25}/></div>
    <strong>Hãy bắt đầu từ đề bài</strong>
    <p>Một lời giải tốt cần chỉ ra dữ kiện, tham số cần tìm, công thức phù hợp, thay số và kết luận theo đúng ngữ cảnh.</p>
    <div className="solver-checklist">
      <span><CheckCircle2 size={15}/> Xác định dạng toán</span>
      <span><CheckCircle2 size={15}/> Nêu công thức và điều kiện</span>
      <span><CheckCircle2 size={15}/> Tính toán theo từng bước</span>
      <span><CheckCircle2 size={15}/> Kết luận dễ hiểu</span>
    </div>
  </div>}
</section></div></>;
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
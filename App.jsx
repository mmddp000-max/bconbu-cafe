import React, { useState, useEffect } from "react";

/* ── SUPABASE ── */
const SB_URL = "https://htkefzfngugwslmhtiee.supabase.co";
const SB_KEY = "sb_publishable_Rq7-rlSt1CH6VjbSzuXQKQ_QRH4AVgR";

const sbFetch = (path, opts = {}) =>
  fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: {
      "apikey": SB_KEY,
      "Authorization": "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      "Prefer": opts.prefer || "",
      ...(opts.headers || {}),
    },
  });

const loadPosts = async () => {
  const r = await sbFetch("posts?select=data&order=id.desc");
  if (!r.ok) return [];
  const rows = await r.json();
  return rows.map(row => row.data);
};

const savePost = async (post) => {
  const strip = p => ({
    ...p,
    blocks: p.blocks?.map(b => b.type==="video" ? {...b, src:""} : b),
    bBlocks: p.bBlocks?.map(b => b.type==="video" ? {...b, src:""} : b),
    images: [], videos: [],
  });
  await sbFetch("posts", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    headers: { "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ id: post.id, data: strip(post) }),
  });
};

const deletePost = async (id) => {
  await sbFetch("posts?id=eq." + id, { method: "DELETE" });
};

const updatePost = async (post) => {
  const strip = p => ({
    ...p,
    blocks: p.blocks?.map(b => b.type==="video" ? {...b, src:""} : b),
    bBlocks: p.bBlocks?.map(b => b.type==="video" ? {...b, src:""} : b),
    images: [], videos: [],
  });
  await sbFetch("posts?id=eq." + post.id, {
    method: "PATCH",
    body: JSON.stringify({ data: strip(post) }),
  });
};

/* ── Supabase Storage 이미지 업로드 ── */
const uploadToStorage = async (file) => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
  const res = await fetch(SB_URL + "/storage/v1/object/images/" + path, {
    method: "POST",
    headers: {
      "apikey": SB_KEY,
      "Authorization": "Bearer " + SB_KEY,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) return null;
  return SB_URL + "/storage/v1/object/public/images/" + path;
};

const CATEGORIES = [
  { id: "all",      label: "전체" },
  { id: "ai-trend", label: "AI 트렌드" },
  { id: "b-letter", label: "B레터" },
  { id: "source",   label: "소스 공유" },
];

const CAT_STYLE = {
  "ai-trend": { bg: "#EDFAF4", text: "#0E9F6E", border: "#A7F3D0" },
  "b-letter": { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  source:     { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
};

/* ── 텍스트 렌더 ── */
const renderText = (text) => {
  if (!text) return "";
  const L = "color:#4338CA;text-decoration:underline;font-weight:500;";
  const esc = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const lines = esc.split(String.fromCharCode(10));
  const out = lines.map(function(line) {
    var res = "";
    var i = 0;
    while (i < line.length) {
      if (line[i]==="*" && line[i+1]==="*") {
        var end = line.indexOf("**", i+2);
        if (end > i+1) { res += "<strong>"+line.slice(i+2,end)+"</strong>"; i=end+2; continue; }
      }
      if (line[i]==="_") {
        var end2 = line.indexOf("_", i+1);
        if (end2 > i) { res += "<em>"+line.slice(i+1,end2)+"</em>"; i=end2+1; continue; }
      }
      if (line.slice(i,i+7)==="&lt;b&gt;") {
        var endB = line.indexOf("&lt;/b&gt;", i+7);
        if (endB > i) { res += "<strong>"+line.slice(i+7,endB)+"</strong>"; i=endB+10; continue; }
      }
      if (line.slice(i,i+10)==="&lt;mark&gt;") {
        var endM = line.indexOf("&lt;/mark&gt;", i+10);
        if (endM > i) { res += "<mark style='background:#FFE066;padding:0 2px;border-radius:2px;'>"+line.slice(i+10,endM)+"</mark>"; i=endM+13; continue; }
      }
      if (line.slice(i,i+7)==="&lt;i&gt;") {
        var endI = line.indexOf("&lt;/i&gt;", i+7);
        if (endI > i) { res += "<em>"+line.slice(i+7,endI)+"</em>"; i=endI+10; continue; }
      }
      if (line.slice(i,i+8)==="&lt;u&gt;") {
        var end3 = line.indexOf("&lt;/u&gt;", i+8);
        if (end3 > i) { res += "<u>"+line.slice(i+8,end3)+"</u>"; i=end3+10; continue; }
      }
      if (line[i]==="[") {
        var cb = line.indexOf("]", i+1);
        if (cb>i && line[cb+1]==="(" ) {
          var cp = line.indexOf(")", cb+2);
          if (cp>cb) {
            var lb=line.slice(i+1,cb), url=line.slice(cb+2,cp);
            if (url.startsWith("http")) { res+='<a href="'+url+'" target="_blank" rel="noopener noreferrer" style="'+L+'">'+lb+'</a>'; i=cp+1; continue; }
          }
        }
      }
      if (line.slice(i,i+4)==="http") {
        var sp = line.slice(i).search(new RegExp("[\\s<>]"));
        var end4 = sp===-1 ? line.length : i+sp;
        var urlStr = line.slice(i,end4);
        if (urlStr.startsWith("http")) { res+='<a href="'+urlStr+'" target="_blank" rel="noopener noreferrer" style="'+L+'">'+urlStr+'</a>'; i=end4; continue; }
      }
      res += line[i]; i++;
    }
    return res;
  });
  return out.join("<br/>");
};
const TEAM_MEMBERS = [
  "김도호","공정호","김준완","정소이","임재희",
  "한소희","김하란","권민주","서이도","이유진",
  "한지수","김혜영",
];

const SAMPLE_POSTS = [];

/* ── GLOBAL STYLES ── */
const G = () => {
  React.useEffect(function() {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
    document.head.appendChild(link);
    document.body.style.fontFamily = "Pretendard, -apple-system, sans-serif";
    document.body.style.margin = "0";
    document.body.style.background = "#fff";
  }, []);
  return null;
};

/* ── OVERLAY WRAPPER ── */
function Overlay({ onClick, children }) {
  useEffect(() => {
    const fn = e => e.key === "Escape" && onClick();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClick]);
  return (
    <div onClick={onClick} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.48)",
      backdropFilter:"blur(7px)", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"24px", animation:"fadeIn 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"#fff", borderRadius:"20px", width:"100%", maxWidth:"580px",
        maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 40px 100px rgba(0,0,0,0.22)",
        animation:"slideUp 0.26s cubic-bezier(.4,0,.2,1)",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── CLOSE BTN ── */
const CloseBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    width:"32px", height:"32px", border:"none", background:"#F2F2F2",
    borderRadius:"8px", cursor:"pointer", fontSize:"15px", color:"#888",
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  }}>✕</button>
);

/* ── DETAIL MODAL ── */
function DetailModal({ post, onClose, onEdit, onDelete, onAddComment, onDeleteComment }) {
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  if (!post) return null;
  const cs = CAT_STYLE[post.category] || {};
  const comments = post.comments || [];

  const submitComment = function() {
    if (!commentText.trim() || !commentName.trim()) return;
    const c = { id: Date.now(), name: commentName, text: commentText, date: new Date().toLocaleDateString("ko-KR"), replyTo: replyTo };
    onAddComment(post.id, c);
    setCommentText(""); setReplyTo(null);
  };

  return (
    <Overlay onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", padding: "32px", position: "relative" }}
        onClick={function(e) { e.stopPropagation(); }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: cs.bg || "#F5F5F3", color: cs.text || "#555", border: "1px solid " + (cs.border || "#E0E0E0") }}>{post.categoryLabel || post.category}</span>
            <span style={{ fontSize: "12px", color: "#AAAAAA" }}>{post.date}</span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
        </div>

        {/* 제목 */}
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#111", marginBottom: "8px", lineHeight: 1.3 }}>{post.emoji} {post.title}</h2>
        <p style={{ fontSize: "13px", color: "#AAAAAA", marginBottom: "24px" }}>✍️ {post.author} · {post.tag && <span style={{ color: "#4338CA" }}>#{post.tag}</span>}</p>

        {/* 본문 */}
        {post.editorHtml ? (
          <div style={{ fontSize: "15px", color: "#333", lineHeight: 1.9, marginBottom: "24px", wordBreak: "break-word" }}
            dangerouslySetInnerHTML={{ __html: post.editorHtml }} />
        ) : (
          <div style={{ fontSize: "15px", color: "#333", lineHeight: 1.9, marginBottom: "24px", whiteSpace: "pre-line" }}>
            {post.body || post.summary || ""}
          </div>
        )}

        {/* 이미지 */}
        {post.images && post.images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: post.images.length >= 2 ? "1fr 1fr" : "1fr", gap: "8px", marginBottom: "20px" }}>
            {post.images.map(function(img, idx) {
              return <img key={idx} src={img.src || img} alt="" style={{ width: "100%", borderRadius: "10px", objectFit: "cover", maxHeight: "300px" }} />;
            })}
          </div>
        )}

        {/* 링크 */}
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "#F5F5F3", borderRadius: "10px", textDecoration: "none", marginBottom: "20px" }}>
            <span>🔗</span>
            <span style={{ fontSize: "13px", color: "#4338CA", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.url}</span>
          </a>
        )}

        {/* 수정/삭제 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button onClick={function() { onClose(); onEdit(post); }} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #E8E8E8", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>✏️ 수정</button>
          <button onClick={function() { onDelete(post.id); onClose(); }} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #FFE0E0", background: "#FFF5F5", color: "#FF6B6B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>🗑️ 삭제</button>
        </div>

        {/* 댓글 */}
        <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: "20px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>💬 댓글 {comments.length > 0 ? comments.length : ""}</p>
          {comments.length === 0 && <p style={{ fontSize: "13px", color: "#AAAAAA", marginBottom: "16px" }}>첫 댓글을 남겨보세요 👋</p>}
          {comments.map(function(c) {
            return (
              <div key={c.id} style={{ marginBottom: "12px", paddingLeft: c.replyTo ? "20px" : "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {c.replyTo && <p style={{ fontSize: "11px", color: "#AAAAAA", marginBottom: "2px" }}>↩ {c.replyTo.name}에게 답글</p>}
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}>{c.name} <span style={{ fontWeight: 400, color: "#555" }}>{c.text}</span></p>
                    <p style={{ fontSize: "11px", color: "#AAAAAA" }}>{c.date}</p>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={function() { setReplyTo(c); }} style={{ border: "none", background: "none", fontSize: "11px", color: "#AAAAAA", cursor: "pointer" }}>↩ 답글</button>
                    <button onClick={function() { onDeleteComment(post.id, c.id); }} style={{ border: "none", background: "none", fontSize: "11px", color: "#DDDDDD", cursor: "pointer" }}>삭제</button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* 댓글 입력 */}
          {replyTo && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#F5F5F3", borderRadius: "8px", marginBottom: "8px", fontSize: "12px" }}>
              <span>↩ <b>{replyTo.name}</b>에게 답글 중</span>
              <button onClick={function() { setReplyTo(null); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "14px" }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select value={commentName} onChange={function(e) { setCommentName(e.target.value); }}
              style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", outline: "none", background: "#fff" }}>
              <option value="" disabled={true}>이름 선택</option>
              {TEAM_MEMBERS.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
            <input value={commentText} onChange={function(e) { setCommentText(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder="댓글을 입력하세요 (Enter로 등록)"
              style={{ flex: 1, minWidth: "160px", border: "1px solid #E8E8E8", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
            <button onClick={submitComment}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#111", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>등록</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}


/* ── FIELD ── */
function Field({ label, required, error, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
      <label style={{ fontSize:"13px", fontWeight:600, color:"#444" }}>
        {label} {required && <span style={{ color:"#FF6B6B" }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize:"12px", color:"#FF6B6B" }}>{error}</span>}
    </div>
  );
}
const inputStyle = (err) => ({
  padding:"11px 13px", borderRadius:"10px",
  border:`1.5px solid ${err ? "#FF6B6B" : "#E8E8E8"}`,
  fontSize:"14px", lineHeight:1.6, outline:"none",
  transition:"border-color 0.18s", width:"100%",
});

/* ── B레터 전용 폼 ── */
function BLetterForm({ onClose, onSubmit, editPost }) {
  const today = new Date().toLocaleDateString("ko-KR", { year:"2-digit", month:"2-digit", day:"2-digit" })
    .replace(/\. /g, ".").replace(/\.$/, "");

  const [author, setAuthor] = React.useState(editPost?.author || "");
  const [errors, setErrors] = React.useState({});
  const editorRef = React.useRef(null);
  const imgRef    = React.useRef();
  const vidRef    = React.useRef();
  const savedSel  = React.useRef(null);
  const [showSelMenu,   setShowSelMenu]   = React.useState(false);
  const [showLink,      setShowLink]      = React.useState(false);
  const [showHighlight, setShowHighlight] = React.useState(false);
  const [linkUrl,       setLinkUrl]       = React.useState("https://");
  const [linkPopupPos,  setLinkPopupPos]  = React.useState({ x: 0, y: 0 });
  const [showColorBox,  setShowColorBox]  = React.useState(false);

  const TEMPLATE = `<h2 style="font-size:22px;font-weight:800;color:#111;margin-bottom:24px;">📰 B레터</h2>
<div style="background:#FFF8E7;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;color:#92400E;font-size:14px;line-height:1.8;">이번 주 한 줄 요약을 여기에 입력하세요.</div>
<p><br/></p>
<div style="display:flex;align-items:center;gap:8px;margin:24px 0 12px;"><div style="flex:1;height:1.5px;background:#EAEAEA;"></div><span style="font-size:13px;font-weight:700;padding:5px 18px;border-radius:999px;border:2px solid #D97706;color:#D97706;background:#fff;white-space:nowrap;">📰 업계 소식</span><div style="flex:1;height:1.5px;background:#EAEAEA;"></div></div>
<p>내용을 입력하세요.</p>
<p><br/></p>
<div style="display:flex;align-items:center;gap:8px;margin:24px 0 12px;"><div style="flex:1;height:1.5px;background:#EAEAEA;"></div><span style="font-size:13px;font-weight:700;padding:5px 18px;border-radius:999px;border:2px solid #7C3AED;color:#7C3AED;background:#fff;white-space:nowrap;">🎬 콘텐츠 소식</span><div style="flex:1;height:1.5px;background:#EAEAEA;"></div></div>
<p>내용을 입력하세요.</p>
<p><br/></p>
<div style="display:flex;align-items:center;gap:8px;margin:24px 0 12px;"><div style="flex:1;height:1.5px;background:#EAEAEA;"></div><span style="font-size:13px;font-weight:700;padding:5px 18px;border-radius:999px;border:2px solid #059669;color:#059669;background:#fff;white-space:nowrap;">📈 트렌드 소식</span><div style="flex:1;height:1.5px;background:#EAEAEA;"></div></div>
<p>내용을 입력하세요.</p>
<p><br/></p>
<div style="display:flex;align-items:center;gap:8px;margin:24px 0 12px;"><div style="flex:1;height:1.5px;background:#EAEAEA;"></div><span style="font-size:13px;font-weight:700;padding:5px 18px;border-radius:999px;border:2px solid #2563EB;color:#2563EB;background:#fff;white-space:nowrap;">✏️ 제작 요청</span><div style="flex:1;height:1.5px;background:#EAEAEA;"></div></div>
<p>내용을 입력하세요.</p>
<p><br/></p>`;

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (editPost && editPost.editorHtml) {
      el.innerHTML = editPost.editorHtml;
      el.querySelectorAll("div[style*='border-left']").forEach(function(div) {
        var ta = document.createElement("textarea");
        ta.rows = 1; ta.value = div.textContent || "";
        ta.style.cssText = div.style.cssText + "width:100%;font-family:inherit;border-top:none;border-right:none;border-bottom:none;outline:none;resize:none;overflow:hidden;display:block;box-sizing:border-box;";
        ta.addEventListener("input", function() { ta.style.height="auto"; ta.style.height=ta.scrollHeight+"px"; });
        var wrapper = document.createElement("div");
        wrapper.setAttribute("contenteditable","false"); wrapper.style.cssText="margin:10px 0;display:block;";
        wrapper.appendChild(ta);
        div.parentNode.replaceChild(wrapper, div);
      });
    } else {
      el.innerHTML = TEMPLATE;
    }
    el.focus();
  }, []);

  const saveSel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedSel.current = sel.getRangeAt(0).cloneRange();
  };

  const applyLink = () => {
    if (!linkUrl || linkUrl === "https://") return;
    if (!savedSel.current) return;
    var el = editorRef.current; if (!el) return;
    // savedSel로 직접 처리 (포커스 복원 없이)
    var range = savedSel.current;
    var a = document.createElement("a");
    a.href=linkUrl; a.target="_blank"; a.rel="noopener noreferrer";
    a.style.color="#4338CA"; a.style.textDecoration="underline";
    try {
      a.appendChild(range.cloneContents());
      range.deleteContents();
      range.insertNode(a);
      var after = document.createRange(); after.setStartAfter(a); after.collapse(true);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(after);
    } catch(ex) {}
    setShowSelMenu(false); setShowLink(false); setShowHighlight(false); setLinkUrl("https://");
  };

  const cmd = (command) => {
    restoreSel(); document.execCommand(command, false, null);
    if (editorRef.current) editorRef.current.focus();
  };
  const restoreSel = () => {
    const el = editorRef.current; if (!el) return; el.focus();
    if (savedSel.current) { const s=window.getSelection(); s.removeAllRanges(); s.addRange(savedSel.current); }
  };

  const insertImg = async (file) => {
    var url = await uploadToStorage(file);
    if (!url) {
      url = await new Promise(function(res) {
        var r = new FileReader(); r.onload = function() { res(r.result); }; r.readAsDataURL(file);
      });
    }
    if (!url) return;
    restoreSel();
    const img = document.createElement("img");
    img.src=url; img.style.cssText="max-width:100%;border-radius:10px;display:block;margin:8px 0;";
    const sel = window.getSelection();
    if (sel && sel.rangeCount>0) { const r=sel.getRangeAt(0); r.insertNode(img); r.collapse(false); }
    else if (editorRef.current) editorRef.current.appendChild(img);
    const p=document.createElement("p"); p.innerHTML="<br/>";
    if (img.parentNode) img.parentNode.insertBefore(p, img.nextSibling);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleImgChange = (e) => {
    const files = Array.from(e.target.files); e.target.value="";
    files.reduce((p,f)=>p.then(()=>insertImg(f)), Promise.resolve());
  };
  const handleVidChange = async (e) => {
    const files = Array.from(e.target.files); e.target.value="";
    await files.reduce((p,f)=>p.then(async()=>{
      var url=await uploadToStorage(f);
      if(!url){url=await new Promise(function(res){var r=new FileReader();r.onload=function(){res(r.result);};r.readAsDataURL(f);});}
      if(!url) return;
      restoreSel();
      const vid=document.createElement("video"); vid.src=url; vid.controls=true;
      vid.style.cssText="max-width:100%;border-radius:10px;display:block;margin:8px 0;";
      const sel=window.getSelection();
      if(sel&&sel.rangeCount>0){const r=sel.getRangeAt(0);r.insertNode(vid);r.collapse(false);}
      else if(editorRef.current) editorRef.current.appendChild(vid);
      const p=document.createElement("p");p.innerHTML="<br/>";
      if(vid.parentNode) vid.parentNode.insertBefore(p,vid.nextSibling);
      if(editorRef.current) editorRef.current.focus();
    }), Promise.resolve());
  };

  const handleSubmit = () => {
    const e = {};
    if (!author.trim()) e.author = "작성자를 선택해주세요";
    if (Object.keys(e).length) { setErrors(e); return; }
    const el = editorRef.current;
    var cloned = el ? el.cloneNode(true) : null;
    if (cloned) {
      cloned.querySelectorAll("textarea").forEach(function(ta) {
        var div=document.createElement("div"); div.style.cssText=ta.style.cssText;
        div.style.whiteSpace="pre-wrap"; div.textContent=ta.value||"";
        if(ta.parentNode) ta.parentNode.replaceChild(div,ta);
      });
    }
    const editorHtml = cloned ? cloned.innerHTML : "";
    const body = el ? (el.innerText||"") : "";
    onSubmit({
      editorHtml, body,
      bBlocks: [], blocks: [], images: [], videos: [], files: [],
      category: "b-letter", categoryLabel: "B레터",
      title: "B레터 " + today, emoji: "📰", tag: "B레터",
      author, date: today,
      summary: body.slice(0,80)+(body.length>80?"...":""),
      url: editPost?.url||"", id: editPost?.id||Date.now(),
      likes:editPost?.likes||0, bookmarked:editPost?.bookmarked||false,
      liked:editPost?.liked||false, comments:editPost?.comments||[],
    });
    onClose();
  };

  const tbBtn = { border:"none", background:"none", width:"30px", height:"30px", borderRadius:"5px", cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:200, display:"flex", flexDirection:"column", fontFamily:"Pretendard, -apple-system, sans-serif" }}>


      {/* 드래그 선택 팝업 */}
      {showSelMenu && !showLink && !showHighlight && (
        <div style={{ position:"fixed", top:linkPopupPos.y+"px", left:linkPopupPos.x+"px", transform:"translateX(-50%)", background:"#1A1A1A", borderRadius:"10px", padding:"8px 10px", zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", display:"flex", gap:"4px", alignItems:"center" }}>
          <button type="button" onClick={function(){ setShowHighlight(false); setShowLink(true); setLinkUrl("https://"); }}
            style={{ border:"none", background:"none", cursor:"pointer", padding:"5px 10px", borderRadius:"7px", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", color:"#fff" }}
            onMouseEnter={function(e){ e.currentTarget.style.background="rgba(255,255,255,0.15)"; }}
            onMouseLeave={function(e){ e.currentTarget.style.background="none"; }}
          ><span style={{fontSize:"18px"}}>🔗</span><span style={{fontSize:"10px",opacity:0.7}}>링크</span></button>
          <div style={{width:"1px",height:"30px",background:"rgba(255,255,255,0.2)"}} />
          <button type="button" onClick={function(){ setShowLink(false); setShowHighlight(true); }}
            style={{ border:"none", background:"none", cursor:"pointer", padding:"5px 10px", borderRadius:"7px", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", color:"#fff" }}
            onMouseEnter={function(e){ e.currentTarget.style.background="rgba(255,255,255,0.15)"; }}
            onMouseLeave={function(e){ e.currentTarget.style.background="none"; }}
          ><span style={{fontSize:"18px"}}>🖊️</span><span style={{fontSize:"10px",opacity:0.7}}>형광펜</span></button>
          <div style={{width:"1px",height:"30px",background:"rgba(255,255,255,0.2)"}} />
          <button type="button" onClick={function(){ setShowSelMenu(false); setShowLink(false); setShowHighlight(false); }} style={{border:"none",background:"none",cursor:"pointer",color:"#888",fontSize:"16px",padding:"4px 6px"}}>✕</button>
        </div>
      )}
      {/* 링크 URL 입력 */}
      {showSelMenu && showLink && (
        <div style={{ position:"fixed", top:linkPopupPos.y+"px", left:linkPopupPos.x+"px", transform:"translateX(-50%)", background:"#1A1A1A", borderRadius:"10px", padding:"10px 12px", zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", display:"flex", gap:"6px", alignItems:"center", minWidth:"300px" }}>
          <button type="button" onClick={function(){setShowLink(false);}} style={{border:"none",background:"none",cursor:"pointer",color:"#aaa",fontSize:"18px",padding:"2px"}}>←</button>
          <span style={{fontSize:"14px"}}>🔗</span>
          <input autoFocus value={linkUrl} onChange={function(e){setLinkUrl(e.target.value);}}
            onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();applyLink();}if(e.key==="Escape"){setShowLink(false);}}}
            placeholder="URL 입력 후 Enter"
            style={{flex:1,border:"none",background:"rgba(255,255,255,0.15)",borderRadius:"6px",padding:"6px 10px",fontSize:"13px",outline:"none",color:"#fff",caretColor:"#fff"}} />
          <button type="button" onClick={applyLink} style={{padding:"6px 12px",borderRadius:"6px",background:"#4338CA",color:"#fff",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:700,whiteSpace:"nowrap"}}>적용</button>
        </div>
      )}
      {/* 형광펜 색상 선택 */}
      {showSelMenu && showHighlight && (
        <div style={{ position:"fixed", top:linkPopupPos.y+"px", left:linkPopupPos.x+"px", transform:"translateX(-50%)", background:"#1A1A1A", borderRadius:"10px", padding:"10px 12px", zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", display:"flex", gap:"6px", alignItems:"center" }}>
          <button type="button" onClick={function(){setShowHighlight(false);}} style={{border:"none",background:"none",cursor:"pointer",color:"#aaa",fontSize:"18px",padding:"2px"}}>←</button>
          {[["#FEF08A","노랑"],["#BBF7D0","초록"],["#BFDBFE","파랑"],["#FBCFE8","분홍"],["#FED7AA","주황"]].map(function(c){
            return (
              <button key={c[0]} type="button"
                onClick={function(){
                  if (!savedSel.current) return;
                  var range = savedSel.current;
                  var span = document.createElement("span");
                  span.style.backgroundColor = c[0];
                  span.style.borderRadius = "3px";
                  span.style.padding = "1px 2px";
                  try {
                    span.appendChild(range.cloneContents());
                    range.deleteContents();
                    range.insertNode(span);
                    var after = document.createRange(); after.setStartAfter(span); after.collapse(true);
                    var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(after);
                  } catch(ex) {}
                  setShowSelMenu(false); setShowHighlight(false);
                }}
                style={{ width:"26px", height:"26px", borderRadius:"5px", background:c[0], border:"2px solid rgba(255,255,255,0.4)", cursor:"pointer", transition:"transform 0.1s" }}
                onMouseEnter={function(e){e.currentTarget.style.transform="scale(1.25)";}}
                onMouseLeave={function(e){e.currentTarget.style.transform="scale(1)";}}
                title={c[1]}
              />
            );
          })}
        </div>
      )}

      {/* 색깔 블록 팝업 */}
      {showColorBox && (
        <div style={{ position:"fixed", bottom:"80px", left:"50%", transform:"translateX(-50%)", background:"#fff", border:"1px solid #E0E0E0", borderRadius:"12px", padding:"12px", zIndex:9999, boxShadow:"0 8px 32px rgba(0,0,0,0.16)", display:"flex", gap:"8px", alignItems:"center" }}>
          {[
            {label:"파랑",bg:"#EFF6FF",border:"#BFDBFE",text:"#1E40AF",icon:"🔵"},
            {label:"초록",bg:"#F0FDF4",border:"#BBF7D0",text:"#166534",icon:"🟢"},
            {label:"노랑",bg:"#FEFCE8",border:"#FDE68A",text:"#92400E",icon:"🟡"},
            {label:"빨강",bg:"#FFF1F2",border:"#FECDD3",text:"#BE123C",icon:"🔴"},
            {label:"보라",bg:"#F5F3FF",border:"#DDD6FE",text:"#5B21B6",icon:"🟣"},
          ].map(function(col){
            return (
              <button key={col.label} type="button"
                onClick={function(){
                  var el=editorRef.current; if(!el) return; el.focus();
                  var wrapper=document.createElement("div"); wrapper.setAttribute("contenteditable","false"); wrapper.style.cssText="margin:10px 0;display:block;";
                  var ta=document.createElement("textarea"); ta.rows=1; ta.placeholder="내용을 입력하세요...";
                  ta.style.cssText="width:100%;background:"+col.bg+";border-left:4px solid "+col.border+";border-radius:0 8px 8px 0;padding:12px 16px;color:"+col.text+";font-size:14px;line-height:1.8;font-family:inherit;border-top:none;border-right:none;border-bottom:none;outline:none;resize:none;overflow:hidden;display:block;box-sizing:border-box;";
                  ta.addEventListener("input",function(){ta.style.height="auto";ta.style.height=ta.scrollHeight+"px";});
                  wrapper.appendChild(ta);
                  var pAfter=document.createElement("p"); pAfter.innerHTML="<br/>";
                  if(savedSel.current){try{var s=window.getSelection();s.removeAllRanges();s.addRange(savedSel.current);var r=s.getRangeAt(0);r.collapse(false);r.insertNode(pAfter);r.insertNode(wrapper);}catch(ex){el.appendChild(wrapper);el.appendChild(pAfter);}}
                  else{el.appendChild(wrapper);el.appendChild(pAfter);}
                  setTimeout(function(){ta.focus();},10);
                  setShowColorBox(false);
                }}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",border:"2px solid "+col.border,background:col.bg,borderRadius:"8px",padding:"8px 10px",cursor:"pointer",fontSize:"11px",color:col.text,fontWeight:600,minWidth:"46px"}}
                onMouseEnter={function(e){e.currentTarget.style.opacity="0.75";}}
                onMouseLeave={function(e){e.currentTarget.style.opacity="1";}}
              ><span style={{fontSize:"16px"}}>{col.icon}</span>{col.label}</button>
            );
          })}
          <button type="button" onClick={function(){setShowColorBox(false);}} style={{border:"none",background:"none",cursor:"pointer",fontSize:"16px",color:"#888",padding:"4px",marginLeft:"4px"}}>✕</button>
        </div>
      )}

      {/* 메타 툴바 */}
      <div style={{ borderBottom:"1px solid #EAEAEA", padding:"0 20px", height:"52px", display:"flex", alignItems:"center", gap:"12px", flexShrink:0, background:"#fff" }}>
        <button type="button" onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:"20px",color:"#888"}}>←</button>
        <span style={{fontSize:"14px",fontWeight:700,color:"#D97706"}}>📰 B레터</span>
        <div style={{flex:1}} />
        <select value={author} onChange={function(e){setAuthor(e.target.value);}} style={{border:"1px solid #E8E8E8",borderRadius:"8px",padding:"5px 10px",fontSize:"13px",color:author?"#333":"#AAA",outline:"none",background:"#fff",cursor:"pointer"}}>
          <option value="" disabled>작성자 선택</option>
          {TEAM_MEMBERS.map(function(m){return <option key={m} value={m}>{m}</option>;})}
        </select>
        {errors.author && <span style={{fontSize:"11px",color:"#FF6B6B"}}>{errors.author}</span>}
        <button type="button" onClick={function(){ if(imgRef.current) imgRef.current.click(); }} style={{padding:"6px 12px",borderRadius:"8px",border:"1px solid #E8E8E8",background:"#fff",color:"#555",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>🖼️ 사진</button>
        <input ref={imgRef} type="file" accept="image/*" multiple onChange={handleImgChange} style={{display:"none"}} />
        <button type="button" onClick={function(){ if(vidRef.current) vidRef.current.click(); }} style={{padding:"6px 12px",borderRadius:"8px",border:"1px solid #E8E8E8",background:"#fff",color:"#555",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>🎬 영상</button>
        <input ref={vidRef} type="file" accept="video/*" multiple onChange={handleVidChange} style={{display:"none"}} />
        <button type="button" onClick={handleSubmit} style={{padding:"7px 18px",borderRadius:"8px",border:"none",background:"#D97706",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>{editPost?"수정 완료":"등록하기 →"}</button>
      </div>

      {/* 서식 툴바 */}
      <div style={{ borderBottom:"1px solid #EAEAEA", padding:"0 16px", height:"44px", display:"flex", alignItems:"center", gap:"2px", flexShrink:0, background:"#FAFAF9", overflowX:"visible", position:"relative", zIndex:10 }}>
        {[
          {l:"B",c:"bold",s:{fontWeight:800}},
          {l:"I",c:"italic",s:{fontStyle:"italic"}},
          {l:<span style={{textDecoration:"underline"}}>U</span>,c:"underline",s:{}},
          {l:<span style={{textDecoration:"line-through"}}>S</span>,c:"strikeThrough",s:{}},
        ].map(function(btn,i){
          return (
            <button key={i} type="button"
              onMouseDown={function(e){e.preventDefault();saveSel();cmd(btn.c);}}
              style={Object.assign({},tbBtn,btn.s)}
              onMouseEnter={function(e){e.currentTarget.style.background="#EBEBEB";}}
              onMouseLeave={function(e){e.currentTarget.style.background="none";}}
            >{btn.l}</button>
          );
        })}
        <div style={{width:"1px",height:"20px",background:"#E0E0E0",margin:"0 4px"}} />
        {[["←","justifyLeft"],["↔","justifyCenter"],["→","justifyRight"]].map(function(pair){
          return (
            <button key={pair[1]} type="button"
              onMouseDown={function(e){e.preventDefault();saveSel();cmd(pair[1]);}}
              style={tbBtn}
              onMouseEnter={function(e){e.currentTarget.style.background="#EBEBEB";}}
              onMouseLeave={function(e){e.currentTarget.style.background="none";}}
            >{pair[0]}</button>
          );
        })}
        <div style={{width:"1px",height:"20px",background:"#E0E0E0",margin:"0 4px"}} />
        {[["소","13px"],["중","15px"],["대","18px"],["특대","22px"]].map(function(sz){
          return (
            <button key={sz[0]} type="button"
              onMouseDown={function(e){
                e.preventDefault(); restoreSel();
                var sel=window.getSelection();
                if(sel&&!sel.isCollapsed&&sel.rangeCount>0){
                  var range=sel.getRangeAt(0); var span=document.createElement("span"); span.style.fontSize=sz[1];
                  try{range.surroundContents(span);}catch(err){var frag=range.extractContents();span.appendChild(frag);range.insertNode(span);}
                  sel.removeAllRanges();
                }
                if(editorRef.current) editorRef.current.focus();
              }}
              style={{border:"1px solid #E0E0E0",background:"#fff",borderRadius:"5px",padding:"0 7px",height:"28px",fontSize:"11px",fontWeight:600,cursor:"pointer",color:"#555"}}
              onMouseEnter={function(e){e.currentTarget.style.background="#EBEBEB";}}
              onMouseLeave={function(e){e.currentTarget.style.background="#fff";}}
            >{sz[0]}</button>
          );
        })}
        <div style={{width:"1px",height:"20px",background:"#E0E0E0",margin:"0 4px"}} />
        {/* 링크 버튼 */}
        <button type="button"
          onMouseDown={function(e){e.preventDefault();saveSel();setShowLink(function(v){return !v;});}}
          style={Object.assign({},tbBtn,{fontSize:"16px"})}
          onMouseEnter={function(e){e.currentTarget.style.background="#EBEBEB";}}
          onMouseLeave={function(e){e.currentTarget.style.background="none";}}
          title="링크 삽입"
        >🔗</button>
        {/* 색깔 블록 버튼 */}
        <button type="button"
          onMouseDown={function(e){e.preventDefault();saveSel();setShowColorBox(function(v){return !v;});}}
          style={Object.assign({},tbBtn,{fontSize:"13px",fontWeight:700,color:"#555"})}
          onMouseEnter={function(e){e.currentTarget.style.background="#EBEBEB";}}
          onMouseLeave={function(e){e.currentTarget.style.background="none";}}
          title="색깔 블록"
        >▦</button>
      </div>

      {/* 에디터 본문 */}
      <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",background:"#fff"}}
        onDragOver={function(e){e.preventDefault();}}
        onClick={function(){setShowColorBox(false);}}
      >
        <div style={{width:"100%",maxWidth:"760px",padding:"0 32px 120px"}}>
          <div
            ref={editorRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onMouseUp={function(e){
              saveSel();
              var sel=window.getSelection();
              if(sel&&!sel.isCollapsed&&sel.rangeCount>0){
                var rect=sel.getRangeAt(0).getBoundingClientRect();
                var x=rect.left+rect.width/2; var y=rect.top-50;
                if(y<60) y=rect.bottom+10;
                setLinkPopupPos({x:Math.max(160,Math.min(x,window.innerWidth-160)),y:y});
                setShowSelMenu(true); setShowLink(false); setShowHighlight(false);
              } else { setShowSelMenu(false); setShowLink(false); setShowHighlight(false); }
            }}
            onKeyUp={saveSel}
            onKeyDown={function(e){
                            if (e.key === "Enter") {
                // 형광펜 span 안에 있으면 밖으로 빠져나오기
                var sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  var range = sel.getRangeAt(0);
                  var node = range.startContainer;
                  // 부모 중에 backgroundColor 있는 span 찾기
                  var span = null;
                  var cur = node.nodeType === 3 ? node.parentNode : node;
                  while (cur && cur !== e.currentTarget) {
                    if (cur.tagName === "SPAN" && cur.style && cur.style.backgroundColor) {
                      span = cur; break;
                    }
                    cur = cur.parentNode;
                  }
                  if (span) {
                    e.preventDefault();
                    // span 뒤에 새 p 삽입
                    var newP = document.createElement("p");
                    newP.innerHTML = "<br/>";
                    span.parentNode.insertBefore(newP, span.nextSibling);
                    var newRange = document.createRange();
                    newRange.setStart(newP, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    return;
                  }
                }
              }
              if(e.key==="Tab"){e.preventDefault();document.execCommand("insertText",false,"    ");}
            }}
            onFocus={saveSel}
            onPaste={function(e){
              const items=Array.from((e.clipboardData&&e.clipboardData.items)?e.clipboardData.items:[]);
              const imgs=items.filter(function(i){return i.type.startsWith("image/");});
              if(!imgs.length) return;
              e.preventDefault();
              imgs.reduce(function(p,item){return p.then(function(){var file=item.getAsFile();return file?insertImg(file):Promise.resolve();});},Promise.resolve());
            }}
            style={{minHeight:"500px",outline:"none",fontSize:"15px",lineHeight:1.9,color:"#333",wordBreak:"break-word",paddingTop:"32px"}}
          />
        </div>
      </div>
    </div>
  );
}


function WriteModal({ onClose, onSubmit, editPost, writeCategory }) {
  const [category, setCategory] = React.useState(editPost?.category || writeCategory || "ai-trend");
  const [title, setTitle] = React.useState(editPost?.title || "");
  const [author, setAuthor] = React.useState(editPost?.author || "");
  const [emoji, setEmoji] = React.useState(editPost?.emoji || "📝");
  const [tag, setTag] = React.useState(editPost?.tag || "");
  const [errors, setErrors] = React.useState({});
  const [showSelMenu,   setShowSelMenu]   = React.useState(false);
  const [showLink,      setShowLink]      = React.useState(false);
  const [showHighlight, setShowHighlight] = React.useState(false);
  const [linkUrl,       setLinkUrl]       = React.useState("https://");
  const [linkPopupPos,  setLinkPopupPos]  = React.useState({ x: 0, y: 0 });
  const [showColorBox,  setShowColorBox]  = React.useState(false);
  const editorRef = React.useRef(null);
  const imgRef = React.useRef();
  const vidRef = React.useRef();
  const fileRef = React.useRef();
  const savedSel = React.useRef(null);

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (editPost && editPost.editorHtml) {
      el.innerHTML = editPost.editorHtml;
      // 저장 시 변환된 색깔블록 div → textarea로 복원
      el.querySelectorAll("div[style*='border-left']").forEach(function(div) {
        var ta = document.createElement("textarea");
        ta.rows = 1;
        ta.value = div.textContent || "";
        ta.style.cssText = div.style.cssText + "width:100%;font-family:inherit;border-top:none;border-right:none;border-bottom:none;outline:none;resize:none;overflow:hidden;display:block;box-sizing:border-box;white-space:pre-wrap;";
        ta.addEventListener("input", function() {
          ta.style.height = "auto";
          ta.style.height = ta.scrollHeight + "px";
        });
        // 초기 높이 맞추기
        setTimeout(function() {
          ta.style.height = "auto";
          ta.style.height = ta.scrollHeight + "px";
        }, 0);
        var wrapper = document.createElement("div");
        wrapper.setAttribute("contenteditable", "false");
        wrapper.style.cssText = "margin:10px 0;display:block;";
        wrapper.appendChild(ta);
        div.parentNode.replaceChild(wrapper, div);
      });
    } else if (editPost && editPost.body) {
      el.innerHTML = "<p>" + editPost.body + "</p>";
    } else {
      el.innerHTML = "<p><br/></p>";
    }
    el.focus();
  }, []);

  const saveSel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedSel.current = sel.getRangeAt(0).cloneRange();
  };

  const applyLink = () => {
    if (!linkUrl || linkUrl === "https://") return;
    if (!savedSel.current) return;
    var el = editorRef.current; if (!el) return;
    var range = savedSel.current;
    var a = document.createElement("a");
    a.href = linkUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.style.color = "#4338CA"; a.style.textDecoration = "underline";
    try {
      a.appendChild(range.cloneContents());
      range.deleteContents();
      range.insertNode(a);
      var after = document.createRange(); after.setStartAfter(a); after.collapse(true);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(after);
    } catch(ex) {}
    setShowLink(false); setLinkUrl("https://");
  };

  const restoreSel = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (savedSel.current) {
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(savedSel.current); }
    }
  };

  const cmd = (command, val) => {
    restoreSel();
    document.execCommand(command, false, val || null);
    if (editorRef.current) editorRef.current.focus();
  };

  const insertImg = async (file) => {
    let url = await uploadToStorage(file);
    if (!url) {
      url = await new Promise(function(res) {
        const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file);
      });
    }
    if (!url) return;
    restoreSel();
    const img = document.createElement("img");
    img.src = url;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";
    img.style.display = "block";
    img.style.margin = "8px 0";
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.insertNode(img);
      range.collapse(false);
    } else if (editorRef.current) {
      editorRef.current.appendChild(img);
    }
    const p = document.createElement("p");
    p.innerHTML = "<br/>";
    if (img.parentNode) img.parentNode.insertBefore(p, img.nextSibling);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleImgChange = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    files.reduce(function(p, f) { return p.then(function() { return insertImg(f); }); }, Promise.resolve());
  };

  const handleVidChange = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    await files.reduce(function(p, f) {
      return p.then(async function() {
        let url = await uploadToStorage(f);
        if (!url) {
          url = await new Promise(function(res) {
            const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
          });
        }
        if (!url) return;
        restoreSel();
        const vid = document.createElement("video");
        vid.src = url; vid.controls = true;
        vid.style.maxWidth = "100%"; vid.style.borderRadius = "10px"; vid.style.display = "block"; vid.style.margin = "8px 0";
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) { const r = sel.getRangeAt(0); r.insertNode(vid); r.collapse(false); }
        else if (editorRef.current) editorRef.current.appendChild(vid);
        const p = document.createElement("p"); p.innerHTML = "<br/>";
        if (vid.parentNode) vid.parentNode.insertBefore(p, vid.nextSibling);
        if (editorRef.current) editorRef.current.focus();
      });
    }, Promise.resolve());
  };

  const handlePaste = (e) => {
    const items = e.clipboardData ? Array.from(e.clipboardData.items) : [];
    const imgItems = items.filter(function(i) { return i.type.startsWith("image/"); });
    if (!imgItems.length) return;
    e.preventDefault();
    imgItems.reduce(function(p, item) {
      return p.then(function() {
        const file = item.getAsFile();
        return file ? insertImg(file) : Promise.resolve();
      });
    }, Promise.resolve());
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.reduce(function(p, f) {
      return p.then(function() {
        if (f.type.startsWith("image/")) return insertImg(f);
        return Promise.resolve();
      });
    }, Promise.resolve());
  };

  const handleSubmit = () => {
    const errs = {};
    if (!title.trim()) errs.title = "제목을 입력해주세요";
    if (!author.trim()) errs.author = "작성자를 선택해주세요";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const el = editorRef.current;
    // textarea를 읽기전용 div로 변환해서 저장
    var cloned = el ? el.cloneNode(true) : null;
    if (cloned) {
      cloned.querySelectorAll("textarea").forEach(function(ta) {
        var div = document.createElement("div");
        div.style.cssText = ta.style.cssText;
        div.style.whiteSpace = "pre-wrap";
        div.textContent = ta.value || ta.placeholder || "";
        if (ta.parentNode) ta.parentNode.replaceChild(div, ta);
      });
    }
    const editorHtml = cloned ? cloned.innerHTML : "";
    const body = el ? (el.innerText || "") : "";
    onSubmit({
      editorHtml, body,
      blocks: [{ id: Date.now(), type: "text", content: body }],
      images: [], videos: [], files: [],
      category, title, emoji, tag, author,
      summary: body.slice(0, 80) + (body.length > 80 ? "..." : ""),
      url: (editPost && editPost.url) || "",
      id: (editPost && editPost.id) || Date.now(),
      categoryLabel: (CATEGORIES.find(function(c) { return c.id === category; }) || {}).label || "",
      date: (editPost && editPost.date) || new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, ""),
      likes: (editPost && editPost.likes) || 0,
      bookmarked: (editPost && editPost.bookmarked) || false,
      liked: (editPost && editPost.liked) || false,
      comments: (editPost && editPost.comments) || [],
    });
    onClose();
  };


  const tbBtn = { border: "none", background: "none", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, display: "flex", flexDirection: "column", fontFamily: "Pretendard, -apple-system, sans-serif" }}>
      {/* 드래그 선택 팝업 */}
      {showSelMenu && !showLink && !showHighlight && (
        <div style={{ position:"fixed", top:linkPopupPos.y+"px", left:linkPopupPos.x+"px", transform:"translateX(-50%)", background:"#1A1A1A", borderRadius:"10px", padding:"8px 10px", zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", display:"flex", gap:"4px", alignItems:"center" }}>
          <button type="button" onClick={function(){ setShowHighlight(false); setShowLink(true); setLinkUrl("https://"); }}
            style={{ border:"none", background:"none", cursor:"pointer", padding:"5px 10px", borderRadius:"7px", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", color:"#fff" }}
            onMouseEnter={function(e){ e.currentTarget.style.background="rgba(255,255,255,0.15)"; }}
            onMouseLeave={function(e){ e.currentTarget.style.background="none"; }}
          ><span style={{fontSize:"18px"}}>🔗</span><span style={{fontSize:"10px",opacity:0.7}}>링크</span></button>
          <div style={{width:"1px",height:"30px",background:"rgba(255,255,255,0.2)"}} />
          <button type="button" onClick={function(){ setShowLink(false); setShowHighlight(true); }}
            style={{ border:"none", background:"none", cursor:"pointer", padding:"5px 10px", borderRadius:"7px", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", color:"#fff" }}
            onMouseEnter={function(e){ e.currentTarget.style.background="rgba(255,255,255,0.15)"; }}
            onMouseLeave={function(e){ e.currentTarget.style.background="none"; }}
          ><span style={{fontSize:"18px"}}>🖊️</span><span style={{fontSize:"10px",opacity:0.7}}>형광펜</span></button>
          <div style={{width:"1px",height:"30px",background:"rgba(255,255,255,0.2)"}} />
          <button type="button" onClick={function(){ setShowSelMenu(false); setShowLink(false); setShowHighlight(false); }} style={{border:"none",background:"none",cursor:"pointer",color:"#888",fontSize:"16px",padding:"4px 6px"}}>✕</button>
        </div>
      )}
      {/* 링크 URL 입력 */}
      {showSelMenu && showLink && (
        <div style={{ position:"fixed", top:linkPopupPos.y+"px", left:linkPopupPos.x+"px", transform:"translateX(-50%)", background:"#1A1A1A", borderRadius:"10px", padding:"10px 12px", zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", display:"flex", gap:"6px", alignItems:"center", minWidth:"300px" }}>
          <button type="button" onClick={function(){setShowLink(false);}} style={{border:"none",background:"none",cursor:"pointer",color:"#aaa",fontSize:"18px",padding:"2px"}}>←</button>
          <span style={{fontSize:"14px"}}>🔗</span>
          <input autoFocus value={linkUrl} onChange={function(e){setLinkUrl(e.target.value);}}
            onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();applyLink();}if(e.key==="Escape"){setShowLink(false);}}}
            placeholder="URL 입력 후 Enter"
            style={{flex:1,border:"none",background:"rgba(255,255,255,0.15)",borderRadius:"6px",padding:"6px 10px",fontSize:"13px",outline:"none",color:"#fff",caretColor:"#fff"}} />
          <button type="button" onClick={applyLink} style={{padding:"6px 12px",borderRadius:"6px",background:"#4338CA",color:"#fff",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:700,whiteSpace:"nowrap"}}>적용</button>
        </div>
      )}
      {/* 형광펜 색상 선택 */}
      {showSelMenu && showHighlight && (
        <div style={{ position:"fixed", top:linkPopupPos.y+"px", left:linkPopupPos.x+"px", transform:"translateX(-50%)", background:"#1A1A1A", borderRadius:"10px", padding:"10px 12px", zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", display:"flex", gap:"6px", alignItems:"center" }}>
          <button type="button" onClick={function(){setShowHighlight(false);}} style={{border:"none",background:"none",cursor:"pointer",color:"#aaa",fontSize:"18px",padding:"2px"}}>←</button>
          {[["#FEF08A","노랑"],["#BBF7D0","초록"],["#BFDBFE","파랑"],["#FBCFE8","분홍"],["#FED7AA","주황"]].map(function(c){
            return (
              <button key={c[0]} type="button"
                onClick={function(){
                  if (!savedSel.current) return;
                  var range = savedSel.current;
                  var span = document.createElement("span");
                  span.style.backgroundColor = c[0];
                  span.style.borderRadius = "3px";
                  span.style.padding = "1px 2px";
                  try {
                    span.appendChild(range.cloneContents());
                    range.deleteContents();
                    range.insertNode(span);
                    var after = document.createRange(); after.setStartAfter(span); after.collapse(true);
                    var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(after);
                  } catch(ex) {}
                  setShowSelMenu(false); setShowHighlight(false);
                }}
                style={{ width:"26px", height:"26px", borderRadius:"5px", background:c[0], border:"2px solid rgba(255,255,255,0.4)", cursor:"pointer", transition:"transform 0.1s" }}
                onMouseEnter={function(e){e.currentTarget.style.transform="scale(1.25)";}}
                onMouseLeave={function(e){e.currentTarget.style.transform="scale(1)";}}
                title={c[1]}
              />
            );
          })}
        </div>
      )}
      {/* 색깔 블록 팝업 - fixed */}
      {showColorBox && (
        <div style={{ position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)", background: "#fff", border: "1px solid #E0E0E0", borderRadius: "12px", padding: "12px", zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.16)", display: "flex", gap: "8px", alignItems: "center" }}>
          {[
            { label: "파랑", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "🔵" },
            { label: "초록", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "🟢" },
            { label: "노랑", bg: "#FEFCE8", border: "#FDE68A", text: "#92400E", icon: "🟡" },
            { label: "빨강", bg: "#FFF1F2", border: "#FECDD3", text: "#BE123C", icon: "🔴" },
            { label: "보라", bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6", icon: "🟣" },
          ].map(function(col) {
            return (
              <button key={col.label} type="button"
                onClick={function() {
                  var el = editorRef.current; if (!el) return; el.focus();
                  // textarea를 색깔 박스 스타일로 삽입
                  var wrapper = document.createElement("div");
                  wrapper.setAttribute("contenteditable", "false");
                  wrapper.style.cssText = "margin:10px 0;display:block;";
                  var ta = document.createElement("textarea");
                  ta.placeholder = "내용을 입력하세요...";
                  ta.rows = 1;
                  ta.style.cssText = "width:100%;background:"+col.bg+";border-left:4px solid "+col.border+";border-radius:0 8px 8px 0;padding:12px 16px;color:"+col.text+";font-size:14px;line-height:1.8;font-family:inherit;border-top:none;border-right:none;border-bottom:none;outline:none;resize:none;overflow:hidden;display:block;box-sizing:border-box;";
                  ta.addEventListener("input", function() {
                    ta.style.height = "auto";
                    ta.style.height = ta.scrollHeight + "px";
                  });
                  wrapper.appendChild(ta);
                  var pAfter = document.createElement("p"); pAfter.innerHTML = "<br/>";
                  if (savedSel.current) {
                    try { var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(savedSel.current); var range=sel.getRangeAt(0); range.collapse(false); range.insertNode(pAfter); range.insertNode(wrapper); }
                    catch(ex) { el.appendChild(wrapper); el.appendChild(pAfter); }
                  } else { el.appendChild(wrapper); el.appendChild(pAfter); }
                  setTimeout(function() { ta.focus(); }, 10);
                  setShowColorBox(false);
                }}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", border:"2px solid "+col.border, background:col.bg, borderRadius:"8px", padding:"8px 10px", cursor:"pointer", fontSize:"11px", color:col.text, fontWeight:600, minWidth:"46px" }}
                onMouseEnter={function(e){e.currentTarget.style.opacity="0.75";}}
                onMouseLeave={function(e){e.currentTarget.style.opacity="1";}}
              ><span style={{fontSize:"16px"}}>{col.icon}</span>{col.label}</button>
            );
          })}
          <button type="button" onClick={function(){setShowColorBox(false);}} style={{border:"none",background:"none",cursor:"pointer",fontSize:"16px",color:"#888",padding:"4px",marginLeft:"4px"}}>✕</button>
        </div>
      )}
      <input ref={imgRef}  type="file" accept="image/*" multiple onChange={handleImgChange} style={{ display: "none" }} />
      <input ref={vidRef}  type="file" accept="video/*" multiple onChange={handleVidChange} style={{ display: "none" }} />

      {/* 메타 툴바 */}
      <div style={{ borderBottom: "1px solid #EAEAEA", padding: "0 20px", height: "52px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, background: "#fff" }}>
        <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#888" }}>←</button>
        <select value={category} onChange={function(e) { setCategory(e.target.value); }} style={{ border: "none", background: "none", fontSize: "13px", fontWeight: 700, color: "#111", outline: "none", cursor: "pointer" }}>
          {CATEGORIES.filter(function(c) { return c.id !== "all"; }).map(function(c) { return <option key={c.id} value={c.id}>{c.label}</option>; })}
        </select>
        <div style={{ width: "1px", height: "20px", background: "#EAEAEA" }} />
        <select value={author} onChange={function(e) { setAuthor(e.target.value); }} style={{ border: "none", background: "none", fontSize: "13px", color: author ? "#333" : "#AAA", outline: "none", cursor: "pointer" }}>
          <option value="" disabled={true}>작성자</option>
          {TEAM_MEMBERS.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
        </select>
        {errors.author && <span style={{ fontSize: "11px", color: "#FF6B6B" }}>{errors.author}</span>}
        <div style={{ flex: 1 }} />
        <input value={tag} onChange={function(e) { setTag(e.target.value); }} placeholder="#태그" style={{ border: "none", background: "#F5F5F3", borderRadius: "7px", padding: "5px 10px", fontSize: "12px", outline: "none", width: "80px" }} />
        <button type="button" onClick={handleSubmit} style={{ padding: "7px 18px", borderRadius: "8px", border: "none", background: "#111", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          {editPost ? "수정 완료" : "등록 →"}
        </button>
      </div>

      {/* 서식 툴바 */}
      <div style={{ borderBottom: "1px solid #EAEAEA", padding: "0 16px", height: "44px", display: "flex", alignItems: "center", gap: "2px", flexShrink: 0, background: "#FAFAF9", overflowX: "visible", position: "relative", zIndex: 10 }}>
        {[
          { l: "B", c: "bold", s: { fontWeight: 800 } },
          { l: "I", c: "italic", s: { fontStyle: "italic" } },
          { l: <span style={{ textDecoration: "underline" }}>U</span>, c: "underline", s: {} },
          { l: <span style={{ textDecoration: "line-through" }}>S</span>, c: "strikeThrough", s: {} },
        ].map(function(btn, i) {
          return (
            <button key={i} type="button"
              onMouseDown={function(e) { e.preventDefault(); saveSel(); cmd(btn.c); }}
              style={Object.assign({}, tbBtn, btn.s)}
              onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
            >{btn.l}</button>
          );
        })}
        <div style={{ width: "1px", height: "20px", background: "#E0E0E0", margin: "0 4px" }} />
        {[["←","justifyLeft"],["↔","justifyCenter"],["→","justifyRight"]].map(function(pair) {
          return (
            <button key={pair[1]} type="button"
              onMouseDown={function(e) { e.preventDefault(); saveSel(); cmd(pair[1]); }}
              style={tbBtn}
              onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
            >{pair[0]}</button>
          );
        })}
        <div style={{ width: "1px", height: "20px", background: "#E0E0E0", margin: "0 4px" }} />
        {/* 글자 크기 - 인라인 버튼 */}
        {[["소","13px"],["중","15px"],["대","18px"],["특대","22px"]].map(function(sz) {
          return (
            <button key={sz[0]} type="button"
              onMouseDown={function(e) {
                e.preventDefault();
                restoreSel();
                var sel = window.getSelection();
                if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
                  var range = sel.getRangeAt(0);
                  var span = document.createElement("span");
                  span.style.fontSize = sz[1];
                  try { range.surroundContents(span); } catch(err) {
                    var frag = range.extractContents();
                    span.appendChild(frag);
                    range.insertNode(span);
                  }
                  sel.removeAllRanges();
                }
                if (editorRef.current) editorRef.current.focus();
              }}
              style={{ border: "1px solid #E0E0E0", background: "#fff", borderRadius: "5px", padding: "0 7px", height: "28px", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: "#555" }}
              onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "#fff"; }}
            >{sz[0]}</button>
          );
        })}
        {/* 하이퍼링크 */}
        <div style={{ position: "relative" }}>
          <button type="button"
            onMouseDown={function(e) { e.preventDefault(); saveSel(); setShowLink(function(v) { return !v; }); }}
            style={{ border: "none", background: "none", width: "30px", height: "30px", borderRadius: "5px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
            title="링크 삽입"
          >🔗</button>

        </div>
        {/* 색깔 블록 */}
        <div style={{ position: "relative" }}>
          <button type="button"
            onMouseDown={function(e) { e.preventDefault(); saveSel(); setShowColorBox(function(v) { return !v; }); }}
            style={{ border: "none", background: "none", width: "30px", height: "30px", borderRadius: "5px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#555" }}
            onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
            title="색깔 블록"
          >▦</button>

        </div>
                <div style={{ width: "1px", height: "20px", background: "#E0E0E0", margin: "0 4px" }} />
        {/* 미디어 */}
        <button type="button"
          onMouseDown={saveSel}
          onClick={function(){ if(imgRef.current) imgRef.current.click(); }}
          style={Object.assign({}, tbBtn, { cursor: "pointer" })}
          onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
        >🖼️</button>
        <button type="button"
          onMouseDown={saveSel}
          onClick={function(){ if(vidRef.current) vidRef.current.click(); }}
          style={Object.assign({}, tbBtn, { cursor: "pointer" })}
          onMouseEnter={function(e) { e.currentTarget.style.background = "#EBEBEB"; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
        >🎬</button>
      </div>

      {/* 에디터 본문 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", background: "#fff" }}
        onDragOver={function(e) { e.preventDefault(); }} onDrop={handleDrop}
        onClick={function() { setShowSzMenu(false); }}
      >
        <div style={{ width: "100%", maxWidth: "760px", padding: "0 32px 120px" }}>
          <input value={title} onChange={function(e) { setTitle(e.target.value); }}
            placeholder="제목을 입력하세요"
            style={{ width: "100%", border: "none", outline: "none", background: "none", fontSize: "28px", fontWeight: 800, lineHeight: 1.3, color: "#111", padding: "36px 0 16px", borderBottom: errors.title ? "2px solid #FF6B6B" : "1.5px solid #EAEAEA", marginBottom: "24px", display: "block" }}
          />

          <div
            ref={editorRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onMouseUp={function(e) {
              saveSel();
              // 텍스트 선택 시 링크 팝업 위치 계산
              var sel = window.getSelection();
              if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
                var rect = sel.getRangeAt(0).getBoundingClientRect();
                var x = rect.left + rect.width / 2;
                var y = rect.top - 50; // 선택 영역 위에 표시
                if (y < 60) y = rect.bottom + 10; // 화면 위면 아래에 표시
                setLinkPopupPos({ x: Math.max(160, Math.min(x, window.innerWidth - 160)), y: y });
                setShowSelMenu(true); setShowLink(false); setShowHighlight(false);
              } else {
                setShowSelMenu(false); setShowLink(false); setShowHighlight(false);
              }
            }}
            onKeyUp={saveSel}
            onKeyDown={function(e) {
                            if (e.key === "Enter") {
                // 형광펜 span 안에 있으면 밖으로 빠져나오기
                var sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  var range = sel.getRangeAt(0);
                  var node = range.startContainer;
                  // 부모 중에 backgroundColor 있는 span 찾기
                  var span = null;
                  var cur = node.nodeType === 3 ? node.parentNode : node;
                  while (cur && cur !== e.currentTarget) {
                    if (cur.tagName === "SPAN" && cur.style && cur.style.backgroundColor) {
                      span = cur; break;
                    }
                    cur = cur.parentNode;
                  }
                  if (span) {
                    e.preventDefault();
                    // span 뒤에 새 p 삽입
                    var newP = document.createElement("p");
                    newP.innerHTML = "<br/>";
                    span.parentNode.insertBefore(newP, span.nextSibling);
                    var newRange = document.createRange();
                    newRange.setStart(newP, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    return;
                  }
                }
              }
              if (e.key === "Tab") {
                e.preventDefault();
                document.execCommand("insertText", false, "    ");
              }
            }}
            onFocus={saveSel}
            onBlur={saveSel}
            onPaste={handlePaste}
            style={{ minHeight: "400px", outline: "none", fontSize: "15px", lineHeight: 1.9, color: "#333", wordBreak: "break-word" }}
          />
          <div style={{ minHeight: "80px", cursor: "text" }} onClick={function() {
            if (!editorRef.current) return;
            editorRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            const sel = window.getSelection();
            if (sel) { sel.removeAllRanges(); sel.addRange(range); }
          }} />
        </div>
      </div>


    </div>
  );
}


function PostPage({ post, onBack, onEdit, onDelete, onAddComment, onDeleteComment }) {
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  if (!post) return null;
  const cs = CAT_STYLE[post.category] || {};
  const comments = post.comments || [];

  const submitComment = function() {
    if (!commentText.trim() || !commentName.trim()) return;
    onAddComment(post.id, {
      id: Date.now(),
      name: commentName.trim(),
      text: commentText.trim(),
      date: new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
      replyTo: replyTo ? replyTo.name : null,
    });
    setCommentText(""); setReplyTo(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F6F6F4", fontFamily: "Pretendard, -apple-system, sans-serif" }}>
      {/* 상단 바 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EAEAEA" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#555", padding: "6px 12px", borderRadius: "8px" }}>
            &larr; 목록으로
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={function() { onEdit(post); }} style={{ padding: "7px 14px", borderRadius: "8px", border: "1.5px solid #E8E8E8", background: "#fff", color: "#555", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>수정</button>
            <button onClick={function() { onDelete(post.id); onBack(); }} style={{ padding: "7px 14px", borderRadius: "8px", border: "1.5px solid #FFE0E0", background: "#FFF5F5", color: "#FF6B6B", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>삭제</button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>
        {/* 카테고리 + 날짜 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: cs.bg || "#F5F5F3", color: cs.text || "#555", border: "1px solid " + (cs.border || "#E0E0E0") }}>{post.categoryLabel || post.category}</span>
          <span style={{ fontSize: "12px", color: "#AAAAAA" }}>{post.date}</span>
          {post.tag && <span style={{ fontSize: "12px", color: "#4338CA", fontWeight: 600 }}>#{post.tag}</span>}
        </div>

        {/* 제목 */}
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111", marginBottom: "8px", lineHeight: 1.3 }}>{post.emoji} {post.title}</h1>
        <p style={{ fontSize: "13px", color: "#AAAAAA", marginBottom: "32px" }}>{post.author}</p>

        {/* editorHtml 또는 본문 - bBlocks 있으면 생략 */}
        {!(post.bBlocks && post.bBlocks.length > 0) && (
          post.editorHtml ? (
            <div style={{ fontSize: "15px", color: "#333", lineHeight: 1.9, marginBottom: "32px", wordBreak: "break-word" }}
              ref={function(el) {
                if (!el) return;
                el.innerHTML = post.editorHtml;
                el.querySelectorAll("[contenteditable]").forEach(function(node) {
                  node.removeAttribute("contenteditable");
                });
              }} />
          ) : (
            <div style={{ fontSize: "15px", color: "#333", lineHeight: 1.9, marginBottom: "32px", whiteSpace: "pre-line" }}>
              {post.body || post.summary || ""}
            </div>
          )
        )}

        {/* 이미지 */}
        {post.images && post.images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: post.images.length >= 2 ? "1fr 1fr" : "1fr", gap: "8px", marginBottom: "24px" }}>
            {post.images.map(function(img, idx) {
              return <img key={idx} src={img.src || img} alt="" style={{ width: "100%", borderRadius: "10px", objectFit: "cover", maxHeight: "300px" }} />;
            })}
          </div>
        )}

        {/* 링크 */}
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "#F5F5F3", borderRadius: "10px", textDecoration: "none", marginBottom: "24px" }}>
            <span>&#128279;</span>
            <span style={{ fontSize: "13px", color: "#4338CA", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.url}</span>
          </a>
        )}

        {/* B레터 bBlocks */}
        {post.bBlocks && post.bBlocks.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            {post.bBlocks.map(function(block, i) {
              if (block.type === "section") {
                const B_SECS = [
                  { id:"industry", label:"업계 소식", emoji:"📰", color:"#D97706" },
                  { id:"content",  label:"콘텐츠 소식", emoji:"🎬", color:"#7C3AED" },
                  { id:"trend",    label:"트렌드 소식", emoji:"📈", color:"#059669" },
                  { id:"request",  label:"제작 요청", emoji:"✏️", color:"#2563EB" },
                ];
                const sec = B_SECS.find(function(s) { return s.id === block.sectionId; }) || { label: block.sectionId, emoji: "", color: "#888" };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", margin: "28px 0 12px" }}>
                    <div style={{ flex: 1, height: "1.5px", background: "#EAEAEA" }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, padding: "5px 18px", borderRadius: "999px", border: "2px solid " + sec.color, color: sec.color, background: "#fff", whiteSpace: "nowrap" }}>
                      {sec.emoji} {sec.label}
                    </span>
                    <div style={{ flex: 1, height: "1.5px", background: "#EAEAEA" }} />
                  </div>
                );
              }
              if (block.type === "text" && block.content) {
                return (
                  <p key={i} style={{
                    fontSize: block.fontSize || "15px",
                    color: "#333", lineHeight: 1.9, marginBottom: "8px", whiteSpace: "pre-line",
                    textAlign: block.textAlign || "left",
                    fontWeight: block.bold ? 700 : 400,
                    fontStyle: block.italic ? "italic" : "normal",
                    textDecoration: block.underline ? "underline" : "none",
                  }}>{block.content}</p>
                );
              }
              if (block.type === "image") {
                return <img key={i} src={block.src} alt={block.name || ""} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px" }} />;
              }
              return null;
            })}
          </div>
        )}

        {/* 댓글 */}
        <div style={{ borderTop: "1px solid #EAEAEA", paddingTop: "32px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px" }}>댓글 {comments.length > 0 ? comments.length : ""}</p>
          {comments.length === 0 && <p style={{ fontSize: "14px", color: "#AAAAAA", marginBottom: "20px" }}>첫 댓글을 남겨보세요</p>}
          {comments.map(function(c) {
            return (
              <div key={c.id} style={{ marginBottom: "16px", paddingLeft: c.replyTo ? "20px" : "0", borderLeft: c.replyTo ? "2px solid #EAEAEA" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    {c.replyTo && <p style={{ fontSize: "11px", color: "#AAAAAA", marginBottom: "2px" }}>{c.replyTo}에게 답글</p>}
                    <p style={{ fontSize: "14px", color: "#111", marginBottom: "2px" }}>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      {"  "}{c.text}
                    </p>
                    <p style={{ fontSize: "11px", color: "#AAAAAA" }}>{c.date}</p>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={function() { setReplyTo({ id: c.id, name: c.name }); }}
                      style={{ border: "none", background: "none", fontSize: "12px", color: "#AAAAAA", cursor: "pointer" }}>답글</button>
                    <button onClick={function() { onDeleteComment(post.id, c.id); }}
                      style={{ border: "none", background: "none", fontSize: "12px", color: "#DDDDDD", cursor: "pointer" }}>삭제</button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 답글 대상 */}
          {replyTo && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#F5F5F3", borderRadius: "8px", marginBottom: "8px", fontSize: "12px", color: "#555" }}>
              <span><b>{replyTo.name}</b>에게 답글 중</span>
              <button onClick={function() { setReplyTo(null); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: "#888", marginLeft: "auto" }}>x</button>
            </div>
          )}

          {/* 댓글 입력 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
            <select value={commentName} onChange={function(e) { setCommentName(e.target.value); }}
              style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", outline: "none", background: "#fff" }}>
              <option value="" disabled={true}>이름 선택</option>
              {TEAM_MEMBERS.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
            <input value={commentText} onChange={function(e) { setCommentText(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder="댓글 입력 (Enter로 등록)"
              style={{ flex: 1, minWidth: "160px", border: "1px solid #E8E8E8", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", outline: "none" }} />
            <button onClick={submitComment}
              style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "#111", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>등록</button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── NEWS CARD ── */
function NewsCard({ post, onClick, onDelete, index }) {
  const cs = CAT_STYLE[post.category] || {};
  const initials = post.author ? post.author[0] : "?";
  const colors = ["#4338CA","#D97706","#059669","#DC2626","#7C3AED","#2563EB"];
  const avatarColor = colors[(post.author || "").charCodeAt(0) % colors.length] || "#888";

  return (
    <div onClick={onClick}
      style={{
        background: "#fff", borderRadius: "16px", padding: "20px",
        cursor: "pointer", border: "1px solid #EAEAEA",
        transition: "box-shadow 0.18s, transform 0.18s",
        animation: "fadeUp 0.35s ease both",
        animationDelay: (index * 0.05) + "s",
        display: "flex", flexDirection: "column", gap: "10px",
        position: "relative",
      }}
      onMouseEnter={function(e) { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={function(e) { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* 카테고리 + 날짜 */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "999px", background: cs.bg || "#F5F5F3", color: cs.text || "#555", border: "1px solid " + (cs.border || "#E0E0E0") }}>
          {post.categoryLabel || post.category}
        </span>
        <span style={{ fontSize: "11px", color: "#CCCCCC" }}>{post.date}</span>
      </div>

      {/* 제목 */}
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111", lineHeight: 1.4, margin: 0 }}>
        {post.emoji} {post.title}
      </h3>

      {/* 요약 */}
      <p style={{ fontSize: "13px", color: "#777", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {post.summary || post.body || ""}
      </p>

      {/* 태그 */}
      {post.tag && (
        <span style={{ fontSize: "11px", color: "#4338CA", fontWeight: 600 }}>#{post.tag}</span>
      )}

      {/* 하단 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <span style={{ fontSize: "12px", color: "#888", fontWeight: 500 }}>{post.author}</span>
        </div>
        <button
          onClick={function(e) { e.stopPropagation(); onDelete(post.id); }}
          style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 6px", borderRadius: "6px", fontSize: "13px", color: "#DDDDDD" }}
          onMouseEnter={function(e) { e.currentTarget.style.color = "#FF6B6B"; e.currentTarget.style.background = "#FFF0F0"; }}
          onMouseLeave={function(e) { e.currentTarget.style.color = "#DDDDDD"; e.currentTarget.style.background = "none"; }}
        >
          &#128465;
        </button>
      </div>
    </div>
  );
}


function PasswordGate({ onEnter }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const tryEnter = () => {
    if (pw === PASSWORD) {
      onEnter();
    } else {
      setError(true);
      setShake(true);
      setPw("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#111",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"Pretendard, -apple-system, sans-serif",
      padding:"24px",
    }}>
      <div style={{
        background:"#fff", borderRadius:"20px", padding:"40px 36px",
        width:"100%", maxWidth:"380px", textAlign:"center",
        boxShadow:"0 32px 80px rgba(0,0,0,0.4)",
        animation: shake ? "shake 0.4s ease" : "fadeUp 0.4s ease",
      }}>
        <div style={{
          width:"56px", height:"56px", background:"#111", borderRadius:"14px",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"26px", margin:"0 auto 20px",
        }}>⚡</div>
        <h1 style={{ fontSize:"20px", fontWeight:700, color:"#111", marginBottom:"6px" }}>브콘부 물류창고</h1>
        <p style={{ fontSize:"14px", color:"#AAAAAA", marginBottom:"28px" }}>팀 전용 공간이에요. 비밀번호를 입력해주세요.</p>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && tryEnter()}
          placeholder="비밀번호 입력"
          autoFocus
          style={{
            width:"100%", padding:"13px 16px", borderRadius:"10px",
            border:`1.5px solid ${error ? "#FF6B6B" : "#E8E8E8"}`,
            fontSize:"15px", outline:"none", marginBottom:"8px",
            textAlign:"center", letterSpacing:"0.2em",
            transition:"border-color 0.18s", boxSizing:"border-box",
          }}
          onFocus={e => e.target.style.borderColor="#111"}
          onBlur={e => e.target.style.borderColor=error?"#FF6B6B":"#E8E8E8"}
        />
        {error && <p style={{ fontSize:"12px", color:"#FF6B6B", marginBottom:"8px" }}>비밀번호가 틀렸어요 🙅</p>}
        <button onClick={tryEnter} style={{
          width:"100%", padding:"13px", borderRadius:"10px",
          border:"none", background:"#111", color:"#fff",
          fontSize:"14px", fontWeight:700, cursor:"pointer",
          transition:"background 0.18s", marginTop:"4px",
        }}
        onMouseEnter={e => e.currentTarget.style.background="#333"}
        onMouseLeave={e => e.currentTarget.style.background="#111"}
        >입장하기 →</button>
      </div>

    </div>
  );
}

/* ── APP ── */
export default function App() {
  const [auth, setAuth]             = useState(true); // 아티팩트 환경: 인증 없이 통과
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat]   = useState("all");
  const [search, setSearch]         = useState("");
  const [showWrite, setShowWrite]   = useState(false);
  const [showWriteMenu, setShowWriteMenu] = useState(false);
  const [writeCategory, setWriteCategory] = useState(null);
  const [editPost, setEditPost]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [postPage, setPostPage]     = useState(null);
  const [bmOnly, setBmOnly]         = useState(false);

  const handleLike = async (id) => {
    setPosts(ps => {
      const updated = ps.map(p => p.id === id ? { ...p, liked:!p.liked, likes:p.liked ? p.likes-1 : p.likes+1 } : p);
      const changed = updated.find(p => p.id === id);
      if (changed) updatePost(changed);
      return updated;
    });
  };
  const handleBookmark = async (id) => {
    setPosts(ps => {
      const updated = ps.map(p => p.id === id ? { ...p, bookmarked:!p.bookmarked } : p);
      const changed = updated.find(p => p.id === id);
      if (changed) updatePost(changed);
      return updated;
    });
  };
  const handleAdd = async (post) => {
    setPosts(ps => [post, ...ps]);
    await savePost(post);
  };
  const handleEdit = (post) => { setEditPost(post); setShowWrite(true); };
  const handleUpdate = async (updated) => {
    setPosts(ps => ps.map(p => p.id === updated.id ? updated : p));
    setEditPost(null);
    await updatePost(updated);
  };
  const handleDelete = async (id) => {
    setPosts(ps => ps.filter(p => p.id !== id));
    setDetail(null);
    setPostPage(null);
    await deletePost(id);
  };
  const handleAddComment = (postId, comment) => {
    setPosts(ps => {
      const updated = ps.map(p => p.id === postId ? { ...p, comments: [...(p.comments||[]), comment] } : p);
      const changed = updated.find(p => p.id === postId);
      if (changed) updatePost(changed);
      return updated;
    });
  };
  const handleDeleteComment = (postId, commentId) => {
    setPosts(ps => {
      const updated = ps.map(p => p.id === postId ? { ...p, comments: (p.comments||[]).filter(c => c.id !== commentId) } : p);
      const changed = updated.find(p => p.id === postId);
      if (changed) updatePost(changed);
      return updated;
    });
  };

  // keep detail in sync
  useEffect(() => {
    if (detail)   setDetail(posts.find(p => p.id === detail.id) || null);
    if (postPage) setPostPage(posts.find(p => p.id === postPage.id) || null);
  }, [posts]);

  // 앱 시작 시 Supabase에서 글 불러오기
  useEffect(() => {
    setLoading(true);
    loadPosts().then(data => {
      setPosts(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const filtered = posts.filter(p => {
    const catOk    = activeCat === "all" || p.category === activeCat;
    const searchOk = !search || p.title.includes(search) || p.summary.includes(search) || p.tag.includes(search);
    const bmOk     = !bmOnly || p.bookmarked;
    return catOk && searchOk && bmOk;
  });

  const bmCount = posts.filter(p => p.bookmarked).length;

  if (!auth) {
    return <PasswordGate onEnter={() => { setAuth(true); }} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"16px", background:"#F5F5F3", fontFamily:"Pretendard, sans-serif" }}>
        <G />
        <div style={{ fontSize:"32px" }}>🐹</div>
        <p style={{ fontSize:"15px", color:"#888", fontWeight:500 }}>글 불러오는 중...</p>
      </div>
    );
  }

  if (postPage) {
    return (
      <>
        <G />
        <PostPage
          post={postPage}
          onBack={() => setPostPage(null)}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onEdit={(p) => { setPostPage(null); handleEdit(p); }}
          onDelete={(id) => { handleDelete(id); setPostPage(null); }}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      </>
    );
  }

  if (showWrite) {
    const isBLetter = editPost?.category === "b-letter" || (!editPost && writeCategory === "b-letter");
    const FormComponent = isBLetter ? BLetterForm : WriteModal;
    return (
      <>
        <G />
        <FormComponent
          editPost={editPost}
          writeCategory={writeCategory}
          onClose={() => { setShowWrite(false); setEditPost(null); setWriteCategory(null); }}
          onSubmit={(post) => {
            if (editPost) { handleUpdate(post); } else { handleAdd(post); }
            setShowWrite(false);
            setEditPost(null);
            setWriteCategory(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <G />

      
      

      {/* HEADER */}
      <header style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(255,255,255,0.93)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid #EAEAEA",
      }}>
        <div style={{
          maxWidth:"760px", margin:"0 auto", padding:"0 24px",
          height:"62px", display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{
              width:"34px", height:"34px", background:"#111", borderRadius:"10px",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px",
            }}>⚡</div>
            <span style={{ fontSize:"17px", fontWeight:700, letterSpacing:"-0.025em", color:"#111" }}>브콘부 물류창고</span>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>

            <div style={{ position:"relative" }}
            >
              <button onClick={function(e){ e.stopPropagation(); setShowWriteMenu(function(v){return !v;}); }} style={{
                padding:"8px 16px", borderRadius:"9px", cursor:"pointer",
                border:"1.5px solid #E8E8E8", background:"#fff",
                color:"#444", fontSize:"13px", fontWeight:600,
              }}>✏️ 직접 작성 ▾</button>
              {showWriteMenu && <div style={{
                display:"flex", position:"absolute", top:"100%", right:0,
                background:"#fff", borderRadius:"12px", border:"1.5px solid #EAEAEA",
                boxShadow:"0 8px 24px rgba(0,0,0,0.1)", padding:"6px",
                flexDirection:"column", gap:"2px", minWidth:"140px", zIndex:100, marginTop:"4px",
              }}>
                {[
                  { id:"ai-trend", label:"AI 트렌드", emoji:"🤖" },
                  { id:"b-letter", label:"B레터",     emoji:"📰" },
                  { id:"source",   label:"소스 공유",  emoji:"🔧" },
                ].map(c => (
                  <button key={c.id} onClick={() => { setEditPost(null); setWriteCategory(c.id); setShowWrite(true); setShowWriteMenu(false); }} style={{
                    padding:"9px 14px", borderRadius:"8px", border:"none", background:"none",
                    fontSize:"13px", fontWeight:600, color:"#333", cursor:"pointer", textAlign:"left",
                    display:"flex", alignItems:"center", gap:"8px",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="#F5F5F5"}
                  onMouseLeave={e => e.currentTarget.style.background="none"}
                  >{c.emoji} {c.label}</button>
                ))}
              </div>}
            </div>

          </div>
        </div>
      </header>

      {/* HERO */}
      <div style={{ position:"relative", color:"#fff", textAlign:"center" }}>
        <div style={{ maxWidth:"760px", margin:"0 auto", position:"relative", overflow:"hidden", minHeight:"240px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"52px 24px 44px" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCALgAuADASIAAhEBAxEB/8QAHAABAQEBAQEBAQEAAAAAAAAAAAECAwQFBgcI/8QAGQEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/9oADAMBAAIQAxAAAAH+hq+H0IKiTTI1EWorTI1BFxV0gsmTo5yOkwt1M5y6TnK6TnDcwXWZmTWJmS5kZ1c6kpJkhETCSzTE6QxNrczZM2ipYBBCzMrbEXo52Nsw0wGWa2wtsTV1vn0k6azcSosmNZXW8ajTMr7Tm6duk502zJdMq0yNOaOjmrrOcOucQ6OcOk5w3nEznTENzEk6TENznTbmt3MK1mSSsJnrees50hCAkysqgoEgIFIsrIEiZZqyrVzcrZYorOdDE2rFrRrNk6a56jdwi8umBZJNSLfrznOnp6znk7uMO7jV7TlK7TlJerirq43OermTczk6Tkt6sazhcpllktlSS0xN4JILIATWuZOrFioKzJNs2qkNQAqSoiwmOmbMNQijNKk1JVrKoLEErSLbMNIXKXVxUoEIKr1MNd+lwXcyNMjTMNMLdSS3d56znczZjUkGsrdaxZmyIzIs6XIqBCSZ1kkpIqySxayjSWxLTOgolCKiqAomd5TEQssiUFlCUAssBTNUzViKUElUhNWhO6S9NZkNMjTMXTMXTI1caS2ErKTUg1cxNXNNSZLIs1co0yNRCyogoCKIqyUgABAIiirLDVwLEJNSIAsLKiEKKLBYLNDKoWNCWlkjUMiytxNbsmE3MxNsVdsJdawN3NrVyTTJNTOTdxpKyGLDVmgCiUIqKAEKgLmqiTTNBEQhZZUqolFolKmdZJQohYgUy1KiiUCwqCoqNQljKgLdI1LvOdRMzVkw3FlRKBZDV52zTIqagtrLUrKyNaxqWkSgoWKIkksaoqszUiTUhZSwsGoyqs2wVJdRaiwkuYrNNM0sIazSzUqTWSWWLBCqi0yqI0WAlD0TTXTGO+WfPd4qZskJakolIiiKSVZZRIoTUGsVdsaKTUqIqCKhZatmjM1kRYzSCwWSrc0s1TLVMW5LEGbJbAFsALYiqkqJVTJVzpLNM0qJdXK2wSCPUxd71JCc7kiVIhEqAgok1lClgS3NLACBahaKiWWEssqStsl1CAlBBak1KFNbILJWNxOSwAZ1KS0am6WyJnpK5zecoQqUsAlFKAggg2TfSwQBLEzZrJFC1M2jM1KlhKFzRKUysKtJQiIjUiQqKJqDSULZctSpYkWNKlrprnqNQlSxOcsJbCUiLK1vn1t1LICJnWdMEzLELZQs0oSTQiyWKjpOrfTlO2U5TrmTnaMzUSWkalpKlk1EgFzqpOklwsJqbqWyWEkSySy9NXjfXy1eLcmZKlWWLrnK6TCNSJKlFl0tvXV43XLLUiRKEoksjSK1rCutxZalSZ1m3E0kzdKyqIIsqyKiWW1Zpelxq70iyyjGOuE5y5TTA1VglpLEFjNCxkltIua0IiC9OXbr19/r+d17+j3Xz2zr5fRuY+Zz+zc5+Ln7g+Dn9BU/Pvvj4D7yPg6+4r5vr6cb063yy79fHHRn5nD7Pz/Px8yzlyQhZagAW3I0kqgJUACIICrKIsNMrethtcVnbnTWWaktkzpLdSEVCwkoVNEzNwiA1TMSKSHi9/y/V6fbx+B8T0+r9Tv8r76/b/Y/AfpOfL9HeXVzFsQAAgSXh8jt+X117cvk+Dpv9z9L+YfZxf3PH5/q8vlpOPmsMhalDNQoUBYqyyFSRYCwopc0sUZ0NTU10ypItMqkypEQWEsC2UssVNQk0MSkNSIsLc1deH28Ovb8h5vudfd6/B+l9P0eeMe3l2mellvNRBrVyskSlSoxw9Fj4X5r+g8r0/km/wBt8TXT2/T1nxeSw58SiCAqywKiKqFAIIAooKgiqlgrc1m6thNyQSwCJNZsSiVIWVLCgNXENZQallk6jjdZL5+/i9Pp8/0+Hv7de/o4dme/Tj0jrrGrjSLLrKzUAQsJUUmd5l4fP+nxx14+H6Xm5cvFWeHm0iywFliKEpJRVlJKJZYQWl1I3TnOszcNRM0s6yy7ksANFjM1moqpdbOWfRiOUsmbAqKoEWGsw6uerplKxw3v1+rp6OPTWu/Th2Tt047O2+W03cVndxqyoLFEsLEiyZW8umc6xz74w+NNXzeTM6ExN5iCFiqlpFpZYiogAGs6NIWlJNE5zpiOubNagIUWCVCWC6wN5zJAkAAXNqoqlWNq5tc9a49ePT1+rtvn1Onbls69eWzr056NXFTdxU1ck2zU1FJLFkstznWZplnN+bz9Hm8vk2wzjUkyUqKIqJZaINQEsAhZV3ZaoQQmbE0i7CiC3A6ZykrGlUkzbICyLAQtiC1qWtVEsc98em+Pbh39fo79ufdN6nUnWbNRC6xqNspdsaTVls1rOrmZ2ObpJeeOuJrjnpymvH5fV5fJ5aM801JVyLFslEBQQVIqakqJZdLc01cDUyNSDU1GpNSipM0IpMrTLolwuYrKzTNJqILFpCk0Kp5+/l69uffyen1dvd2x0TfXn4tz6u/xn6jU9WbOdXJdXFl3caOmsbudWauZeP57Wf0z4/1s1nUzrjx6ccdfN5vq/P8AP5eQ48iUSwWCoSgAKoRalhLKSySpaBQzdDVWStQkksARrKuucJbkkLCUkBbBQFys0lqeX1+Tv38vq8nq9Pb6PXh3Txfxn99/MPbz/pfzfxn7LWf6y7a8m/NPVnN4XrV5a60xvWrM6S5/lXo8n4L146f3n/PX9Wxr+ixnx9OHDpxx09fXHe8vi+b9F8jzcfHThzACllCIpaiqlCLIDKWWhdAJLC3NW3IqUSxEsqpYAkoSyJZZKFAAllIsHDvx7dfB6fN6Pb6Ppen5/qs+R/KP71OuP4b/AGv3eqNJcwUxdQltqU3EpPkfxL/QXG3/ADv/AGb9B2xZx3w49OXPXLG/pduHffHMsw+Hy9fl8fnSzIqgylLAKLUoLYytzMNSg0AliJZQChS2szWIWWxLIFJKgUlQAllCCqSc956dfmdc33er09fLvefp+34nqT7O/D69467x0sKoLJSiywJUucWc88OXS4kms+f0co+r0XrymdzLxfN+/Oefzl+t8jycrJeUAWWoClWSzM1rNq5qItrM1m1CIsksKqBYKkqgIDQzSJSVc0BAKjRKgEZ0u/Bj08Pf7M2umem+GtZ9/r+R1r7Xb4ve5+11+P2t+o8XTo9Lhzr1TyTm9c8ecPXw4Zl6YmM63nGJrfXxfW1n3JPTwuM65a0EnzfpcfO+A1PncpSAsqKpFqIsIArN1LAsIlSWjUShLmLc2LCoqJSggAAASBaShUCXV5eb08PZ7edk6t3N3m2NTfXgs9WeRrPo8/HXp9/Lz+mPX28ms+b1PKT03zWXvjjyzfT5uPOXt+g+T36Y9c+P7tX6nbweSX7WPieXi+35Pmd/Nyo83nFILBFqWLCUKWLBACyoAIKgIEtiUJWS3NKloIAAAShZbIJQXHk9nz/X6+2efr7dfNeuN5XOtRYQSr5+/K7np8/WOjCY3rkj0Z4Q3zu83n6cNz0Y43Wc+b2am77fJ9DLtn0553web2+PxeUMcxKqJLAKFiWjUk1BLIWIqWgIAISoLKEKCKqWwASolUiljSs2qzdNMNzTHzvp+P0d/D31x69fo3we5rnj2czhOsOPn9pfj4+n53o8fT0905ejpbwxdE56qypq5uenOm89Kxomb9D5/va9uHHlp4Pd4vJwDlwSyAgArUiyUqpZSwiKRKJaXKWggIRaAqECWwFKW1cXdMtVcrvt0xv6Ho9F8fs6Xu+N5Pr/ABdTUrtyzaWef0M78/WcuXbs5XHTpeNl6c2UuudqySyososazpNYo3qQuSt/Q8Hvjpx1y5b35e/n8fCjnwEyAFolSwIq0ogiKJRFLcUzJRUqoWCBQAFFNXVmlbu1zrWrcfI+030+Z7PR5vRvXTy+Le/b5ed3Ojk7c+7k1Ok5o6OaMzWcdKSWywLKWEssKlFlVZDSEtzTr6/H6I7cnPGt4Tw+YOfMJABKtzYoolFirCQQolIFRLFIFWAACoqirqVdbz0a1qW27zq6LbrOrK1z3dXz8ffbfk8/r8d9Pl5906PHz+hz28Tpz3AqCgASpYSljUUEpYgoUvXjqO/Nnlemjw+ODOQgAAKssJQqI1myllLEUWIGVLUDNJSrJoooFq6xuXXTnq66WW63c23dzVqJdXOtW3Pns7+LzfI6Z+18ry53N+v59t+7z8vfXpg3MtZoAKoQUCWKAAKlS1Vyz04Z7Dx+ICwllCVCpQQqIKJQIKiqRSWQNCiKllBKRS1QtI3rGrrprnq63rntdSXVVF34e3wOmff5vmOmdyN5CoSTp9D5Xonb6CXp6WdTeYqWUQoKJUlLSLTF3Tnak1zvnl36uPo8flDjxllosAlTUqikogyWCpaiyAFjSWiUpSWKiLIKolKlqs01rnV665aXpvjq3peZenzu/wAHtOnkw7Y2wjTA3MWTTMs104fQdvXfJ036/Qmt5zNwi2s3VjFxjOe1+fyzPrX8/wApj9F1+D9u9d448ta9PHjmnXPt4Y6al83klJIqBEsJQFgWAAAqosAguzlaqFJSqFis2WEo0ELEk0i3VxI3Pl/L6v0/i+I6Tvz5NTpMWqyNMDbEOkzDf0/mfb6dvPek36L15eLE+i+DmcP0nD4JPoebzXGNM7ZzOkrE3Je/2fn+/r6OeOvO9sejF5T2dPP6fH45ZcwsqgQQSVYKlAFAsolqWILI3rmWWW5iyUCkWoKJQoNEqZh5a6+by/K7TtwOjSKtyTUiqgqCoFlr2/W8HX0+r1Xy269H5/7Hw/NyXOs8EpIsaawjpM2xFuvr+vx/R9Ppz29PWa+P831e7wcemsuHK2IqKCABAsKAUSwSwVCpRcjSBSxKllSrCAAoIAWKfF+1xs/Mz6nzPVINgAgqJLCwBVnfj6tdPXeOvZ6+rlObzedfN4YGVgoIsUJJqbu/f7vBfZ7f0/p+H7+d8PbO/meKTTOYIWCwKNAJLMrRQsKqFIsJYyqCwoiLZK0SrCAgCUAoIA4fnP1Pwu88A9GaiWwgFSwqVFRW8LfTrx3Xb0ccXOCxzCxZYltjM62OL0ajyXv519d8no6ej2+zt24FOPESQIAWUqKsBKCXNo0CpQAiok1Iiky1KSoAiwpSAAsKsqak1LHz/o+fc/MunP05LAKC2UkWCkAiwtIkqUWNLvG8X7nbl7PPeOujLDfks8nye/v7T5P0Po9ebfSOegiwpUgollq3NNRSSyWKFl0igBKJQTUgDCoiwsEEFlBCoa0ixSzOfD49PsfN5NTy4+v00+A9fl6SCot0IJTKioACLSAldJcfQv0eLt0jjb4fdzr5Ofqa1OPo3rLNJbACLLBVrNqoCoWoikKKWUlsKQEKg1IixIK0ksgJKlqKIqoqJUioEt0zbAI4/M+znT8xn9N5ek+Bff5+jgOkAWABYiwlPo+nk8Hv9Pq53OqwhQsEsKEhFqF1ACSoKloKSoIikq2UXKtSF0yglBEWJag0NEsiKhY1KyNQKgACJUiwooSqiicPRk+J4f1HLb87r9E1Pzu/0Gsvga+9Y+Hv7RPk9PpF4d0xahbCQsFLCJbKsk1FFJSpSEWJWjJojebcCTUzaqaJNSICoLLKKIsCWNxNNQVLlAAhYpQCCCwiyUsSlUhSFIslBEolsCQ0zVoSUWUQqiLLFzSWhCiwAiVQtxI1cjbBUpM2lu+V1O94U1zsBItzSoqgy1IqKDKwpNRQkqWkAIAAudQCAqUpYLAiyAWyxE0JQsAAUgKNQJQiAWKqISxbZS5ohUlQASwopKliiKJrWq5zpiSFUWzKAIWQtl1RMrc2xUAgCoqyiLILBNLYCKkFJNQAWWhAyjQFlpKEIIrSVApKliWAAAAAFikqItWVSEFhNIpCFlVBM3I1JQWgWpYBAsCUABZRLAAACpCpqoIWCkpEi2DSWiQpUiliIUpYgKLIAAAAAoqS2IUKtkskqNKEgyWVSDAALZaLAhbZUCAAAUirc2QABKTNoKqSljUJbmtZqoqJSAgQrJbqLNQoIkogKlUEKiAAqAollNsNLkhQAiklSUDCKqWFKpAJbZbAgQqCwKgWCoKlCDTKysjSVakKiqkNFggBEqWTQk1KUBCoFlW1TLUkijNCVpc1EsCWCpKqaJZYSwtysCWor//EAC8QAAEEAAQFBAICAQUAAAAAAAEAAgMRBBASUBMgITBABTEyYBQiBkEjFTNwgJD/2gAIAQEAAQUC2C+S/ArxidpvO1avK1e5DYLVq1atWrVq1eVq99tX2bytXle3nz7Vq1atXyX2LV8p+iWrVq1edq1atWr+nWr7l+KezatX/wBRrVq/+Qb+p19YpUq+unc6VKlXdryTu52U+WN9tWr79bWftZ+l34J8SvCHeDHFcB6MbgqrwNJQieU5hb4Z8evLa3UmRtBtXkQCnQAr8dy4blocuG5cNy4b1w3rhvXDeuG5cN6ETym4dBgCtWvdOiaVLHoO0HymvQetStWr7xKJVrUrWpGiJWBuz2r8l3UaqQkT8a1ik9SUfqRUOMa9McCO44qbEBql9QKZ6ioscx6bLqWtPNnfDyy9H4iWk4lxamR2o43BYXiBMvtlYnWp43FPjTgrIWExDkyTVvt82JCxDSXBigw5eYcGE2FrUB3aTomlTYJrlisE6NOZSiYQ/Ddfocvxey1FAFBGGoIeC9ocMVggU2Ah0Df8O8Wj2XlAWo2pqCHglFSRqMU1/R++1mfYpjU1BDIIeAUcpx026vCcqTQhkPEOUg/T6AU3IIIIeKUcqVbXfgn2zCGQyHiS/LfneyGQyHjz++/SeyCCHIPDOU2/y+yCCCGQ7g7Byn3+VBMQzCHhlHKbbKVeFKgo/cZ4vGQ4QD1yEz4eePERdgcksjYmf65gVg/UcNjHZvya0ObIws2u1fhS5RoILHYkYTD43FPxU3p2LwTPT/Rsc2L1HufyHHPPqGJxHp59OhmfBP6Zi/zMLk/KJPaHCWIs32Vf2xNy/k8+nDqNvEf6P6ffqFKlSpUqVKlXJ/I8A93qE8fCkX8PP+BFFFRfFHqpo9J3uT2TUxNXquCbiWYrByQyYLAzzy4DCiCPuY/CtxMXqOBmw08GEllk9FwQwkJRRyi+ORUnz3qX2TU0prkFwmuTGNCHedG1yELAvZEolFFRfFFBYn571J8U3Jrkxya5DwSUTkU5MFDOdhcHMczen/EoK0EHJrkxyBV90olXlaKZ1krlpSQt07wfYjkBQKY9B6D0HoO7NrUnOV8hWE6vzJ5MRF03h45gUHIOQcg9CZccIShcULihcVa1rWpXyWiUSsK2o7Vp7k0VyOPR1at3d2AtStOPSyCxyc5XZZ7Aq1atWrVq0XK9RDtLTKmuLi1WrRcnTAKSWxvD+4UHLVablatalatWi5OehbjA3SnmxxKLJguJ0diF+QadI4pu9P8AbKu05Rq1atWrVrUi7Kk00ta1JzA5CN2prVHCwrhMXCYpum9O9imuXuqVc9pxTSOzXOFD7ZTfHeT7Se6Y+l0KpEcr7C4hRJKBIXEKYSUOweaH4olP6t3p46llrQ5Alqa68i1VnVp0aLVpTY1p78WZX97mGOKZCuG2pmaSqVKlSLUWIOV5dF0XRdEazvnGY5B7t9jujugjkaUCE3PEn9RzkKq8dvuETkfbb6VZPgkBbO8CHEgo4savygppteV+c1BFXt4HO+Bry+EBEKl15L8tqCKveCwFGIJ0dLQtC0FaVp8sHcB3SLRjVHMttObXlX024d1xoOxARxIUslnW5RTFakR5JTd6kk0J2JsPNnMdCx2ry2bxLLpX5Skn1jmYdJHsPHKtAbu91CaTUezE/r4xNJzlG3bx2J5KRnJR69qJup3Tu1nqaqyOTnoklNFnddQCe/pK83lavsRdGLUgb7BkYC6ZgH5bU/FlPxD3LiOrCtaXlyLkSryDbLG1uepcQLihTydOI5X3GfDO0Xtamva4AhPnY1PxTinTPdz4f/cKObW9IyCNytTvXEK1Faj3R8q6Vl/c8hBJs9vCjKlSaLMrusTdI3FzqT5RUh69/Ctt5cFa6Kur/n3MN0j6Lomx2HkRMgDnu3Ap0tKaTUuvgw9I85HVF3Y/jDFqRw6ibpUn7TsbQ3A+2Jb18GMWbzCmk1Hus9o5SxQTaw74gDVuT2BynioeBDleT3U3ut+R6ELCHrLJSG6Si2vFO77XaVqBVovpE332m2qJ5CALzuh9sS2j5VFUVpK0FcIoQlOjIziP7MArdsS2x/fkN944wRwgtAWkLSEQp35wMtNFbvL1a8ft5DRahvlldSebMUQI4ITWBu62FqC1hTvQaXJza8iGPq3OWQtRmcg8uLYgQ1tbvNa/daXrhOKhjpSRalJHp8Vo1EQKNlDNzA5cJqEYCG80FQ5HM1KaGloKIrwYo9abBRAofRiLWgKaG1+MU+Mt7scWpfjqOPT9NfHqUsNLSVpK4ZXDK4RXAK/HK/HX46/GX46YzT9QLbXDC0BaQtIVKvPrtV9SvkvmvM/W7V/YaVf+oX//xAAmEQACAgEDBQEAAgMAAAAAAAAAAQIREAMSQCAhMDFQE0FgInCA/9oACAEDAQE/AeqvNebxZflsvNll+Wyyzcbi8P4dl4ebzZZfLsvF5sbxZuxfXZfKvFlll9F/JsvF/wBVf+hr4tFFeCivhQhZsNo4m02m02G02igbRwsnCvg6RRQ+tYo1n8HSGyx9aYpCZq+/g6aHl+BM1UPnr2R7eV9x8+Pvzz98S/Hprv5VifvpvlaQ8WX4VjUXJXVpDxISxZZZeGIWGSjztL3lrxLDxLm6fseX1oSw+xeGPmR9n8dFG2zYzYzbRWUT6Gh8tEe6GisxdEZEpUN30vuKB+ZsNR1zdJ4oooojZKyiulMvGp75VFFGnKjei08oi0SaH4Imr75MdOxwKNuYsUy8WX4Uar5FEZUKR2Y4mw2m0oXl1PfM3CaOxSKxRXi/gk+/GXXZuFITvyz7IfLbN3Rpy8iRqyvk2WORfTprq3o/Q/UhK8ynXKsvrgWTnR+p+rN7LeYdhEnQ3b594XcjHsJGrm8oihIm+XfXpq2bR/4olK+qPsSGiXv4UXR+5LU3C6461Eta/m1/Z741f8Z//8QAIxEAAgIABgMBAQEAAAAAAAAAAAECEQMQEiAwQBMhMVAycP/aAAgBAgEBPwHbZZZe6y+Gyy+G+tZZZeVl9B9W+eiuG8rLyssssssoovdY8rL6r4L3X+hf499C+a99l8FFcbyv8u86K4r3UV+iu1XAotmhlZVu0lPpXz2RhYlWVHjR4keJHiPGjxo05UmTjX4OGyih8FDiTf4OGKXob4GWNmLsXSrfezDXLNC410qyRH1vsvbJfgQXvmZJZPu4f3dXDP7lWVdvDFlGLZKDW1ZKDZKNZzjlfdw88JE2PZRRExVnROG+sn1cL+s44rRKblnQkVkpaSeJexokvfA+rhv2LJbKKKykyxFWaDQPBTMWDhwUVxvgj9IZrJZWNl7ILJ5YqtD7aIMT2XwRLLHIxMTnvlRAQmWXlZe1LNkkT+9tQbPCyMGjTlZZZZZfBIxPvLfJh4eoWAhQoSNJQ4jgUUUUVwSMT72YTcRY7PJZFikaiyx8jJv32qy1CxBTNRZZZe+85/B9xCiVkny4j7dEYiW1cVjZiMvosXBFbl722ajUaxe85T5K3sW5RsUD5uiihss1DeVFEcpyH7E+os0hQrgqyESSJbkJDJu+ymR9lbbyh9Eyb3UL6Im/Q/vaw3w6xvZqNRqLFiUTxr7VmHyyG8lZqoc99dNI9Hw1l3urY2SneyT7t5KYpikXtbHMcy+jfPe2zWazyGs1lj30VzVvv/Ir/Grgr8W+3//EADIQAAECAwQIBQMFAAAAAAAAAAEAIQIRYAMgMDEQEiIyQEFRYRNQcHGBM4CgFFORkqH/2gAIAQEABj8C/OvYLJOOByWSehutx9GYWS3St0rdK3St0rdK3St0rdKyktq92pyRTUG50bKfgWTrNNRLJwU+IZBPRE7j8BkmU06C7UNlwbrZGg/zTcwpI04DTh9OTTgpwU4PSEG3ilNaurF4X7iEdkZwnFMUZkAvqH+qMNhaTIvEGhIrWLkjaWh+OilGIfEdagmLKNtUdcX9NF9KDMdVsQw+Jq5SQtLKIwkHkoLRtY7wHK89Bw2Mt59AHVAxT1IXnim2nsRf4iNFsO4wGoF4ZkZLV1Yj8KUMJEs5shimE59UYDDFEORkhAIIn7KXM54JoFwssdwmGF8U4NUOtoUsBfMs6ViOBrClH0su91qSkgL+alSczmu6fS+jOmXiUyslkhL7SWCdZYDUjlTc4SpahTsmpvKXsm9PHTLKnWK3lI/YtI8TOg8mTcBvCi/fDeIJogVulbIXT2Tkra89bGF5iuS6lbIl3Tm+JXZlbPmjHgBdkE+ITd1B80LPkLsXvwE0TJaxoV7hOMNDaCOVC+12XLgifNG4XvjC5KmZHPQwU4qadMPS56BbyB/OWuPT7fjT/wD/xAApEAADAAEEAgICAgMAAwAAAAAAAREQICEwMUBBUWFQcYGRodHxscHh/9oACAEBAAE/IeW6LijyyjZSlG8XBso3g2N8Lw0NE0IIRdTKUpcUpS4LijwhC0MohcVLw0pSlypcjFyUpSjZR80IQhOBspSlE8XLWi4WCeh4RcUpS5o3mlKUpSjZSlKPAz31wN5KUpS4Rdb0wmGTU8sonoWXrWhjEUpSl0FKUpSlwuW4UpSl00uqlKPKei+BS4vCS0QhNCYsNjHppS62KUuFKUpSlyXWg80b1IpS8r0TQyaVhD4kUpdVLqBS6wKUpSlws0e+poaHqpS6KUomXwL4UJw9zcUo2UpcE8UpR6KN4bKJ6LxKLIuVxTDXEvAmpYpS5pS6EXFKUuW8sQnmjKPgmYTQuNsfizkpc0pSlKXFKUubhYbG80pcrXCE50y4ZPEWuEzfHbG+FeNcXWuRLRNVKXNKXIxSlLzUbKLzrzQnLNEFpY+FF0UbKIpRsuFy3Q3i4XDBcl0PkmV4NwpS8KfJeWEJo96bquF4zQ0PQnItD0rhbGInjMg8Xiei6YTXMHtNhMz8CicVLpmhsuJwsmEsvC5mhMNcu3BSiZdF10b5FoDyfClwJ4XUY83VMPwlrfIkThzQiCxPEpRMbGG/IhBCaGUpdE0rLwhaWPUnwNDxcLwBeCEIQhNCEJiEysQmXqos3hQiaHpTQhanqhNbzBohNDxSiZdLepCxcJ63j1iaFiYa1opc0eqUghazFpubwQmXiE0LRCZWGb6EiYuVhkITStD4aUYutDwnrMgkTXNUIQYaINZhORMPCEUep6k3c+t/Y5jB+xNZhM0uuFV3/oSVbB/sePeuaUUviKXMGhhrno2OiJopRbdD3P8A24JPRDKdeTKTWzEtvoIe7/g/5A//AIh/wD/kZiP+Af8AEwDiWPkf0S9lUQL+g5sfRF26HbDvyF98dKXF4bi4WFml1IPDELivF1uxHrEgv1Nz7FuE+F6IYf3EF9xFojYkvq+W8s1XNEy4Y3DIQWHwzStRTv2JSpffDU9gm0VKrKJPlUrWe3Em0pF/6nx79iEsf2fse88+DWKXNKPiWp4QtJDWwllvB+xNm7Gxa+iyjhbzpQDMtk42c2KoTK2OW+FP2vYQaTd2HIv8n3xLP8Z98l0tDXE3yvFes1pJ6PpGBQ2Eox1SFL0Lkddo70faipGw3YPiIpuulp68J+HONcEHiE1boPijDVQg2GzBC43oYUiaKbShoTNvS9+KXK8LQ/ATGgyHhPT2jsRcT0NC0LkILbhuSYEk+8Xx4QnDRsvjJEGGphoH3OoUWYJjcK62hBRKbmyOSciR6EtDy9PvEy8QgzORMWHmqZMQTwQhMuE83iYgkWkq8Lxlqel6EUeJhCwx6VrTKN4esTYQ2ZhCEUTLrZcvDPWG1sSyNeGtbGPD0Ieq4N8sZBjDti0CwWC0XheXhmxRSlw+NMepPC0sfO+HfFysvAsVgsEIRcLRcLEy8PDZRFX58hMXgPwJqYrvOokJCzYmLF0rRCEH3l381cPgpRvTMrM4+gXedcEITDzSlFpQhMMaz7BeG+K8k5lqQ2wxueKEQf1FopdC1vvQ03Q67Pf4ZZWRoebomqaDDYEJP5/Qvn6puxJR8+jf+BYf/Ew8rC1Ehu024NCrn+x36LHsb4ZsG5GJQ/keSVHvhXkQmtEDDeicvcXZ2yJpb6L9jbLr27R8DG+RJuj1Jt1/A9nZGTEIQSEs9YnJ/wBncbWu/R0ZshgPZsKewrddsPFs6siBAfaO1fwN4Lh8l1EH3N4hFI28O9Qe7Y9LsHIzbRfk6brfO9MEIQZAiaoYx3S6YtyrXr/xH7GH3GEwRI6Pa+vm0pdd0vSuWXZ3GEorbCdfAzTJ2gpJjJ/AF4lGJaJlaf1sPgesgBmI137N0PSL2N8vDrgzow+z9BWv35eYPzH4NGLMy3ccjiZNfsbeyR4iZ9tU1tHUzHFTRJJtmGGHqvHQ3I2fXCE53h88J4rwgm+CZuYaDFwuRobxUGINOhK0usz0jfYQWUPp8yy8Tmo/CYtMhtEGJY6iRIJ8D0PMbLeDbEPls2LYNEx9jrvdFkk+hN/981LpfFS6pxrR1h4WjeEt8JzIweiiwiEJlspA4wsNlKNsQ49JE2PWNyI/eGIvtRP75aUrLyvkfF/OJhWFMtCEQxsx/cQe4vlH/Y0+x/OQ+j9htg95aUbyJjtpG98JPR2ZNvgxi1u6GrMXK9C4YTU8365bppcWphaEMIfuU7CI+3HQNPtrcMOUfeJ0/JyHz8lD42RDWwqSIRItI6ambMH5jzdM8F6D3GoJ4WhFKLUQZTCxCerbMcCQIS228MR6B8lCRVRC7FWmx37fwI23fN/jgpfFG9xbjwWpDpaZu3ELyLC9oxlYq7Fb12fsN2bxYIbHt8k+x/wbS02P9yW6CUvw85Zmh+JMbkiJNh6a5cCWIexNM9aGzsghD3laW2THyLkvAuVlwyaZzQSjYyLuWT0KFR1wzcgx9DE8pgryHoivYsNbiWUjsIghZL44JwMXFOKEITEi3J7w2oNd4TV8D/dC17JT3I/QhDY3FvciJ36Pa0bCalhiEth49mxF2G9zcmNSBeAua4XHCCWYSroSEu6Pqa/2fADvoGRnkQ+0T3L1sxWXCCYFYURcGy6j0HkWBtijezL7x74F4jyuJaIJG5e/8D6dP7HegyhUJiOw5SlKUoljZvoTKUrKXF1oRdhLFG8j7YG9xsJ4D8daUJCwTYcbEXzbUsE2+iUqaHBQhgn8iFExspSj6H4KLlHcbbI34F1XROCcSQlgSEiEEjv7Fxui97KJqmwlWi+JE9FKXBspSj8cwwxcrXMTK8tYSELCxCC/weijLdDD22GptuP5IfxGFP0N0QfkLA3sNiFyPgXjIQgtKxMrCdiHzoNTgTVnsc+habDNK+JT5BPc9eey6FqgkLSXeqHrG7CDjJobg5D+R/eEb9mK9E1XwYNsdvwM41ha6XCZSaiHIuso8PB/BN9lq8dIbG9a8D8KZhMrShCFha6xnaBsupGuw+HLNcIesO2xJF0T8QmIWFlYsN4XFF3JfIKXE5YQSHhMR2KvY9zxmLn34yZS4RYM6s2xj1c3NKUo5fp7L14MIJfJL0R/BXwJfJNt4kvkvv0fYvakG+xtIh1gJvwJRJfj0yiYmJlH2GLuMallLkpSlGUpUF12K1139+hT2I0oJE3hHJMrPoEfXlHX+xH2grDS/Y/u2l0j0pDBo3KMkiGZfh3SkIReaj0ITGi7Y/kR9qPcjd2/8jrsuilKUuHj+xIWz2F0Rcri+C8/sKpf7FBWPoSpJ/dSS/6dhtt175hIUr43s+ow2Ps3XQuz4IGLQtFxeOaULxKUcdig+0v2ynsuilKUpS43hKWdDc/gXp7FdvXtDLtWb4e627Olpg1h/wBIt6Mbib8FkeusMnI/AT8VPcb2Mq2+i6LrXybpafpZQSyOLYfwz1soMmUy4uFpfbosKIhya+D2EYuuN8l5nqunoJeNCU2G6747pXZSkKUohw43si8iG2Po2NZtB9J9CthunQja5VxTEJheJdzcHdDfwleiLuUbfY2t1ew9bz/GFRtvyIDuB47GAJc3v8Ki7D3xTTBFu0650J4X4E7ezc0tHyzqLob7IzRHaJzPw7onAtdfYqF13gc+0H8xH7npDbvMsYG5YPmqM6oCW23CvIWLzXO515g/UL4j6j6xN9DIt3PYjZLchdGhP6wvBXhLReKEHjfB7NyLjmOsRxJPqPrPoEL0JjUH30R/AuSCc8JoQtC86WEG13mRc1JoklhMvXYdvm8kbfR1BPHhPGpdMO2Nfs+9G3uNyQzvqmJyLK7HOhIsudsKGQvBPXCxeWlLrXFeB8TN/sR/bE/2z3mMJXrB+NzNK4tiYhuzQwvWEdgj6sMkXhrlpfCmlpPtH1I+hEWVdiLYb/sb3xS8yQ9TR3GIQnCvzSk3F8YhNlg7nkW7JhL4LviUup/gYKUdcPoPrEKNGmiBOKxBKQYXNCE43j3h6b+JjJNxfEfWfUfQJPgSfBCcr8ExIg0PF0IyD4ZhcNLn3yX8VcGUuT0k0RCrifkwS/BLw0URdaKXC0TXMrxnxQnjrjnBBYOvAvjPC/IQSw2PS+Kk55+ZvMxYf4F4XgsXOs7D5b+KX5m+NSl0opdd0svlQazRb6pi+Y/HpcJaqXFx75UbDg8QXmPyITS8opfCn4p8lKJ8r0rN0LDXBDrE8yeFdFLquV4ixS6Vhj45ppSn/9oADAMBAAIAAwAAABD+j89Y0x37AS8xYJPJPoRSaWazd5hV73MUw4CIwDQXb00MQEgaBOtldCCjPYDPsJnn1m+o7YokPY029YD6OikMwm29bfxdXQZwD2MDcxzMeutLgnQ1zo9TPMDmc3ECHRbw1KnE7+F//cYoeuuZhgubLK0b7+17jQ7H2UbLb4/J1XHknUUnmuYiIRBdfvSC4iB9gbxJyM8dMIS4GMcNtP1KeXK8TIfeeRDKPlUPfs/1U6dYA0iFj1nEJM3/ACu07ai96YeClpxT+iuxnUgg0ueh9d7ynXnlp7dR/OH1Cy7T19n7dbilmLFVvLCu2kq/DIfSBven7BtdmpBiv7T/AGxGoMDG1yr4/ijiwNVnKx1smW2rTXhCfyWaaeWTBt8vZzx3DS6lVXm3O5X359qf/wBFfHRUt7J/6UnuVfMwGtKqNyGyku1Mu7BzSR3PGeZ01hE6e/VhSqAeUXRHkxNZXeh2elJcuGrKkKRWXJN4owJLq86OtMn9VWIFgqEg5VviJZRJ/wAMyYVrxFI0S8p+yHzmTBbFjzJOifJ9nPGm7CJ5ME3cArIRLEdkTKDR92SvZWq/s5f/APonsAXtH+Yx3sjHp7/iL20zTGCjyoXg1d6mH96RrTrHYSr1yq7pVXMb/hUMeQffRDLU8Z1wwR50RLX9n5Vo4BIDQ1TJmpWmJAlZTHKsl6aXaXkd0i5Q9bQ3YZfnXSKn5eOxUG9ZXo5WFFxVwFXUv7WWIcySc3OMMnb6R7+7zfwUqRutb8g5r42f6kWXIEFXL55Nc73klf2gJQ624TDDjo+h9nJ/ikK1Xy4DgRm0r9sgtdgEjCLSFSQW+SR/Sd/MysO8jjaLpl5MJ1MwwWYohAWL5eWrSylLF6hMBCgFSbcl5O9kxeP9h/34I6xFd08ED/cirsNiAVMvu/7T0MIQV6+MVLQrg1T2dfvdv89nqcEcaNHpgoE/VUbwd2VsA9VwkkKzR+6ycVv/AKFfF/ufub6sgri93DYqDcevW3KwQ4EsOs3L8lNnTjdoXvUTzO6Cz8rry1WTp1RtpbDSPkXxTvIX8sJEcBxuJl1HYNNGtj6X/wC+/v4/DZktVltTciPps6UFNkH0jDtUbC4lC0bBOrpQvk6g25v7Wq6CHJwI+8gS3iZqpMKE0ZYQue4GBwQk6zy4WnGjdV8ppO4M8DrXtlHrOmfKxPi4rGNVGV/e5kJ7ejMiEc6bWD9dlGzf5GbiT4Kt4YXqUPirrdIRfHEn/wCOQ/YCuJYBfuCgMHK1BITdkXcnhGovhV9J126JPa9STfv/APW/NOl8cO8Zu6+P8x2Y62OK0BZ5jqKn0X0lhRXrynnKHv337z/0dWkbreIGbGHFEqTQV1aqqOZRa+Y4Z2kbJ7z9rd/gKmYq4/O4/wBEK9zCzTAk3w0uV89G14tZEcy9zBm7Hg3T/Hs1+0XhZv4z/sglCenRZ5ZviI6wwCDepDMvzZt1rNy2Bn9hSX/5vut/3j/bxb12QvD1TMR04Db/AO55h1FUJ/6kGstq235/jRpX/wDPO2b8anbtUHTjx+KVwMdkHVuHYODFESZHxIe4GY3/APnVW6G3DbuOhSkf/wDL37X4XPPIlXKJv1sHvoxCZrOZk/731SN4hEOxbrnJbBHf/pvWhkvDgzlDRsC6skK3M4+ui9Bv/wDu3hF9u2oaxDPNa/JL/N9DUCzYECiYfVw36wYS7pNfz12XMl3k0yjA3vXe/DR+/DmYWCjD4CJkCYL+jl3I33roug/ReGF+sEXTmeWUVPdlz0vL3ac8iaz6/wDw4djDcFlhbCRDiSA/HZh7PFjpcI4BkOcPyJPnD5BnfyBwUylxR3FkST3zuVWCsgbjfEpdJOWsUggWXQHxHux69dbFzr5kR1xFo1y3xNaIjjBKhP3u9+PB5xhIJkJ3dERJe41/WDS8tFhQVRwW67/FA6+tG4Da7n+XRSuGii6Llpn0Hnm//NQ3lyK/L3foiOEp4S8BHZZNN/8A/wCHFwu49Nfh95v1D5a3/Hapf+9sbj28b8dE3kgaybzf/f8A/wD1e26HxCk4/wAJUjVwNf8A/wCDq/7k40lFp1KdPrSpXAm/SHc/9Scu9fwq4Zu7OhR+jf8A3HYUP7rO+8pIFfMzz8tVTIG6YOu+h2K6S2p83pD/xAAfEQADAQEBAQEBAQEBAAAAAAAAAREQICEwMUFRQHH/2gAIAQMBAT8QhCEITEIQSIRHh4Qaxsbgw2XF0vpS9TEJngZbuLRBohCEJwxvFHjC/wBEsbQw2UTzweUpSjZRMvFG9vHg5MqEVCg3MIVQYo3il1eGLKXhrlFKX5lwmy/6SihRQNGN08FKUu0IN9UpT9+FL0sXCCDDbGyjFKNlKUvyvznayjZRPS4o3l+FKNlKNsT6WPb8mh8Ufcyl5eMayi6h+Y+KUROTRNo+qXuCyEIQnT4/pCEEi63jGiEJ2+liH/0tl175l4nayTi/SY8JieMYx/BHgjwZ5SmWNkJEZ6VnpGJNl/4Uh/uT4shCCIMbxkITpsTyimrIX4MpJ62ok/gHD84i2fCjQyMS4eTmE/o98Eo0go/C8ImCSYl/h/Dq8TmEHj28XGTUx2meI3GHxSjUPKl8qX4qDg3xCEGtpcRCExsYgysXC8FUt6uUJ3MfxePhOFQlDQNixoaITIJEFUK0P3CfZd0vCIQSEC/MpS40NDWoQ14JO15fdxdZRCEspShfusTyDQ0MpRj+H7cXFQy8UuP3HjFkGNn6JEy68Y0QlbxMTH6MZULCG2jU2DRBYsaJk14xZceEUet6RjDqJwQg8DLYjQvggl4e2MtyZMRBLul7aEum/A8qSLayjZSUSigkE/D06NJoSMTy/JasfM4YvRoVnD8KNlKJCZv/AAaMURMSdzqlXdL08Rj9oaxrCb8D/wAxf5j/ALZSmJ6P4Rn5iIf4JzPnPk3uWAwyFAh+CEGN6TIfh7DmNhT+iGg3cTFkH/xNM9EL9KIaow8H/jJGGywkWDdJ6RPR+iP9EWTui7TxrUiDH/gTCCvDPYX5BqkGjP7czJ5Rso2WsTP0LK4YxYh4nBO6tXEIJeUhpEUocEdPRiZ/IVCZ+h0UbGybCHk9iayNi1iGiFKLJixEEsM/Alv0gJH/AIJIFDGZSlHk2EIIe+Pixa/0SF0hCQkLwUE2hNRpHo/wGYJsNEEiE5sFBeKUq5gvRdLSFiGWDnD0IQayEIIaZGRkIJNj+TG9LxCE5vCyahCExMsxdZRujW4PFxeIMlKITF8ITlcNCyi0KKUbKe1KRkZ6VIYNEMRlxaRDddHi+F6WPHtGKLyx4KmIUbXwYNg2Yh4GTYtBnoUeTF2sbmouyjy7RFEGJR+gcNfBqYhRCeniQHtwfznEFxeGilFeIe/un4iHQsfwbxIkKLQxImqMb0iD5hRqczlrFkxJD8/Br0TpDwkGofy5/wCiE2mflYxC119pbKTIQmTmE17SjykKvzGQX4Ieei9U87mXpZCcIo3C4ydoa2CWNYvjNnF1fJkIQeXPzUia2MgkeHh5zSlmKXUxsXzXKEHFiEQeMv8APrJ0hF+tLsJ08mMX/PPncfLXwfC+aH/23pcXpZep8YTiEJq+K4gvC8JdrhspS93WLIT43hi2fC8whMT4YuV3BogyYsfos//EAB8RAAMBAQEBAQEBAQEAAAAAAAABERAhMSBBUTBhcf/aAAgBAgEBPxCjZSsTZW3gTGzhV8jGUbxn6L6EIQ8LiiYhMbP0pS5S/Df4JZRDc+QTFg2hs6IpBZSi+EJk1CHv6WMT2if9LiG8J4y/FhcgzhNPPikIPhAx4fosGFgx0LClKJlIQ1Lo2WF10QhvEvh5CEPBi/EywfwRYR8dynTvw6NE+FlE6TblKUqG98GxPGIaEhKkGPLpvEy/Ezuz5hdg6JCJSExoQxfKgo2XEXJsPCjxClKURMTE8lJBsWJlx6WjEMpSiwaJiYsnCEEtRt1PuUbRBIgy/FzhSjIeI/Bb+DE4NtnVjyCW0Zbp+aPaJY+kgnhD1LR/fpwo0cOHBXJrLlGJDQhiZDzFjKP0hNhMQ8YhB41RKDxE1a0NDIMV/RpC4MhNMokMdOngIl6huhrExiYq/wAE7/Bq9R0pcTyEYv8AuJDylOsmL8P4o3kxjgV0J8If/g0fqG7zJE1JFhKvCNDBdzGL4RThweJEPBMhCC+XjIIZ4Pp+TFY0SGQvdoxCaEjJMk+jZTjIjwqLjKXF/wByE+EUpRQb/h0YidHj8KopCp6TEiDRDgUlSqekHUMMglj1KkLBiHtgu4aJBVMtILnR0U9I82LhBCE9o+kK0WV/wT5N/C+FkGhsT2FCQnUJHxRMulGPwfSiGo8uITTIhjRCC4XbBZCEGXg3tExTaBL8IQhPmMSyCVCLjCV1N/h0pdgkQgvhDHzENEGhL4kiEEhq/BISGhkGhsOhL8EJMZKQSFiKX5Qx5YWlI8WL3THgoEhkJh4jH6hdQx76eED/AKVlLicLlLjIT6YkNbcWOrBKHpFUVOiV8GhIgiu6T6hTVxjRoj1DX9J/BDxLExRfFL9Ufyj9GHCI5GQiXPQQg9h3J6NCRZCEwksfpBLLpCHwbH7ixso+nf0fwk9hYqaGphdEhLKMHEIgwgvyE8H/AEdwacLcRHcbbZMLo6Nv9yEPMiIJfJPpeEGjhB+CZOCTGjE0NFi2H0aPw7DaSh2ziQhjYiTP0pceJHhSZCDEy5S/EK/jywTKXC6NjZRsY32HCGWkIsY3Bk2jEQWIlGVD0sSPB+/EGcDcGwgQooGGylGmxGNCP8OBa7EnjfRukxLGxMohjcE9SKinuwg1/DwBN/M2/wCEaI+OmeEyCQyjxGhROjxFpCEGKDRINBiOFQ/MRBIh4hRV6xS+F2JUiRDP5DnCKFCRPhDGyWooniYyDEyEPCnRFEhD9yVDDggJv0f9Th6f8ZYUSZGJP7sQ2eS2FicxeF+bi+UJZCCQl/RIJwTIYOYgkwkIL8VFEKhjQdvPNWplExkEIgkJEFtEUbEyiN4IyYUmUpS/FLwTB+6sSH83F6QhDwT3uITFBUMIicKMTjGWPbtE+jHAq5hOjxNCHqGIQpnm+kR5RF6JzabRsQJQT4XGiGGowzEnhf6KVQ3XRog0NDF8JD+CZUNj/wAHG1nP6IT7mj6JfgrOnceXCIZbTgx+48E4PhBMdiBbjKXYTKe/LGvhEVZ6hc8K3nPhUiIoQke/miVnMSIuaFzwfo3vgth37S2ZSk2OYJtxaI0FJdForb6QhCFHKDJrhBmPXJNlEsaxKkgkNbMWP6hQo2U6yEEhOCZIa/RPG4NBqhqxV4R9GcCddG6x7SjZeiyno0O5zW/rxD0Kv0YsuJc2CWPwfeFbEqs5Qt6NoZeYkTDQyCxPYRfVKcYikCf4O+IQISIQsw0QTIo8A7RMvBjEhrUkJZRiIIaEXG9ayEIsheibHQ/6MQ8oIMhUhtCUiXgxjopClKjg0TEyjPRqdEy4bKXaMgiD1oQQyCULTE39L/pX9KvuHeJB4sWng/r0SIQpCibzG5i5S5SiTKX/AAp6JCT2i2YnBvF7lRxjWXGhvE8adEnlYiDynpCfK2HUJjW2Fy/NKUoiEh7jxeCKJjeIo3qKP4Q3qGU5kGvtIfyj0QxlJ9d+6Qoh5M8KPIV5/gmPIyY8mPEQvyvfpI/BISRMQjpPmBohJ8Uu3EyiQ8aJr4XG4Jnhft81RsvzSif+CeL4WI//xAAnEAADAAICAgMBAQACAwEAAAAAAREhMRBBUWEgcYGRoTCxwdHw8f/aAAgBAQABPxCiSpnoV7GK80b5TaPsW+xrsTXC8GQmuxNDKD4DDQZrgvgYbfhThIeA7zsYW0TYuKM7GQRFBvFoJQaptgR3h4QrKxPBWUYjlaoTQ/gEHwvDDJSGxUxZIbNaK7R84G1LmTBFGzAx3ZRMrKQuF9iHBPwV3ZH547F5EEoaM2G2tMrsnzRoNEiGIuB+4/cZ+48RqsjzwYBtRmJwVoikG8lGxjWOGRGzJIIGghbJjlsbIkQacHwG2NjNNMo6PDKy52QTOGM0xsGAuONC5tGksjKCTsq6Y1pBJloq8lQqEJlQ3BI0SNeEdkvsgR5MByNSRCbGcA+gbwbs2PsMtPoTN54MOxqNRpRoJ0dH2KVjXkbg98kicSsbDQkMuDUMcN4waMkNrsb8DcKcoVdscGJkg0xWkexJ9iZohPAoYJLo0RRQ3ozfkT6bEnQncjjQ2vChTgb+OOmz7mPY2ZY8tjUaeTUbDYY1nY1BtpcPsNvI2yjeRN96HyGY0xOcKdFosGw6NsTZfhB4Q3kbY7RvBWNkeSBteRohivmsT8iaYlTJkanE2Mack/JY8FVkalzvgZMTJSjbnD9j1G4utPsbD9hOLDPF+TGpHknrn+5BAz7YHnwo2jEJGk0aF2EcIx42NPAjwX0NuF8ia6FlmwuBhul+NgrCvwN35Gh4MayUWxW1gTQaa3w1URiNbE2i++DQycZE6xqskFgbHGWMJjJy2MexuscHxp2J4fccucjcooRooZZdleMjUuBjaHkMaok/I9FF9FEQ0I7kSG2ZYk0ZMiqLDYnexqjU7KMNszxRL74d7EvF+DGImR4Q1gaXHTLgy40YuxaMXhMehvyP7Er2JIaSQ0RsaaxwmehRsi8ofrhGu0X2i+xUZlL9GRUfbiwtjjsfYStxiGJj9hBhsCTTKJtZMlnZArmx6e6J29DCi+mO+xsbPAeGNomck9s0JjtNBjKK4t3ZkpF4pc7L8JwawQGmMeF8cD9CDIJDFraY0Leh2F4ZBIaZ2exCQR/CIRJl8cjCaL9D8h8FRcjS2NOF4MtDwE/JUnaImGW7HrYmWJBQ34L7EGzRI3sh62PZgwhoaHgb6KIyMVCljWejsvBl5TyJ+Srrh54twTzsx2xrGCcfg8FK6XPCGRTHwQiFEaHxfBJTZriKGEi8F5FXkq4MRdjFCbhRDJjgYom0aaE7wwhHAnXvInwbiZ9DbOzZnZ+fCcHwJEMcfi5ZVSlKSjxopsjordIY6NdF9GxoSyRMeOiXoyuuHwxNdlRBiwijJsbhWQdYlga+BYOhspWUrG+h4KylP0RVCi4bEfpm7EVdcFdlosCfDKxPyN8HsfK4evjPA1OX9lXkdorzEG6KBspDNO9D4PnZ9UucsQ3wyEGRDQ1wk4bKVldcFkJpjNDYZfB4C/JTE62O30UTUEUTFkpgeBsTyXAnOElgbFv64WuLwuEMZDFnNG+E+LoZRsbG34FnYvQ2zIsi0joqJMVGNtiYuFEMWh+xh7IQWi8JcUpVSjG3CwexYCLJPCEnb0Zayh7EwbFg2UTwWlhRMbAkfCb8jc7IMeBsP5P8CRkNDoSpipynn4q8Xh7o0GyiyuBNwWRYNR8MyxdixOGjYTI0QQxt5I8ogiEfkSYxRL9EqKJehiEyVEHz+i+zajNdmwlkYtDq8n2NweWNEnFFCrwVPpLhOGGT8FPxxeOC0VIxplafY3UQ1wLIxFE7zH5M9sY3EP0L6EiNFfgZXOhLI6LCMzPP2GG3kyhNi2JUNeCPhvg3nJsWxP0No9DfRtoXDQ14G2i8LWRtpmzROaxLI0JIo3nhoyaEwNN6I0ytjgaQ1jAkxcPY02iQTwPjQQnkTRDXsaQ8DYkbfBb+F4GumewkFgbZeGvSIXOxD6t+DjYkhwqGdlPzhKNDET4X2J8pxiYhwbVE4RaR2ioaEsE8DCEINC1xR2OkLYcts2zwx+AoNCO+WqNTlaKI/SZ2Ju6GmyeRMTFlk5vopRs/BJeOEsCVmg0ThomRLyNGBDTsaXsUZL9DUfDoWNlhSBsNViGCCQh3hKOmxPZtseoYMmlxUIxMCLClWhDg4xpLmeOG6oUQ+DwQGiO4I0q+fzioeWR+SMkF5bPw/D6FskHkSj2YC5pumfJeCdIQQhYZAgb7L8XLw3XgglBE1OTAd0NNPJRGxpmS5LkbFpCM9DXsQSaehrh7EPXCPsSHadC474r8lH8MF9DY2SNjJjQnBpwyVD2JLwj6QhXQmX2J+xsWirieiLwuUNlE2MnBmbxWX2J+BM0tQ9i4bL4GsrjT4WzoFG/gnfwhHYyVCtEzkUbFGhhpjQ954pfl9cT2Z8/CwzHKK+DPgq+CobG8jFgf0VeBR7Ri4QxvA37HnQl6R3qDRBbGhWHYkvBMjwwNiuWQtD0LQtGgoY8hBP0bOoJictUTBELA16QtE1EbQnyyRk+KVDYyGxNdC2bYlgbFGNIyCiUKLeF98K8J8YLw8CeS5E3kbGOBs3kezbGsjWCPYlWNY4M6CQ9BveEgkiWhrkwQkKjAnCXhUYI7GhITA3O+EywQY72J8G+LC8UpjxkRD6EGh8Q8CRzhqmx+B+DE0jJi5GofiHCIwOukN5Fkwh/ZsrjBa4y3oagjBCd6PrkN4JrxoexsMTFhw8gkfCRYNkUWjTFehtsaMBsFNi5ECSYlNDY2J5GxlPYxiKbFX0NNNi9rhM6MdIXcaVOw/OHx+iY6F4lPo7GPobMWBvr4WGy6EaMR5wNJcvZsIN5Hlkd9CE+CZCFsvjj8GieiR6Gs6HQ2kGsCqRX6b2ZL2UuN6EmJy1eDKUGM9Cd6FaI3ZHdmuyV4G0T0eCBsbnQ1GIhZDwEEmhY2hiGFKYGlccOh45SRBOCfozEOgYbvGxri5G/hlxqyUcaIhDWRO+FHbRjS0byQSzxBMuxtoTKJ4I32INPA1GeOFtST0JeEPghoT+L4dG2aIzVGkMh7MXoY24RDHlCwzueSzT2acH1fwFOPpKj0/sqFXQ9wbdZE3ZIN+B/cplL4E2OipfImbiTr6FQX9Qt/oMwTLysobjSdzrBjCpPhIiHILY1h8OuE/ImMacE0MasaIJeUNY1CeT6GhYOhIawJJoWOEhCEcThXJ/A8ZIs8sWylUMMY/gsF6QxiUI7nhJ2LiEQbAkqxXo7E25GBBYNCYvaM3iNiTPrqDWpmphIcFetbo3WvtLAvsCmjTE3PAof+s/8Aw+LI1N3B4glsl5aY2NPvTCZq9z2Ww9CcpMMlpTfon2i9RpTGaoqTIeOHxWdcQyLDE94phlFKhzyVlbHxWP2G0LIuBnR0byKDF4CpFE7o/SjyuCOx7wNCmIMglCH4ThiYwmhMTGVt8Nmxia8XwKYX+DMY/R7ahFJoJENtSEYhfTcF7Zj1/BJFFw/swNgTL6PwtcbTN2qx4PBC00m17HvKpdEGk9i6o3K0fhe0OD5rWisYqhsWsspeFE/hgShUPZ2RVkR9iCSQ1kjGxyuFgYgNWXGxqGiZEUpWxZZERgYXFgm/PLRPR9CC1z5Ca7E+LWLo2iJYctD6/wDYilw9i4nITWv4SYTerBSr/RD4k4rKXhJDG8MXtJIt4YMRhOaH4ra7GiZvEItZk1sJmsQhqk6Sz8LBPzxvogyJrRF4IuhkFvifDPTH740xtJaFDHDEsjRiGxNQcIeWBPyVeRSNH1wZuEGmrGLWyXb5fBKjRiCnRfJA3BqIiKGwlkfrJRRkpJ/pl5GWP4WrTGHsGEbN6yOayWvBdVrpMVaYN5EFNYk18E4Qk38LMViImtNbQ6w51gQtLfDQ5uNRiiiG2IxvtFEvpigbkSeWy2w0nhF47N8YOxjWDAYnBiehLIsDoayvi0NUSGs8KPs3y4MGQjVFabeCEGhtdCcZTwCfnli0JYEiHXDHTISh4BsWkE1BawPamuzWIjX/AEXV2f8A2OTUyy2QtlVOTQoUWQ5GBcCURrmGlr4ZkJ4FrgaFOD+D1tEmFCrZONHXjvkzI02c/QqKbtGaO7oWmceOZk0N3wLZfZfZ0QURjnIk7xoX4wRBomeMl9cMZLoSdE9whp3jA0uHo0Z8Cb8FfbE4WjApcjnXEo3a1oRroWyIOxIYmJ4Gyn9NwuWGx7rc9CJJCQoK++LYFyhaGPiZIYD+xKIaUyh0dJpp+BV46SQhNVPvoigJ3U9FxVky+IhQi4VpPXKJzF2jHwbyPiJ7MLXDGl2KJ4QnT6HhZyXAz6G3CWhJF9GGJk74g0OEQ1jQl6OuExsrKywkRRDB6CbTEMeGO3XCcFlS6MO/AxFUyLVPDGSSSUN1fAnbH8D1C1zkzBswlxMjSIOEXsZ2+hGblMeUfoaIYjU2YyaVNDfng9CHr4Ni+K1w7w+FgexEvChsifZGvg0hiFwUXeyj4Y1SGeUX64StHg3w0SYaY/piTKisSLEd0UEOb52UTMjEjcYySRL6EjWiYhCExssPodjbvwpRE0U0ir0FpPnsfdFl/wDBREERCcNob9D4fCQxpiU9hEGvQ1wjJOEx8UsCUnoafxLbUWDxIcmOrx0WGxejsg98J4FIajM0Q3nRCwIRYFKNGIbQ9SHXRAVibR5BMueFfnhEHy2Uzp4CCdQ1XH4S+xpu3DzfsSLjv5N/QmVj9i3gTMDhBoyZ4TQ6gilIQTGBoQ1ONuEJwbAvIerBBhIgiDSmxVBI/hdld8PhDRojozRg9mYOi+haDxQ6RsjEh/A94LgLITNi4XwG8jfBsbEIkGaQuf5EyiRjUStDUfLHPYiuY5WuaNkT2RezC0LJEFwp3RqaFwmDAyGhKNRDKNGacVjbE3BW+hTgeGyqG23w70VifkbxgV7J5IjWhbGqJGilwg82i5x1EkLSjHPMzQuEJEaDYE8iYjArYilLw+FGMqjfkWr0Ikmm0b/vFm02HF55iH64nCZeBrw9mR6L4JLInwa5Y2OFQ2Ub4vpFFwxsyUeoJzGQiIjrBWJ8F0FvjLA0h6Kb84H1DY3FsFxoatI6lNo1QoQmMV9CeC44JvgvR9hoeOSFzkzGSyhRBZR0bTZRspciyQZjyO9TlLyMV4b5WsmGTwJZFJDIqRUUbY2NDy+HjUG3NIpSieDobyYhSlGKTilvGOJxGxMmJZEsFg3Rv2QRDOIx6hblrmHp0V0hNUSGhYbInRZFyUTwJjYFrIxrJtkYYTIwKsI/wsxfgxbG1N3lIh0RNbYkvA1xCcY9iQjoTEyrhsalNDSE6Nl+i8O00LvZT7L0LRBL2QNZGJdnZKYDEyoXoTFMjG0xsl0M19g2C7FwhMGKkXItRRikTSGEJzZhyNeERckT7GhA0GhCDYkG54P8R5fCDPqGRL4YOy0QxKkQk0LjYuL7L7G2J3g3Rog0QSGsCXkiOyHYyJzZSlyPoooPs+xQqGYIWyxjfZX6K/CGhdF4Yi0aKFjyMklXgSSZT0M2EmI1U1Xl+zJDyMWBexoJpoonIZ5EhKMWhtpFbmNlxHsTDOOEHwNI659iVaawYit+CpR0LfH4PXNL6Led8ThPlIlNcMwJczhzmC4anDDaG8CUXmYGXAhGMwE7ot3BMyGuK/AoNCoaGNEWfo/2ESDxVJe6ui2Q3bhhF8jxxF5iyPhnJchLTmrwLlhVlN+jS0xNNdoTJYxvB7CGydDC2JCqFNeqJP8ARrY7r/2CRiyZNu9JPL/D6VLX/vjYfYqY8LIoc314FYZL3BpZX8GUTH8Hy/nwvGi+lw3OHkaIJEJxRvwJuFznRDMENDGX0Xh0oOCFN44Gymx5CTR+iUFgeWNifCfDJo1KYY+vQ5fTQ70knRuAw0qrTl9CbWy7hnT0KoAFk1gYnOmhTdsNPWTKyx4XY00UTX2NTyVexITeBNRNgeNTEdUU2JbLcd4R6LRYJS6o1RvVDeqnlel0Pr3gMjl/INvKiGwNWyCR0fIxqw1hjxCflFfEpY88PIuKYYsaPsi6RI+Zx0ZPs2dF8crB0PXNb6R0OwTaZqN8Pie2f0s4Uqik4b8Fhb8KM0uFdF7ZsQuaMEJKNAqmf8HeSysL2EZDS6vgaoqT6GifuyLpe0K00dNIYl7EroWWhU9C9TZYIPh+hGpppZKtEjSWlI/NGBpzB2M8nijoyaX2HV7LBJMc82ZPRBH5K4k8oUaJqaYuJ54SHe1lY+ORPI9PzwmxezfyYh8LQkRmij2ZHDPqzNwqY1C8Ph+wmPJCDiRMbY+S+L0KUlRmlaHZsXbZRbAVEJbA5Juvu1gj4qTjW/SJwZS6rMbRPSI2NsxBQaq0QujQkJgXvhjzPWRWbSLBtxqLNugLzUhkZ4kj3cDo2Fr2CY96GyN3SBDY0WdohLKNF0qTZ/nCzwXLLhPQxfBuCrIuxmxoXNL6GIRR/XCvkh3yaFLhn6Ub46K/Q2LZo6+DQZCZ4ao/Yp3oTFyzRqbH1ZnoQE61sa4mo8bLtZqqNF6bG69idRIIS3eCUFJxot4llJOvJIU/VWhSVrik+iRLsvclG8kHiCkzqJgXdbGyGPiMl+yTDW8ocJMyEoM/BiyTwLL4WOULQkJ4Qku0KoRTBBGSjZRMROIXjIaIaRI8E5aM+R8Lm+uHoaJ6MLhFTBC7jZKO1CaRBazpoplWLcFChuGnK+xiET2MR2dEBCyY30XbMtiMlHkYq4T/AMINJqMSxMjVGglzNaVQou7xMwba6E3foq0hvnAlOGIXGO2z9YtRDoZtiTfWCvBPQ8FHrmcJvlCaQkGUHnQnHOG1ENiZS84+DM0ye2+bGzYqQg1RidU8JgDU06L2ZgNvI41kQ9CYp2MoxCKfKO0zZGObyZsGGzMEozI/hFJ0kRkHWyR1Ila/ApWoZ5RoLG72Gyhpp7UCfjYzZIXiEFo6Q0LYuDowUTKm9m2B0TjHHo6LwlBoWBRvhRt0vsWxlEIJDQqhP4Ns2HGVoauzwEVDowxB6Mb+CRjGr0JiYxPDGIyNcyaciaqxfYZPtH2Qk3wiG4iA1S2NS2LTZZtUY+zJvi6Q9rH9ipjqOd0VMzaEaZ7KSqpkkMkuhRI1kaQmSdafeEuyTvm34WCfDfjhQwSIo9cIc6464Yn8EwOiWCPyUT9ieeIImeCT+SHshP8A4hZ7H7DWMbEpSxtdPI8aFO3wINNjGqY5Yo0lkamiLQVmRfY6jg1/l8QXoyro7yPIG77HtsmbY8DC/I8BCW/9Ho5r/KWCWcl2uiEvA0RXKKx+SXwM7fkZuSlJo03+DBFMhD0j7MF5rKdDYuEN6zwzrhTB+iWTRlvcIT2fb/D7E4XC4QWOuJNvqcL3x+fGjapYbcR0WMQThAm60JhryUZ0Y4J+RZRMjQanljlilNJoOwBCrwMTzkMdyJZGM3BiW4P2FL2Z7YoY98njYtleToWQuDajDsrriTq+EIXkMdHkZQ7eyBO50NmbSibUGUR4E04U+wiprfZeIYguOi3HHQtj3xghOP4X0Y8Cfob9FvULxTsb3wnOuCd0OwXECRfixXtj4lIiKC46EJkSEe0KsGO04ExsYFafhtFITyC6ssPwM3jRpMVZ7HrKcFStyYrYqezbY2SwY9lmyq2IG16MMjZejL1KN+RPdy3WOpRH6NKJEKcKXWRpC6YexY8bxghtL3j2Ywd0YkL4NiNEvYt/CjyThIwNH6T2X0Uq8D+39L6EPBX4En5Gn6E4Nl0fQvDwXhl4aFog0ZFzSqicQuDIhkpFtk9mAnnPHeDMGobUdlg9QU3oMnsWml3Yn7Zl2YrapJsiHY3ezqhUsKDZZy9DiptZ0KXR30hxTEuqHIko8QZkItVsxFp9hvpxO6FrKSbUS5TKP64QzPQrS5EsjWSERclM+RfYuLy7y9cGJPx8DQglgyJsVaGLQyoqLdIz2ht0ojHDM3RKYbETf6JO0tj0JE9YKbcG62ieBaL44bWxNLsT2IVaKsT6FmHkbqD1RPyX0ajITvoh0JINQdk4RxDObg7eeqJ4wSaQjMmLiZkTs7GsfC+uOrwnGLTA2J3hrwRkZpfBS829QZCYOhXsaIWBRKfYaEhDQug1Ox7EieyfbPxkIJZJ7IxKLI0+iuyovQkRCbDoy5+w3bTJqiWUmJ1AgnovRFRpMVbTTNJUZ/LYylEIsskLNCeUNFBDoqE68GCvm5IwMjwO1+jpTdkVM9KmhXyReTQ0Lh5Oucjor2P0JwomxsavK9csT6fDGXXEGsbJFtMX84nkgkXdoaj2vhF4MeBEI6UKj6FbGsOobIa4YlDi2ykk9jCuUyapRjzFLwmL6ckIjaZ6MXlGXsG1yGvRjmImEfTMEjfiFeUPVIX0Z0iylSSSngWabIkOD2NwlVFVQ9M2FdxwEOxPoUmrA+Fsks5Wih0Q9bUGP4Tj7EMQsDfFhkMRV4MMi8DSRBPjHkehU6GK/gxxj4rZkizyEIJ3ELUalU8P1gUKV5SFPsCQbGSv9DE5+ENatiYnSGpgTLFQkPoRxTHu/wCRitqCE2JW8jTHsEx4kGq8jXRFINZilJ4Y0bMvw3MUzsXFFgYTyZoiARFJ5JO9Cpt9sTy/YxMfJaI7HGtEyP6FkawJGhl5nK+LaKjrg2XGhP0L4QSEFwlRCtoydUlmBlZeCuhUoZ1gUSSPpEl/4EtCL9mmkbLikrsS+Rh4DLUV3ssEPKP34qQ9iNsbrIg2X5Gmh1DENoTSI8lBPNHwZg8TBkIS2hJTC6Zfj0JlPoXsiEknwlRCZEvJPXK47OsCb4bwN4FwpONDKvPD0YITMCSmBaErLFOMwmsGRX6uV+Fu7kohqSkddr7LbQ24LouvuEFGnPA2f+AjwyRCRhHgQQ+x66osE8cV+S/Y9iY+dFFwlkSnDTQ2Ey5wMaBcZHSQw1rOjTwWFfzx4fCXsnsxYY5NOcVlYxSl8cEvJOIJEyNXRXkVpkz3CfRIQSyQgwoZfAtcCZj8zY8NeGRMtJrWhM5vKV+k2axywsDGDSfRJRGl4YvAIbJ5TFIng/LhQYWOyGPA+oUvw7KL2PZoouHRN0pV4L6K/oZY8iJhjZwU1sXYzt8GZ9Eb7E3kngTTh7G8k8FYm2h8JUmdD57LBO9T5Z9Gfhj4ErwLgqIS4Iy7Rvn/AATCSUE0WMiTTX8YrP8AOlU6DAkCJofsRaFNJQuUY8oNk2uyuK2NFS0XlDFxCEyLeTsTyPJCcPAtjxoy8ptnYlHEJst4vpl9Pm54ZorYoXwJ3YmP0dGA3WMXD3xXyly/o10xO8wSpGI24WjZhRCRcjzBNDzobC9iVEjxkSqdQheB6Et1xdmaruCTtA7KtikmjGzB+ZMw/g3B+And/BJ+ScNruikG+FkXDauuV9HYo4CmkEEPRKTGBD+EJw0NC4z6P34Uy+xJ9snw79DK6KomxL2xr2zbYqJER0JCTsRTbY2ROCEzyCJgjFRR8JBXClGhyYqijSyP96siaTy+KH8lbwqLKlZWxtpv9jyg1BrJGfXJOi5jN6Gj84XGeEieBGhoIRvQWuIYW+Hh4M9EcMkOxudCyOXi8PAnXIQwQRDRRc06HwnjhCXCZONng3EsnQTcFgTE8iZRZiCEap9h1CH8wRXT9jvz/Rk+iR7qEx8hlm1HQlRNvY3Kk8lQ2h/BISnGxHZUZ9HfMh2fYhEIKGbAieT/AK5qLOFG35E/I34HoWd8QJr4JCGs8Q0Mz5RfZcfD7Dw5xDI8kH6K4SwJE4ajDeSqDJ/BCYr5O/8A9PY79i2UVuODfDWDCHpa7wLU2wxU3VpMsfwW+YJPqCXnip0R+ifRH6IyNkYr2IyYDt0bNEibZA8zI+nRWV0WxRsnL0JGiDHk0XjsomPZSlKOeCcLjPRH2YmRIaFVxBLhaEJoTnA2Rsiyjbhs9hL2NMnB95SDWrGCtt0iS9ijWzHkx5KYGOKekPWxTJZKfivUMhrHCC5WUxCXsaRP3hK6JrEp7eYXB10JOhvwMWBZkO2BycdokYlXwkd44om+W4ylH98OfBiNBMYg0/RBDV7H9i4SZlbGRkg+IKX3wlR4ExPPDFGpQT1exX2MbA5NtmT/ANBE7Qqp4KUeRfDGUMPA0KxTFT0iDTkl0LcbHIQayTJgmDsKEQywlai2g9jSGPDJubKLcIJqmQsRKUW1PUHGmYI0ErrJMUQW3hj0H9meIENezshGtCTueIkNrrmC9j5e/ik6MmeZWT7JSEEM3xBkENEFxSl8l4F4nl5BFZiTGZbcHLIjF5GvTNCBo2KVgbsWA0Q8Ru2lVkqNSYmz9Fjc5Yen0HNMn5XYsUeTFaS0Pa96GnciTqwS2k8UWKUZqjstXGn0NjkvuZ5HL5Q8uD6JkI/qINk6VGnsScKpwr7FSBJaS6Okxrs7gkeH35Fxetimbd0TpfIyTGRQiQxYeeW4Uzf+BIwcGk3RoQjsEozXQxlveBDeN8X2YEMWC3m4Eg3kwQgzRgdYxwKCIQDLf8mNmmx+w9rseQ5spfXwG+WO+xu94GS9uYEcn0h5HmWR3ZGOsG2/9F7ec2aIpfWB2ClSkSr8AX/kaBblM34IWba6CwGz7ZE9oaV1wf8A+g0bscG2FPT/AMjJL0ZX0ZIU8Fk8lbf0gkQlt7hfr8KvDEZGBsfo9ioaPAmktifv4pPonka9iwRs0KHZB8ZHR+/DAoIwOGDQmXml8j9CeFyo2YFPMNzap/p3BfTGhGzXsad74TmmX2P242WM5ZZhoraaTyQg9VJslE06EHojXYuWQWziJrZfAyVHl/8AY2jaTaXjo1lYZPQ7EUFsWs7FliR1rhgI8qYgnKJsP7EcP/qMmUNomzrHasYgSdRtehiVOsfRlkSyJnXCHB8PwPAmdTq/FMYxM6G2hNsaXnli+LwUgzBV5N85MkZBog2boMSg4Ncp5EXwxP3wo2X2MpmJso4xtQx2xknHXk7mRDdEsFPUPSE+t37FNhKZG2Oo+afVFvapBZZEGMih5CBvA/Mbb1wcGVKippXqjY5KPcGULwifedrwMK1WuJrPoWKu0hZSOyPxw/Xy0YvQl5O/hCwuCtmhYQpSmOKlvhcsSa4+wsHYt5MeSog/S+zseXDGsODNASDyDjZb8jbbjIn1WTwiPwJPwJjyXMHfGC8GzWjsSvYuj6ESSWW/sVqPYoxoTRpPffgcwpcvMx+Dq1pv0JK1CR2QeEbQ9iyWMTo8bEqiZWzUFbYXXL6JYm3Ni9Nrsxjb00wiGVKjTL7E/wB+b4afB7gvi1R2QSu+EzCuDTQzb4z54XyaJ8GOCFw+hGQmKvTkIuHaT0T0T0Y8E9HXEZ2XicNxcJQVn1k15JTbrof0NCR7YlpWZWvKGPcncy7Mm4uEy5E6MSfgSMSxgz2iBr0ZsIYkvoRiel5f/schNlilbuCDMt8TwbFylfjPA1EPHJEfgz4MkEvA164aQ8IpcfD7MDOucefnPgmqI3CTIiz9jUZPaG2lxiexNwgsCbuUTfGTJ7IREwVNwnntOCd7V/h/a8kt9vQ93pXwJTHh4+ja5hCsrKVFGIVixBP6pNnyLNXY6ARJRHW1sSnZvIn/AAw9jS6+aROaEsiHwkNvwZKvJvRCZGvk3wXKDXyeBvhDK6FjMFsP/RJrVY+nDnQi8WcLTJeFBNIq9/gytYeH7RGiZ2KllUv+xeC1+R2z/SFrOxM7KXjsQ0hJDgxtLY01h9MUpj9hqwqWmMTLzr6H60PC0KlJrB0MYycsReB5INRZ4cO+Fkg0T2SH+fBonxfBFUpeKVcvWCXaEvXwgtOhCH1SibHLxntThsRD8GuftCmcDXriJFImst0avQlm+D75yJYFW5DuobkeCb2QnaZ/p3BDbTHxphCTwg7VjjhZAvYqSj/LSEWfL7ZC74fzTZWVmRn58VbcJOHrnoRBpDR9CTZBcbD0ZKfY/Wf34/g0+kR8iZJGoMbH0LB4KXzw1k1y989HYnsaEicMXovRDIqFhukND8j6aVhRwhJWglbVmaJYI8B+UmsDR2md8Gepp9DFmoydsNrhcxkfjiJ7ZI8CExJDShNGWiCPsJkZTEPoS7wPXGCCQkjvA8GSC5aFvj84ZkyjPgyuilG+Km6ZQ1R8WUyN9DwkJnYxNDy4dEfbEPDKJlGxvAsFbZpwt0xexjzlMTLFg2uHcKvJu5swo87FZ3x2JVJERMFCiZz8qLOyE4QmhM9jY3WZ4ROENtERofHY0yMaJzGfvwcWxNdCfFnG2J+y8TyPEgxxr/Ro1/YRUM+xbWjqJke4R8NZGmK9iUUIY0JQQ1SEIM/BL0ZS0zBZMGI8GaJix1bohKmuFnvgpp4Tf0X6mhAZKiFIuxITyhvyKhzyL0TmGboyhcYnCZIZjtiVzTPC2P0PgtjGQ7PfKY4IQSGvhmtCUFo6Hl7Esj4WhIhpp4FWnD9oPaQ+7fZXj8M8kYat2odSys8E8l6IhJ2Jwo3jhkhcDfgd7Fw2IbomDeWNdD7FJPoUSLTMnkauEpaUfVJUXJYXCyUvKLzgvwZRvA12Y9CfC4WzHkx0z/sZfLLOFQtP0vs/SPvBBKD3zCDPwSY0Jej6EXYkjXYn9HfnHS0oXgREnhKjSuhc0ia+hVJfRZlP4GzyE5mkiR9CSo0iqEfQtZH9n6aY3dpmOqOTZPCLJUIk2mnRCOhyFkRt4UMHkTdDZfQ+LwxLBTL0IRD+KYmXhjL6L6KUomUWRqCedwb9lnY88QsXFLxPR+DGLhIwJeKR+GT0+IT2NfJ8PnBlPBVnZ42taNIEnLDeuUP74iIumXJb0ShQStwaW/8ABT7Fgt75WxvHEZMsQxuIbKJwQT9Fo8aK7r4LifCXnDKX3yVlbKUoxRFvFP0awMnEJg0Ub8PhGBk5/GUZ+H5xMCRPQ8qQSLo1BaKDUzxN/C+MBvoZcg//APgw2/4WZbP/AKouyha6QhNEpVFwQ+skGl18kzsuNFo0NISEELpk8JmvnMlR9OEFLBPg3OuCHCpFXLfrjQt8Th6I0fZOE/Zk+ycXomfhDM5otHYs7G+MjWDBaImidE3WlJaUn0ErITWp4KiXpI9oKehJtkmxwW+Ky0XseuEbDE/JRInH4xMp+jJyk2xYCRlCf0nswY2UJt7FsTbGobeBJ2xF4lJwkQfgJNMavWDHkx5P1cND4SHHC0XwYPqGfKOt8/qLOxsTWE4rG7gyT2P7FUX64yKoTcG2fon7M+eEoPItEzBi4/T9N8QXFFnnBgnC2IwMmxKJUNH5G6+SE0JOhzY35YusI7nF4piUXNmfJ+GClGxjcL4EiE5qIzPr41+C/RX4Q27MhPfH2yq7PrhlRjYmuJR1DfKK/HOTIhIaPw/D8OtcSjR38HXNXXL2JY+E5wM+xSI7GnvL4ezDZlpCyhm9lKfg60P2z9XNp2MRnR6cqDnQtfLE0xo6KO9aGzNHIL64eBCvwNicK2Vj0PhakEs4SdlLznzzkz5OiY+P6L75cuxPA2fQ5CDcN9M/B8Uyx/fJtGCpdEu+Uz4WwlWRZQhGR49jq64pYey/XNmhN3s9hvh/D8fGZ8OjHkvFNoheNuNh4KJUX0PAm2ZEPhCGiCKNmx65/vOPHDGqxIXDyxqoWFhl5apEi1iYoxpExRKDTIKjEYQiENiI/JBNDeS1YJjJPYlkZ3pH4PBTIyQuZjnrYp2zHwaIvAxmn3w2Vi9kRB7El75RPY4iooyEwIeuP1DZc8WFF8eh5MUx5KVi2fnxg0aeioTohITHsomE3BtjzsePis9n4NuH8KbCdifC/Yti/wCFInk64/ePsngj4XM5yI7EXPB4KbI7yuGUpcjEIxwh6EeIN5HOM/N64rKRexOUvI2wZpCO8OpFvKzynwedoXDQnBOspb2xZ3wnPgy8UrEy/DHg/CvmcY+MyaG0N0aq0f8AQ6wRwj7U4ZBqCRCDtFXw2X/mXDXozcFgny9nYhiGJZxwmKPsxR41x0JlFh8ZFUIJ4G4bH/wpjvzwmOBs2JuKUow+zIY6yTZHBNoomxwhTwUWx+DAeQm2xpi0ThsRebmDcYub8ENNcRcLImGoaFtjVHYMpU2KaGukVB4PoM6EeOKJsaxeFBi0Uvzon8ug3k9jglRLhjb8GRUjexIg9kOxCHwywxY1fQkn0IXDMDHwdaL+8Fsa/wCBornw3E+wzYXDQ0Yk0MawRC2SkaHwzoR+FyJ3hvHxmfm2joTG8CeBcyo+yEEkIfshGSH2NqFYkycZLghi4SjUENELy4bINVCUQ0PiXQsbFxgfD4Q2Yk0+Lwijfhl5TKXhKoY3Nlo02xlhVylRYKLi8JfDHDHnYpIRCCxj4pZ4rKy5KL0H6CHsbQyLopToWhMpBqcM0Wkp0PJXZ0XhRsehBLJ4CMjM+Rt+eIyCYyx9jwHh8LhjRnoz2RPZJrhFiLwt8WvhrIhZEh8dcITicPZgq9GPR5FbkTr3Bl8qia6Q3RMbeyuxNUa4bUTUSQ0qPQ26NsTFybyaZKoSjUFR/CeBrwNtCaKiDEqilEbjeBoyBKjTXRPRlDV5EJdCNFehuvJil8DbG2XQtG2T4GzBBAvY/9k=")`, backgroundSize:"cover", backgroundPosition:"center 30%", filter:"brightness(0.4)", zIndex:0 }} />
        <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)" }} />
        <div style={{ position:"relative", zIndex:2, width:"100%" }}>
          <p style={{ fontSize:"11px", letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.55)", marginBottom:"12px", fontWeight:500 }}>
            BCONBU WAREHOUSE
          </p>
          <h1 style={{ fontSize:"clamp(26px,4.5vw,40px)", fontWeight:700, lineHeight:1.28, letterSpacing:"-0.025em", marginBottom:"14px", textShadow:"0 2px 16px rgba(0,0,0,0.5)" }}>
            브콘부<br />물류창고
          </h1>
          <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.75)", lineHeight:1.75, marginBottom:"28px" }}>
            AI 트렌드, 비즈니스 인사이트, 유용한 소스를 한 곳에서
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", maxWidth:"400px", margin:"0 auto", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(10px)", borderRadius:"12px", padding:"10px 16px", border:"1px solid rgba(255,255,255,0.25)" }}>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:"15px" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="제목, 태그로 검색..." style={{ flex:1, background:"none", border:"none", color:"#fff", fontSize:"14px", outline:"none" }} />
            {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:"18px" }}>×</button>}
          </div>
        </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background:"#fff", borderBottom:"1px solid #EAEAEA", position:"sticky", top:"62px", zIndex:40 }}>
        <div style={{ maxWidth:"760px", margin:"0 auto", padding:"0 24px", display:"flex", gap:"2px", overflowX:"auto" }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
              padding:"15px 18px", border:"none", background:"none",
              fontSize:"14px", fontWeight:activeCat === cat.id ? 700 : 500,
              color:activeCat === cat.id ? "#111" : "#AAAAAA",
              cursor:"pointer", whiteSpace:"nowrap",
              borderBottom:`2.5px solid ${activeCat === cat.id ? "#111" : "transparent"}`,
              transition:"all 0.18s",
            }}>
              {cat.label}
              {cat.id !== "all" && (
                <span style={{ marginLeft:"5px", fontSize:"11px", fontWeight:600, color:activeCat === cat.id ? "#111" : "#D0D0D0" }}>
                  {posts.filter(p => p.category === cat.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <main style={{ maxWidth:"760px", margin:"0 auto", padding:"30px 24px 80px", background:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
          <p style={{ fontSize:"13px", color:"#AAAAAA", fontWeight:500 }}>
            {bmOnly ? `저장된 카드 ${filtered.length}개` : `총 ${filtered.length}개`}
          </p>
          {(search || bmOnly) && (
            <button onClick={() => { setSearch(""); setBmOnly(false); }} style={{
              fontSize:"12px", color:"#888", background:"#F2F2F2",
              border:"none", borderRadius:"6px", padding:"4px 10px", cursor:"pointer",
            }}>필터 초기화</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:"42px", marginBottom:"14px" }}>{bmOnly ? "🔖" : "🔍"}</div>
            <p style={{ fontSize:"15px", color:"#AAAAAA", fontWeight:500 }}>
              {bmOnly ? "북마크한 카드가 없어요" : "검색 결과가 없어요"}
            </p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"18px" }}>
            {filtered.map((post, i) => (
              <NewsCard key={post.id} post={post} index={i}
                onClick={() => setPostPage(post)}
                onLike={handleLike} onBookmark={handleBookmark} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{
        borderTop:"1px solid #EAEAEA", background:"#fff",
        padding:"20px 24px", textAlign:"center", fontSize:"13px", color:"#CCCCCC",
      }}>
        <span style={{ fontWeight:700, color:"#999" }}>⚡ 브콘부 물류창고</span>
        <span style={{ margin:"0 10px" }}>·</span>
        브콘부 물류창고 · {new Date().getFullYear()}
      </footer>
    </>
  );
}

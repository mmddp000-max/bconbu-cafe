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
    blocks: p.blocks?.map(b => (b.type==="image"||b.type==="video") ? {...b, src:""} : b),
    bBlocks: p.bBlocks?.map(b => (b.type==="image"||b.type==="video") ? {...b, src:""} : b),
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
    blocks: p.blocks?.map(b => (b.type==="image"||b.type==="video") ? {...b, src:""} : b),
    bBlocks: p.bBlocks?.map(b => (b.type==="image"||b.type==="video") ? {...b, src:""} : b),
    images: [], videos: [],
  });
  await sbFetch("posts?id=eq." + post.id, {
    method: "PATCH",
    body: JSON.stringify({ data: strip(post) }),
  });
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
const G = () => (
  <style>{`
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
      background: #F5F5F3; color: #111;
      -webkit-font-smoothing: antialiased;
    }
    button, input, textarea { font-family: inherit; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: #D5D5D5; border-radius: 99px; }
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(18px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes slideUp {
      from { opacity:0; transform:translateY(28px) scale(0.98); }
      to   { opacity:1; transform:translateY(0)    scale(1); }
    }
  `}</style>
);

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
function DetailModal({ post, onClose, onLike, onBookmark, onEdit, onDelete, onAddComment, onDeleteComment }) {
  const cs = CAT_STYLE[post.category];
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [replyTo, setReplyTo]         = useState(null); // {id, name}
  const comments = post.comments || [];

  const submitComment = () => {
    if (!commentText.trim() || !commentName.trim()) return;
    const c = {
      id: Date.now(),
      name: commentName.trim(),
      text: commentText.trim(),
      date: new Date().toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,""),
      replyTo: replyTo ? replyTo.name : null,
    };
    onAddComment(post.id, c);
    setCommentText(""); setReplyTo(null);
  };

  return (
    <Overlay onClick={onClose}>
      <div style={{ padding:"28px" }}>
        {/* head */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <span style={{
            fontSize:"11px", fontWeight:700, letterSpacing:"0.07em",
            padding:"4px 12px", borderRadius:"999px",
            background:cs.bg, color:cs.text, border:`1px solid ${cs.border}`,
          }}>{post.categoryLabel}</span>
          <CloseBtn onClick={onClose} />
        </div>

        <div style={{ display:"flex", gap:"14px", alignItems:"flex-start", marginBottom:"14px" }}>
          <div style={{
            width:"52px", height:"52px", minWidth:"52px",
            background:cs.bg, borderRadius:"14px",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px",
          }}>{post.emoji}</div>
          <h2 style={{ fontSize:"19px", fontWeight:700, lineHeight:1.35, color:"#111" }}>{post.title}</h2>
        </div>

        <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", marginBottom:"18px", alignItems:"center" }}>
          <span style={{ fontSize:"13px", color:"#AAAAAA" }}>✍️ {post.author}</span>
          <span style={{ color:"#DDDDDD" }}>·</span>
          <span style={{ fontSize:"13px", color:"#AAAAAA" }}>{post.date}</span>
          <span style={{
            fontSize:"11px", fontWeight:700, padding:"3px 9px", borderRadius:"6px",
            background:cs.bg, color:cs.text,
          }}>#{post.tag}</span>
        </div>

        <div style={{ height:"1px", background:"#F0F0F0", marginBottom:"20px" }} />

        {/* B레터 전용 렌더링 */}
        {post.category === "b-letter" && (post.industry || post.contents) && (() => {
          const sectionHead = (icon, text) => (
            <div style={{ display:"flex", alignItems:"center", gap:"8px", margin:"20px 0 14px" }}>
              <div style={{ flex:1, height:"1px", background:"#E8E8E8" }} />
              <div style={{ padding:"5px 16px", borderRadius:"999px", border:"2px solid #111", fontSize:"12px", fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>{icon} {text}</div>
              <div style={{ flex:1, height:"1px", background:"#E8E8E8" }} />
            </div>
          );
          return (
            <div style={{ marginBottom:"20px" }}>
              {post.industry?.length > 0 && (
                <>
                  {sectionHead("📰","업계 소식")}
                  {post.industry.map((item,i) => (
                    <div key={i} style={{ marginBottom:"16px", padding:"16px", background:"#FAFAFA", borderRadius:"12px" }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:"14px", fontWeight:700, color:"#111", textDecoration:"none", display:"block", marginBottom:"8px" }}>
                        🔗 {item.title}
                      </a>
                      <ul style={{ margin:0, padding:"0 0 0 16px" }}>
                        {item.bullets.filter(Boolean).map((b,bi) => (
                          <li key={bi} style={{ fontSize:"13px", color:"#555", lineHeight:1.75, marginBottom:"3px" }}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
              {post.contents?.length > 0 && (
                <>
                  {sectionHead("🎬","콘텐츠 소식")}
                  {post.contents.map((item,i) => {
        var ytId = null; if (item.url) { var ytm = item.url.indexOf("youtube.com/watch?v="); if(ytm>-1){ytId=item.url.slice(ytm+20).split("&")[0].split(" ")[0];} else { var ytb=item.url.indexOf("youtu.be/"); if(ytb>-1)ytId=item.url.slice(ytb+9).split("?")[0].split(" ")[0]; } } var ytMatch = ytId ? [null, ytId] : null;
                    return (
                      <div key={i} style={{ marginBottom:"16px", padding:"16px", background:"#FAFAFA", borderRadius:"12px" }}>
                        <p style={{ fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"10px" }}>{item.title}</p>
                        {ytMatch && (
                          <div style={{ borderRadius:"10px", overflow:"hidden", marginBottom:"10px", background:"#000" }}>
                            <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                              style={{ width:"100%", height:"220px", border:"none", display:"block" }} allowFullScreen />
                          </div>
                        )}
                        {!ytMatch && item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:"13px", color:"#4338CA", display:"block", marginBottom:"8px", wordBreak:"break-all" }}>{item.url}</a>
                        )}
                        {item.desc && <p style={{ fontSize:"13px", color:"#555", lineHeight:1.75, margin:0 }}>{item.desc}</p>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })()}

        {!post.blocks && post.category !== "b-letter" && (
          <p style={{ fontSize:"14px", color:"#555", lineHeight:1.9, marginBottom:"22px" }}
            dangerouslySetInnerHTML={{ __html: renderText(post.body||"") }}
          />
        )}

        {/* blocks 기반 렌더링 (직접 작성 카드) */}
        {post.blocks && post.blocks.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"22px" }}>
            {post.blocks.map((block, i) => (
              <div key={block.id || i}>
                {block.type === "text" && block.content && (
                                    <p style={{ fontSize:"14px", color:"#555", lineHeight:1.9, margin:0 }}
                    dangerouslySetInnerHTML={{ __html: renderText(block.content) }}
                  />
                )}
                {block.type === "image" && (
                  <img src={block.src} alt={block.name}
                    style={{ width:"100%", borderRadius:"12px", objectFit:"cover", maxHeight:"320px", display:"block" }} />
                )}
                {block.type === "video" && (
                  <video src={block.src} controls
                    style={{ width:"100%", borderRadius:"12px", background:"#000", display:"block" }} />
                )}
                {block.type === "file" && (() => {
                  const ext = block.name.split(".").pop().toLowerCase();
                  const iconMap = { zip:"🗜️", rar:"🗜️", "7z":"🗜️", pdf:"📄", doc:"📝", docx:"📝", xls:"📊", xlsx:"📊", ppt:"📊", pptx:"📊", txt:"📃", csv:"📃", mp3:"🎵", wav:"🎵", js:"💻", py:"💻" };
                  const icon = iconMap[ext] || "📎";
                  const sizeStr = block.size > 1024*1024 ? `${(block.size/1024/1024).toFixed(2)} MB` : `${(block.size/1024).toFixed(1)} KB`;
                  return (
                    <div style={{
                      borderRadius:"12px", border:"1.5px solid #EBEBEB",
                      background:"#FAFAFA", padding:"14px 16px",
                      display:"flex", alignItems:"center", gap:"14px",
                    }}>
                      <div style={{
                        width:"42px", height:"42px", borderRadius:"10px",
                        background:"#F0F0F0", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px",
                      }}>{icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:"14px", fontWeight:600, color:"#111",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{block.name}</p>
                        <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#AAA" }}>{sizeStr} · {ext.toUpperCase()}</p>
                      </div>
                      <a href={block.src} download={block.name} style={{
                        padding:"7px 14px", borderRadius:"8px",
                        border:"1.5px solid #E8E8E8", background:"#fff",
                        color:"#555", fontSize:"12px", fontWeight:600, textDecoration:"none", flexShrink:0,
                      }}>⬇ 다운로드</a>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {/* 기존 샘플 포스트 (blocks 없는 경우) 이미지/영상 */}
        {!post.blocks && post.images && post.images.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"18px" }}>
            {post.images.map((img, i) => (
              <img key={i} src={img.src} alt={img.name}
                style={{ width:"100%", borderRadius:"12px", objectFit:"cover", maxHeight:"300px" }} />
            ))}
          </div>
        )}
        {!post.blocks && post.videos && post.videos.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"18px" }}>
            {post.videos.map((vid, i) => (
              <video key={i} src={vid.src} controls
                style={{ width:"100%", borderRadius:"12px", background:"#000", display:"block" }} />
            ))}
          </div>
        )}

        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{
            display:"flex", alignItems:"center", gap:"10px",
            padding:"12px 16px", borderRadius:"10px",
            background:"#F6F6F4", border:"1.5px solid #EBEBEB",
            textDecoration:"none", color:"#333", fontSize:"13px", fontWeight:500,
            marginBottom:"22px", transition:"background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background="#EFEFED"}
          onMouseLeave={e => e.currentTarget.style.background="#F6F6F4"}
          >
            <span style={{ fontSize:"16px" }}>🔗</span>
            <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.url}</span>
            <span style={{ color:"#BBBBBB", fontSize:"12px", whiteSpace:"nowrap" }}>바로가기 →</span>
          </a>
        )}

        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={() => onLike(post.id)} style={{
            flex:1, padding:"12px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", fontWeight:600,
            border:`1.5px solid ${post.liked ? "#FF6B6B" : "#E8E8E8"}`,
            background:post.liked ? "#FFF0F0" : "#fff",
            color:post.liked ? "#FF6B6B" : "#888", transition:"all 0.18s",
          }}>{post.liked ? "❤️" : "🤍"} 좋아요 {post.likes}</button>
          <button onClick={() => onBookmark(post.id)} style={{
            flex:1, padding:"12px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", fontWeight:600,
            border:`1.5px solid ${post.bookmarked ? "#F59E0B" : "#E8E8E8"}`,
            background:post.bookmarked ? "#FFFBEB" : "#fff",
            color:post.bookmarked ? "#F59E0B" : "#888", transition:"all 0.18s",
          }}>{post.bookmarked ? "🔖" : "📌"} {post.bookmarked ? "저장됨" : "북마크"}</button>
          <button onClick={() => { onClose(); onEdit(post); }} style={{
            flex:1, padding:"12px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", fontWeight:600,
            border:"1.5px solid #E8E8E8", background:"#fff",
            color:"#555", transition:"all 0.18s",
          }}>✏️ 수정</button>
          <button onClick={() => onDelete(post.id)} style={{
            flex:1, padding:"12px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", fontWeight:600,
            border:"1.5px solid #FFE0E0", background:"#FFF5F5",
            color:"#FF6B6B", transition:"all 0.18s",
          }}>🗑️ 삭제</button>
        </div>

        {/* ── 댓글 섹션 ── */}
        <div style={{ marginTop:"28px" }}>
          <div style={{ height:"1px", background:"#F0F0F0", marginBottom:"20px" }} />
          <p style={{ fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"14px" }}>
            💬 댓글 {comments.length > 0 ? comments.length : ""}
          </p>

          {/* 댓글 목록 */}
          {comments.length === 0 ? (
            <p style={{ fontSize:"13px", color:"#CCCCCC", textAlign:"center", padding:"16px 0 20px" }}>
              첫 댓글을 남겨보세요 👋
            </p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"2px", marginBottom:"16px" }}>
              {comments.map(c => (
                <div key={c.id} style={{
                  padding:"12px 14px", borderRadius:"12px",
                  background: c.replyTo ? "#F8F8F8" : "#FAFAFA",
                  borderLeft: c.replyTo ? "3px solid #E0E0E0" : "none",
                  marginLeft: c.replyTo ? "12px" : "0",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{
                        width:"26px", height:"26px", borderRadius:"999px",
                        background:"#111", color:"#fff",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"12px", fontWeight:700, flexShrink:0,
                      }}>{c.name[0]}</div>
                      <span style={{ fontSize:"13px", fontWeight:700, color:"#111" }}>{c.name}</span>
                      <span style={{ fontSize:"11px", color:"#CCCCCC" }}>{c.date}</span>
                    </div>
                    <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                      <button onClick={() => setReplyTo({ id:c.id, name:c.name })} style={{
                        border:"none", background:"none", cursor:"pointer",
                        fontSize:"11px", color:"#AAAAAA", fontWeight:600, padding:"2px 4px",
                      }}>↩ 답글</button>
                      <button onClick={() => onDeleteComment(post.id, c.id)} style={{
                        border:"none", background:"none", cursor:"pointer",
                        fontSize:"11px", color:"#DDDDDD", fontWeight:600, padding:"2px 4px",
                      }}>삭제</button>
                    </div>
                  </div>
                  {c.replyTo && (
                    <p style={{ fontSize:"11px", color:"#AAAAAA", margin:"0 0 4px" }}>@{c.replyTo} 에게</p>
                  )}
                  <p style={{ fontSize:"13px", color:"#444", lineHeight:1.65, margin:0 }}>{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* 답글 대상 표시 */}
          {replyTo && (
            <div style={{
              display:"flex", alignItems:"center", gap:"8px",
              padding:"7px 12px", background:"#F0F0F0", borderRadius:"8px",
              marginBottom:"8px", fontSize:"12px", color:"#666",
            }}>
              <span>↩ <b>{replyTo.name}</b>에게 답글 중</span>
              <button onClick={() => setReplyTo(null)} style={{
                border:"none", background:"none", cursor:"pointer",
                fontSize:"13px", color:"#AAAAAA", marginLeft:"auto", padding:"0 2px",
              }}>×</button>
            </div>
          )}

          {/* 댓글 입력 */}
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            <select
              value={commentName}
              onChange={e => setCommentName(e.target.value)}
              style={{
                padding:"10px 13px", borderRadius:"9px",
                border:"1.5px solid #EAEAEA", fontSize:"13px", outline:"none",
                color: commentName ? "#333" : "#AAAAAA",
                background:"#fff", cursor:"pointer", width:"100%",
                transition:"border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor="#111"}
              onBlur={e => e.target.style.borderColor="#EAEAEA"}
            >
              <option value="" disabled>이름 선택</option>
              {TEAM_MEMBERS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div style={{ display:"flex", gap:"8px" }}>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                placeholder="댓글을 입력하세요 (Enter로 등록)"
                rows={2}
                style={{
                  flex:1, padding:"10px 13px", borderRadius:"9px",
                  border:"1.5px solid #EAEAEA", fontSize:"13px",
                  outline:"none", resize:"none", lineHeight:1.6,
                  transition:"border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor="#111"}
                onBlur={e => e.target.style.borderColor="#EAEAEA"}
              />
              <button onClick={submitComment} style={{
                padding:"0 16px", borderRadius:"9px", border:"none",
                background:"#111", color:"#fff",
                fontSize:"13px", fontWeight:700, cursor:"pointer",
                transition:"background 0.15s", flexShrink:0,
              }}
              onMouseEnter={e => e.currentTarget.style.background="#333"}
              onMouseLeave={e => e.currentTarget.style.background="#111"}
              >등록</button>
            </div>
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

  const B_SECTIONS = [
    { id:"industry", label:"업계 소식",   emoji:"📰", color:"#D97706" },
    { id:"content",  label:"콘텐츠 소식", emoji:"🎬", color:"#7C3AED" },
    { id:"trend",    label:"트렌드 소식", emoji:"📈", color:"#059669" },
    { id:"request",  label:"제작 요청",   emoji:"✏️",  color:"#2563EB" },
  ];

  const initBlocks = () => {
    if (editPost?.bBlocks?.length) return editPost.bBlocks;
    // 각 섹션 헤더 + 빈 텍스트 블록으로 초기화
    const blocks = [];
    B_SECTIONS.forEach(s => {
      blocks.push({ id: Date.now() + Math.random(), type:"section", sectionId: s.id });
      blocks.push({ id: Date.now() + Math.random(), type:"text",    content:"" });
    });
    return blocks;
  };

  const [author,    setAuthor]    = useState(editPost?.author || "");
  const [date,      setDate]      = useState(editPost?.bDate  || today);
  const [blocks,    setBlocks]    = useState(initBlocks);
  const [errors,    setErrors]    = useState({});
  const [focusedId, setFocusedId] = useState(null);
  const [dragState, setDragState] = useState({ dragId:null, overIdx:null });

  const imgRef           = React.useRef();
  const vidRef           = React.useRef();
  const fileRef          = React.useRef();
  const insertAfterIdRef = React.useRef(null);
  const textareaRefs     = React.useRef({});
  const editorRef        = React.useRef();
  const dragRef          = React.useRef({ id:null, fromIdx:null, overIdx:null });

  // 첫 포커스
  useEffect(() => {
    const firstText = blocks.find(b => b.type === "text");
    if (firstText) setTimeout(() => textareaRefs.current[firstText.id]?.focus(), 80);
  }, []);

  const updateBlock = (id, val) =>
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, content: val } : b));
  const removeBlock = (id) =>
    setBlocks(bs => { const n = bs.filter(b => b.id !== id); return n.length ? n : [{ id:Date.now(), type:"text", content:"" }]; });

  const handleKeyDown = (e, block) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const ta = textareaRefs.current[block.id];
      const start = ta?.selectionStart ?? block.content.length;
      const newId = Date.now();
      setBlocks(bs => {
        const idx = bs.findIndex(b => b.id === block.id);
        const n = [...bs];
        n[idx] = { ...block, content: block.content.slice(0, start) };
        n.splice(idx + 1, 0, { id: newId, type:"text", content: block.content.slice(start) });
        return n;
      });
      setTimeout(() => { const t = textareaRefs.current[newId]; if(t){t.focus();t.setSelectionRange(0,0);} }, 20);
    }
    if (e.key === "Backspace" && block.content === "") {
      e.preventDefault();
      setBlocks(bs => {
        const idx = bs.findIndex(b => b.id === block.id);
        if (bs.length === 1) return bs;
        const n = bs.filter(b => b.id !== block.id);
        const prevId = n[Math.max(0, idx-1)]?.id;
        setTimeout(() => { const t = textareaRefs.current[prevId]; if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length);} }, 20);
        return n;
      });
    }
  };

  const insertMedia = (newBlocks) => {
    setBlocks(bs => {
      const afterId = insertAfterIdRef.current ?? focusedId ?? bs[bs.length-1]?.id;
      const idx = afterId ? bs.findIndex(b => b.id === afterId) : bs.length-1;
      const n = [...bs];
      n.splice(idx+1, 0, ...newBlocks, { id:Date.now()+9999, type:"text", content:"" });
      return n;
    });
    insertAfterIdRef.current = null;
    setTimeout(() => { const all = Object.values(textareaRefs.current).filter(Boolean); all[all.length-1]?.focus(); }, 50);
  };

  const handleImageFiles = e => {
    Promise.all(Array.from(e.target.files).map(f => new Promise(res => {
      const r = new FileReader(); r.onload = () => res({ id:Date.now()+Math.random(), type:"image", src:r.result, name:f.name }); r.readAsDataURL(f);
    }))).then(insertMedia); e.target.value = "";
  };
  const handleVideoFiles = e => {
    Promise.all(Array.from(e.target.files).map(f => new Promise(res => {
      const r = new FileReader(); r.onload = () => res({ id:Date.now()+Math.random(), type:"video", src:r.result, name:f.name }); r.readAsDataURL(f);
    }))).then(insertMedia); e.target.value = "";
  };
  const handleFileAttach = e => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id:Date.now()+Math.random(), type:"file", name:f.name, size:f.size, mime:f.type||"application/octet-stream", src:r.result });
      r.readAsDataURL(f);
    }))).then(insertMedia);
    e.target.value = "";
  };
  const handleEditorDrop = e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader(); const t = f.type.startsWith("image/") ? "image" : "video";
      r.onload = () => res({ id:Date.now()+Math.random(), type:t, src:r.result, name:f.name }); r.readAsDataURL(f);
    }))).then(insertMedia);
  };

  const handleSubmit = () => {
    const e = {};
    if (!author.trim()) e.author = "작성자를 선택해주세요";
    if (Object.keys(e).length) { setErrors(e); return; }
    const textBody = blocks.filter(b => b.type === "text").map(b => b.content).join("\n\n");
    onSubmit({
      id: editPost?.id || Date.now(),
      category:"b-letter", categoryLabel:"B레터",
      title:`B레터 ${date}`, emoji:"📰", tag:"B레터",
      author, date, bDate:date, bBlocks:blocks,
      body:textBody,
      summary:textBody.slice(0,80) + (textBody.length>80?"...":""),
      blocks:[], images:[], videos:[], url:"",
      likes:editPost?.likes||0, bookmarked:editPost?.bookmarked||false,
      liked:editPost?.liked||false, comments:editPost?.comments||[],
    });
    onClose();
  };

  return (
    <div style={{ position:"relative", minHeight:"100vh", background:"#fff", display:"flex", flexDirection:"column", fontFamily:"'Pretendard', -apple-system, sans-serif" }}>
      <input ref={imgRef}  type="file" accept="image/*" multiple onChange={handleImageFiles}  style={{ display:"none" }} />
      <input ref={vidRef}  type="file" accept="video/*" multiple onChange={handleVideoFiles}  style={{ display:"none" }} />
      <input ref={fileRef} type="file" multiple          onChange={handleFileAttach}           style={{ display:"none" }} />

      {/* 툴바 */}
      <div style={{ background:"#fff", borderBottom:"1px solid #EAEAEA", padding:"0 24px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <button type="button" onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", fontSize:"20px", color:"#888", padding:"4px" }}>←</button>
          <span style={{ fontSize:"15px", fontWeight:700, color:"#111" }}>{editPost ? "✏️ B레터 수정" : "📰 B레터 작성"}</span>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button type="button" onClick={() => { insertAfterIdRef.current = focusedId; imgRef.current.click(); }} style={{ padding:"7px 14px", borderRadius:"8px", border:"1px solid #E8E8E8", background:"#fff", color:"#555", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>🖼️ 사진</button>
          <button type="button" onClick={() => { insertAfterIdRef.current = focusedId; vidRef.current.click(); }} style={{ padding:"7px 14px", borderRadius:"8px", border:"1px solid #E8E8E8", background:"#fff", color:"#555", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>🎬 영상</button>
          <button type="button" onClick={() => { insertAfterIdRef.current = focusedId; fileRef.current.click(); }} style={{ padding:"7px 14px", borderRadius:"8px", border:"1px solid #E8E8E8", background:"#fff", color:"#555", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>📎 파일</button>
          <button type="button" onClick={handleSubmit} style={{ padding:"8px 20px", borderRadius:"9px", border:"none", background:"#D97706", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>{editPost ? "수정 완료 →" : "등록하기 →"}</button>
        </div>
      </div>

      {/* 에디터 */}
      <div ref={editorRef} style={{ flex:1, overflowY:"auto", display:"flex", justifyContent:"center" }} onDragOver={e=>e.preventDefault()} onDrop={handleEditorDrop}
        onPaste={e => {
          const items = Array.from(e.clipboardData?.items || []);
          const imageItems = items.filter(item => item.type.startsWith("image/"));
          if (imageItems.length === 0) return;
          e.preventDefault();
          Promise.all(imageItems.map(item => new Promise(res => {
            const file = item.getAsFile(); if (!file) return res(null);
            const r = new FileReader();
            r.onload = () => res({ id:Date.now()+Math.random(), type:"image", src:r.result, name:`붙여넣기_${Date.now()}.png` });
            r.readAsDataURL(file);
          }))).then(newBlocks => { const valid = newBlocks.filter(Boolean); if (valid.length) insertMedia(valid); });
        }}
      >
        <div style={{ width:"100%", maxWidth:"720px", padding:"40px 24px 120px", position:"relative" }}>

          {/* ── 서식 툴바 ── */}
          <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"16px", padding:"8px 12px", background:"#F8F8F6", borderRadius:"10px", border:"1px solid #EAEAEA", alignItems:"center" }}>
            <button type="button" title="굵게" onClick={() => {
              const ta = textareaRefs.current[focusedId]; if (!ta) return;
              const s=ta.selectionStart, e2=ta.selectionEnd, v=ta.value;
              const sel=v.slice(s,e2);
              if (sel) updateBlock(focusedId, v.slice(0,s)+"**"+sel+"**"+v.slice(e2));
            }} style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"#333" }}>B</button>
            <button type="button" title="기울임" onClick={() => {
              const ta = textareaRefs.current[focusedId]; if (!ta) return;
              const s=ta.selectionStart, e2=ta.selectionEnd, v=ta.value;
              const sel=v.slice(s,e2);
              if (sel) updateBlock(focusedId, v.slice(0,s)+"_"+sel+"_"+v.slice(e2));
            }} style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", fontStyle:"italic", fontSize:"13px", cursor:"pointer", color:"#333" }}>I</button>
            <button type="button" title="밑줄" onClick={() => {
              const ta = textareaRefs.current[focusedId]; if (!ta) return;
              const s=ta.selectionStart, e2=ta.selectionEnd, v=ta.value;
              const sel=v.slice(s,e2);
              if (sel) updateBlock(focusedId, v.slice(0,s)+"<u>"+sel+"</u>"+v.slice(e2));
            }} style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", textDecoration:"underline", fontSize:"13px", cursor:"pointer", color:"#333" }}>U</button>
            <div style={{ width:"1px", height:"20px", background:"#E0E0E0", margin:"0 4px" }} />
            {[["S","13px"],["M","15px"],["L","18px"],["XL","22px"]].map(([lbl,sz]) => (
              <button key={lbl} type="button" title={"글자 크기 "+lbl}
                onClick={() => {
                  const sizeMap={"S":"13px","M":"15px","L":"18px","XL":"22px"};
                  setBlocks(bs => bs.map(b => b.id===focusedId ? {...b, fontSize:sizeMap[lbl]} : b));
                }}
                style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", padding:"0 7px", height:"28px", fontSize:"11px", fontWeight:600, cursor:"pointer", color:"#555" }}>{lbl}</button>
            ))}
            <div style={{ width:"1px", height:"20px", background:"#E0E0E0", margin:"0 4px" }} />
            {[["left","◀"],["center","◆"],["right","▶"]].map(([align, ico]) => (
              <button key={align} type="button" title={align+" 정렬"}
                onClick={() => setBlocks(bs => bs.map(b => b.id===focusedId ? {...b, textAlign:align} : b))}
                style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", fontSize:"11px", cursor:"pointer", color:"#555" }}>
                {align==="left"?"≡":align==="center"?"≡":"≡"}
              </button>
            ))}
          </div>

          {/* 날짜 + 작성자 */}
          <div style={{ display:"flex", gap:"12px", alignItems:"center", marginBottom:"20px" }}>
            <input value={date} onChange={e=>setDate(e.target.value)} style={{ border:"none", background:"none", fontSize:"14px", color:"#888", outline:"none", width:"80px" }} />
            <div style={{ width:"1px", height:"16px", background:"#E8E8E8" }} />
            <select value={author} onChange={e=>setAuthor(e.target.value)} style={{ border:"none", background:"none", fontSize:"13px", color:author?"#333":"#AAAAAA", outline:"none", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}>
              <option value="" disabled>작성자 선택</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.author && <span style={{ fontSize:"12px", color:"#FF6B6B" }}>{errors.author}</span>}
          </div>
          <div style={{ height:"1px", background:"#F0F0F0", marginBottom:"24px" }} />

          {/* 블록 목록 */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            {blocks.map((block, idx) => {
              const isDragging = dragState.dragId === block.id;
              const isOver = dragState.overIdx === idx && dragState.dragId !== block.id;

              const onHandleMouseDown = (e) => {
                if (block.type === "section") return;
                e.preventDefault();
                dragRef.current = { id:block.id, fromIdx:idx, overIdx:idx };
                setDragState({ dragId:block.id, overIdx:idx });
                const onMove = mv => {
                  const rows = Array.from(editorRef.current?.querySelectorAll('[data-block-row]') || []);
                  let closest = idx, minDist = Infinity;
                  rows.forEach((row,i) => { const rect=row.getBoundingClientRect(); const dist=Math.abs(mv.clientY-(rect.top+rect.height/2)); if(dist<minDist){minDist=dist;closest=i;} });
                  if (dragRef.current.overIdx !== closest) { dragRef.current.overIdx=closest; setDragState(s=>({...s,overIdx:closest})); }
                };
                const onUp = () => {
                  window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp);
                  const {id,overIdx} = dragRef.current;
                  if (id && overIdx!==null) setBlocks(bs => { const from=bs.findIndex(b=>b.id===id); if(from===overIdx)return bs; const n=[...bs]; const [m]=n.splice(from,1); n.splice(overIdx,0,m); return n; });
                  dragRef.current={id:null,fromIdx:null,overIdx:null}; setDragState({dragId:null,overIdx:null});
                };
                window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
              };

              // 섹션 헤더 블록
              if (block.type === "section") {
                const sec = B_SECTIONS.find(s => s.id === block.sectionId) || B_SECTIONS[0];
                return (
                  <div key={block.id} data-block-row={idx} style={{ margin:"28px 0 16px", display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ flex:1, height:"1.5px", background:"#EBEBEB" }} />
                    <div style={{ padding:"6px 20px", borderRadius:"999px", border:`2px solid ${sec.color}`, fontSize:"13px", fontWeight:700, color:sec.color, whiteSpace:"nowrap", background:"#fff" }}>
                      {sec.emoji} {sec.label}
                    </div>
                    <div style={{ flex:1, height:"1.5px", background:"#EBEBEB" }} />
                  </div>
                );
              }

              return (
                <div key={block.id} data-block-row={idx} style={{ position:"relative", display:"flex", alignItems:"flex-start", gap:"6px", opacity:isDragging?0.3:1, transition:"opacity 0.12s", borderTop:isOver?"2.5px solid #111":"2.5px solid transparent", paddingTop:isOver?"6px":"0" }}>
                  {/* 드래그 핸들 */}
                  {block.type === "text" && (
                    <div onMouseDown={onHandleMouseDown} style={{ flexShrink:0, width:"18px", paddingTop:"6px", cursor:"grab", userSelect:"none", color:"#CCCCCC", fontSize:"14px", lineHeight:1, opacity:isDragging?1:0, transition:"opacity 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>{if(dragState.dragId!==block.id)e.currentTarget.style.opacity="0";}}>⠿</div>
                  )}
                  {block.type !== "text" && <div style={{ width:"18px", flexShrink:0 }} />}

                  <div style={{ flex:1, minWidth:0 }}
                    onMouseEnter={e=>{ if(block.type!=="text")return; const h=e.currentTarget.previousSibling; if(h)h.style.opacity="1"; }}
                    onMouseLeave={e=>{ if(block.type!=="text")return; const h=e.currentTarget.previousSibling; if(h&&dragState.dragId!==block.id)h.style.opacity="0"; }}
                  >
                    {block.type === "text" && (
                      <textarea ref={el=>textareaRefs.current[block.id]=el} value={block.content}
                        onChange={e=>{ updateBlock(block.id,e.target.value); e.target.style.height="auto"; e.target.style.height=e.target.scrollHeight+"px"; }}
                        onKeyDown={e=>handleKeyDown(e,block)} onFocus={()=>setFocusedId(block.id)} onBlur={()=>setFocusedId(p=>p===block.id?null:p)}
                        placeholder="" rows={1}
                        style={{ width:"100%", border:"none", background:"none", fontSize:block.fontSize||"15px", lineHeight:1.9, color:"#333", outline:"none", resize:"none", padding:"2px 0", overflow:"hidden", minHeight:"28px", display:"block", textAlign:block.textAlign||"left" }}
                      />
                    )}
                    {block.type === "image" && (
                      <div onMouseDown={onHandleMouseDown} onDragStart={e=>e.preventDefault()} style={{ margin:"8px 0", borderRadius:"14px", overflow:"hidden", background:"#F0F0EE", outline:isOver?"2.5px solid #111":"2px solid transparent", transition:"outline 0.15s", position:"relative", cursor:isDragging?"grabbing":"grab", userSelect:"none" }}>
                        <img src={block.src} alt={block.name} draggable="false" onDragStart={e=>e.preventDefault()} style={{ width:"100%", display:"block", maxHeight:"500px", objectFit:"contain", pointerEvents:"none" }} />
                        <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={()=>removeBlock(block.id)} style={{ position:"absolute", top:"10px", right:"10px", width:"28px", height:"28px", border:"none", borderRadius:"7px", background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:"13px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                      </div>
                    )}
                    {block.type === "video" && (
                      <div onMouseDown={e=>{ if(e.target.tagName==="VIDEO")return; onHandleMouseDown(e); }} style={{ margin:"8px 0", borderRadius:"14px", overflow:"hidden", background:"#111", outline:isOver?"2.5px solid #111":"2px solid transparent", transition:"outline 0.15s", position:"relative", cursor:isDragging?"grabbing":"grab", userSelect:"none" }}>
                        <video src={block.src} controls style={{ width:"100%", maxHeight:"420px", display:"block" }} />
                        <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={()=>removeBlock(block.id)} style={{ position:"absolute", top:"10px", right:"10px", width:"28px", height:"28px", border:"none", borderRadius:"7px", background:"rgba(220,50,50,0.82)", color:"#fff", fontSize:"13px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                      </div>
                    )}
                    {block.type === "file" && (() => {
                      const ext=block.name.split(".").pop().toLowerCase();
                      const iconMap={zip:"🗜️",rar:"🗜️","7z":"🗜️",pdf:"📄",doc:"📝",docx:"📝",xls:"📊",xlsx:"📊",ppt:"📊",pptx:"📊",txt:"📃",csv:"📃",mp3:"🎵",wav:"🎵"};
                      const icon=iconMap[ext]||"📎";
                      const sizeStr=block.size>1024*1024?`${(block.size/1024/1024).toFixed(2)} MB`:`${(block.size/1024).toFixed(1)} KB`;
                      return (
                        <div onMouseDown={onHandleMouseDown} style={{ margin:"8px 0", borderRadius:"12px", border:"1.5px solid #E8E8E8", background:"#FAFAFA", padding:"14px 16px", display:"flex", alignItems:"center", gap:"14px", cursor:isDragging?"grabbing":"grab", userSelect:"none", position:"relative", outline:isOver?"2px solid #111":"none" }}>
                          <div style={{ width:"44px", height:"44px", borderRadius:"10px", background:"#F0F0F0", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>{icon}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:"14px", fontWeight:600, color:"#111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{block.name}</p>
                            <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#AAA" }}>{sizeStr} · {ext.toUpperCase()}</p>
                          </div>
                          <a href={block.src} download={block.name} onMouseDown={e=>e.stopPropagation()} style={{ padding:"7px 14px", borderRadius:"8px", border:"1.5px solid #E8E8E8", background:"#fff", color:"#555", fontSize:"12px", fontWeight:600, textDecoration:"none", flexShrink:0 }}>다운로드</a>
                          <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={()=>removeBlock(block.id)} style={{ width:"26px", height:"26px", border:"none", borderRadius:"6px", background:"#F0F0F0", color:"#AAA", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ minHeight:"80px", cursor:"text" }} onClick={()=>{ const last=[...blocks].reverse().find(b=>b.type==="text"); if(last)textareaRefs.current[last.id]?.focus(); }} />
        </div>
      </div>
    </div>
  );
}


/* ── WRITE MODAL ── 단일 편집 영역, 미디어 삽입 방식 */
function WriteModal({ onClose, onSubmit, editPost, writeCategory }) {
  // blocks = [{id, type:"text"|"image"|"video", content/src/name}]
  // 텍스트 블록은 항상 미디어 블록 사이에 존재
  const initBlocks = () => {
    if (editPost?.blocks?.length) return editPost.blocks;
    if (editPost?.body) return [{ id: Date.now(), type:"text", content: editPost.body }];
    return [{ id: Date.now(), type:"text", content:"" }];
  };

  const [category, setCategory] = useState(editPost?.category || (typeof writeCategory !== 'undefined' && writeCategory) || "ai-trend");
  const [title,    setTitle]    = useState(editPost?.title    || "");
  const [emoji,    setEmoji]    = useState(editPost?.emoji    || "📝");
  const [tag,      setTag]      = useState(editPost?.tag      || "");
  const [author,   setAuthor]   = useState(editPost?.author   || "");
  const [blocks,   setBlocks]   = useState(initBlocks);
  const [errors,   setErrors]   = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [aiLoading,setAiLoading]= useState(false);
  const [focusedId,setFocusedId]= useState(null);
  const [dragState, setDragState] = useState({ dragId:null, overIdx:null }); // 드래그 상태
  const [floatBar, setFloatBar]   = useState(null); // { top, left, blockId, selStart, selEnd, selectedText }
  const [formatBar] = useState(true); // 항상 표시되는 서식 툴바

  const imgRef           = React.useRef();
  const vidRef           = React.useRef();
  const fileRef          = React.useRef();
  const insertAfterIdRef = React.useRef(null);
  const textareaRefs     = React.useRef({});
  const editorRef        = React.useRef();
  const dragRef          = React.useRef({ id:null, fromIdx:null, overIdx:null, ghost:null });

  // 임시저장 키
  const draftKey = author ? `ai-weekly-draft-${author}` : null;

  // 작성자 선택 시 해당 인물의 임시저장 불러오기
  useEffect(() => {
    if (!author || editPost) return;
    try {
      const saved = localStorage.getItem(`ai-weekly-draft-${author}`);
      if (saved) {
        const draft = JSON.parse(saved);
        if (window.confirm(`${author}님의 임시저장 글이 있어요.\n"${draft.title || '(제목 없음)'}"\n\n불러올까요?`)) {
          if (draft.title)    setTitle(draft.title);
          if (draft.emoji)    setEmoji(draft.emoji);
          if (draft.tag)      setTag(draft.tag);
          if (draft.category) setCategory(draft.category);
          if (draft.blocks)   setBlocks(draft.blocks);
        }
      }
    } catch {}
  }, [author]);

  // 내용 바뀔 때마다 자동 임시저장 (작성자 선택된 경우만)
  useEffect(() => {
    if (!author || editPost) return;
    const key = `ai-weekly-draft-${author}`;
    const timer = setTimeout(() => {
      try {
        const hasContent = title.trim() || blocks.some(b => b.type !== "text" || b.content.trim());
        if (hasContent) {
          localStorage.setItem(key, JSON.stringify({ title, emoji, tag, category, blocks: blocks.map(b => b.type === "file" ? { ...b, src: "" } : b) }));
          setLastSaved(new Date());
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, emoji, tag, category, blocks, author]);

  // 페이지 진입 시 첫 텍스트에 자동 포커스
  useEffect(() => {
    const firstText = blocks.find(b => b.type === "text");
    if (firstText) {
      setTimeout(() => {
        const ta = textareaRefs.current[firstText.id];
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      }, 80);
    }
  }, []);

  /* 블록 조작 */
  const updateBlock = (id, val) =>
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, content: val } : b));

  const removeBlock = (id) =>
    setBlocks(bs => {
      const next = bs.filter(b => b.id !== id);
      // 미디어 블록 제거 후 인접 텍스트 병합
      return next.length ? next : [{ id: Date.now(), type:"text", content:"" }];
    });

  const moveBlock = (id, dir) =>
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id);
      if (i + dir < 0 || i + dir >= bs.length) return bs;
      const n = [...bs];
      [n[i], n[i+dir]] = [n[i+dir], n[i]];
      return n;
    });

  /* Enter → 현재 블록 뒤에 텍스트 블록 삽입 */
  const handleKeyDown = (e, block) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const ta    = textareaRefs.current[block.id];
      const start = ta?.selectionStart ?? block.content.length;
      const before = block.content.slice(0, start);
      const after  = block.content.slice(start);
      // 현재 블록은 커서 앞 내용만, 새 블록은 커서 뒤 내용
      const newId = Date.now();
      setBlocks(bs => {
        const idx = bs.findIndex(b => b.id === block.id);
        const n   = [...bs];
        n[idx] = { ...block, content: before };
        n.splice(idx + 1, 0, { id: newId, type:"text", content: after });
        return n;
      });
      setTimeout(() => {
        const newTa = textareaRefs.current[newId];
        if (newTa) { newTa.focus(); newTa.setSelectionRange(0, 0); }
      }, 20);
    }
    if (e.key === "Backspace" && block.content === "") {
      e.preventDefault();
      setBlocks(bs => {
        const idx = bs.findIndex(b => b.id === block.id);
        if (bs.length === 1) return bs;
        const n   = bs.filter(b => b.id !== block.id);
        const prevId = n[Math.max(0, idx - 1)]?.id;
        setTimeout(() => {
          const prevTa = textareaRefs.current[prevId];
          if (prevTa) { prevTa.focus(); prevTa.setSelectionRange(prevTa.value.length, prevTa.value.length); }
        }, 20);
        return n;
      });
    }
  };

  /* 미디어 삽입: focusedId 블록 바로 뒤에 삽입, 그 뒤에 빈 텍스트 블록 자동 생성 */
  const insertMedia = (newMediaBlocks) => {
    setBlocks(bs => {
      const afterId = insertAfterIdRef.current ?? focusedId ?? bs[bs.length - 1]?.id;
      const idx = afterId ? bs.findIndex(b => b.id === afterId) : bs.length - 1;
      const n   = [...bs];
      // 삽입 위치 뒤에 미디어 + 빈 텍스트 추가
      const toInsert = [
        ...newMediaBlocks,
        { id: Date.now() + 9999, type:"text", content:"" }
      ];
      n.splice(idx + 1, 0, ...toInsert);
      return n;
    });
    insertAfterIdRef.current = null;
    // 새 빈 텍스트에 포커스
    setTimeout(() => {
      const allTa = Object.values(textareaRefs.current).filter(Boolean);
      const last  = allTa[allTa.length - 1];
      last?.focus();
    }, 50);
  };

  const handleImageFiles = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id: Date.now() + Math.random(), type:"image", src: r.result, name: f.name });
      r.readAsDataURL(f);
    }))).then(insertMedia);
    e.target.value = "";
  };

  const handleVideoFiles = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id: Date.now() + Math.random(), type:"video", src: r.result, name: f.name });
      r.readAsDataURL(f);
    }))).then(insertMedia);
    e.target.value = "";
  };

  /* 에디터 영역 드래그 앤 드롭 */
  const handleEditorDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files)
      .filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      const t = f.type.startsWith("image/") ? "image" : "video";
      r.onload = () => res({ id: Date.now() + Math.random(), type: t, src: r.result, name: f.name });
      r.readAsDataURL(f);
    }))).then(insertMedia);
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id:Date.now()+Math.random(), type:"file", name:f.name, size:f.size, mime:f.type||"application/octet-stream", src:r.result });
      r.readAsDataURL(f);
    }))).then(insertMedia);
    e.target.value = "";
  };

  /* AI 자동완성 */
  const autoFill = async () => {
    if (!title.trim()) { setErrors({ title:"제목을 먼저 입력해주세요" }); return; }
    setAiLoading(true);
    try {
      const catLabel = CATEGORIES.find(c => c.id === category)?.label || "";
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:`AI 팀 뉴스레터. 카테고리:[${catLabel}] 제목:"${title}"
JSON만 반환:
{"body":"200~280자 본문(개행가능)","emoji":"이모지1개","tag":"태그(공백없이)"}` }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.map(b => b.text||"").join("") || "";
      const p    = JSON.parse(text.replace(/```json|```/g,"").trim());
      if (p.body) setBlocks([{ id: Date.now(), type:"text", content: p.body }]);
      if (p.emoji) setEmoji(p.emoji);
      if (p.tag)   setTag(p.tag);
    } catch { setErrors({ general:"AI 자동완성 중 오류가 발생했어요" }); }
    setAiLoading(false);
  };

  /* 등록 */
  const handleSubmit = () => {
    const e = {};
    if (!title.trim())  e.title  = "제목을 입력해주세요";
    if (!author.trim()) e.author = "작성자를 입력해주세요";
    if (Object.keys(e).length) { setErrors(e); return; }
    const textBody = blocks.filter(b => b.type==="text").map(b => b.content).join("\n\n") +
      blocks.filter(b => b.type==="toggle").map(b => {
        const child = blocks.find(c => c.parentId === b.id);
        return `${b.title}\n${child?.content || ""}`;
      }).join("\n\n");
    onSubmit({
      blocks, category, title, emoji, tag, author,
      body:    textBody,
      summary: textBody.slice(0, 80) + (textBody.length > 80 ? "..." : ""),
      images:  blocks.filter(b => b.type==="image"),
      videos:  blocks.filter(b => b.type==="video"),
      files:   blocks.filter(b => b.type==="file"),
      url: editPost?.url || "",
      id:  editPost?.id  || Date.now(),
      categoryLabel: CATEGORIES.find(c => c.id === category)?.label || "",
      date:      editPost?.date      || new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,""),
      likes:     editPost?.likes     || 0,
      bookmarked:editPost?.bookmarked|| false,
      liked:     editPost?.liked     || false,
      comments:  editPost?.comments  || [],
    });
    // 등록 완료 시 임시저장 삭제
    if (author) {
      try { localStorage.removeItem(`ai-weekly-draft-${author}`); } catch {}
    }
    onClose();
  };

  const cs = CAT_STYLE[category];

  return (
    <div style={{
      position:"relative", minHeight:"100vh", background:"#fff",
      display:"flex", flexDirection:"column",
      fontFamily:"'Pretendard', -apple-system, sans-serif",
    }}>
      <input ref={imgRef} type="file" accept="image/*,.gif" multiple onChange={handleImageFiles} style={{ display:"none" }} />
      <input ref={vidRef} type="file" accept="video/*" multiple onChange={handleVideoFiles} style={{ display:"none" }} />
      <input ref={fileRef} type="file" multiple onChange={handleFileAttach} style={{ display:"none" }} />

      {/* ── 상단 툴바 (모바일 대응) ── */}
      <div style={{
        background:"#fff", borderBottom:"1px solid #EAEAEA",
        padding:"0 16px", minHeight:"56px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexShrink:0, position:"sticky", top:0, zIndex:10, flexWrap:"wrap", gap:"8px",
      }}>
        {/* 왼쪽: 뒤로 + 제목 */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <button type="button" onClick={onClose} style={{
            border:"none", background:"none", cursor:"pointer",
            fontSize:"20px", color:"#888", padding:"4px",
          }}>←</button>
          <span style={{ fontSize:"14px", fontWeight:700, color:"#111" }}>
            {editPost ? "카드 수정" : "새 카드 작성"}
          </span>
          {lastSaved && (
            <span style={{ fontSize:"11px", color:"#AAAAAA" }}>
              ✓ {lastSaved.getHours().toString().padStart(2,"0")}:{lastSaved.getMinutes().toString().padStart(2,"0")} 저장
            </span>
          )}
        </div>
        {/* 오른쪽: 미디어 버튼 + 등록 */}
        <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"nowrap" }}>
          <button type="button" onClick={() => { insertAfterIdRef.current = focusedId; imgRef.current.click(); }} style={{
            padding:"7px 10px", borderRadius:"8px", border:"1px solid #E8E8E8",
            background:"#fff", fontSize:"16px", cursor:"pointer",
          }}>🖼️</button>
          <button type="button" onClick={() => { insertAfterIdRef.current = focusedId; vidRef.current.click(); }} style={{
            padding:"7px 10px", borderRadius:"8px", border:"1px solid #E8E8E8",
            background:"#fff", fontSize:"16px", cursor:"pointer",
          }}>🎬</button>
          <button type="button" onClick={() => { insertAfterIdRef.current = focusedId; fileRef.current.click(); }} style={{
            padding:"7px 10px", borderRadius:"8px", border:"1px solid #E8E8E8",
            background:"#fff", fontSize:"16px", cursor:"pointer",
          }}>📎</button>
          <button type="button" onClick={autoFill} disabled={aiLoading} style={{
            padding:"7px 10px", borderRadius:"8px", border:"1.5px dashed #D0D0D0",
            background:"#FAFAFA", fontSize:"16px", cursor: aiLoading ? "not-allowed" : "pointer",
            opacity: aiLoading ? 0.5 : 1,
          }}>✨</button>
          <button type="button" onClick={handleSubmit} style={{
            padding:"8px 16px", borderRadius:"9px", border:"none",
            background:"#111", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer",
          }}>{editPost ? "완료" : "등록 →"}</button>
        </div>
      </div>

      {/* ── 메인 에디터 영역 ── */}
      <div
        ref={editorRef}
        style={{ flex:1, overflowY:"auto", display:"flex", justifyContent:"center" }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleEditorDrop}
        onPaste={e => {
          const items = Array.from(e.clipboardData?.items || []);
          const imageItems = items.filter(item => item.type.startsWith("image/"));
          if (imageItems.length === 0) return; // 텍스트 붙여넣기는 그대로
          e.preventDefault();
          Promise.all(imageItems.map(item => new Promise(res => {
            const file = item.getAsFile();
            if (!file) return res(null);
            const r = new FileReader();
            r.onload = () => res({
              id: Date.now() + Math.random(),
              type: "image",
              src: r.result,
              name: `붙여넣기_${Date.now()}.png`,
            });
            r.readAsDataURL(file);
          }))).then(newBlocks => {
            const valid = newBlocks.filter(Boolean);
            if (!valid.length) return;
            insertMedia(valid);
          });
        }}
      >
        <div style={{ width:"100%", maxWidth:"720px", padding:"40px 24px 120px" }}>

          {/* 메타 정보 */}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px", alignItems:"center" }}>
            <select value={author} onChange={e => setAuthor(e.target.value)}
              style={{
                border:"1.5px solid #E8E8E8", background:"#fff",
                fontSize:"13px", color: author ? "#333" : "#AAAAAA",
                outline:"none", cursor:"pointer",
                padding:"6px 10px", borderRadius:"8px",
                minWidth:"100px",
              }}>
              <option value="" disabled>작성자 선택</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.author && <span style={{ fontSize:"12px", color:"#FF6B6B" }}>{errors.author}</span>}
          </div>

          {/* ── 서식 툴바 ── */}
          <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"16px", padding:"8px 12px", background:"#F8F8F6", borderRadius:"10px", border:"1px solid #EAEAEA", alignItems:"center" }}>
            {/* 굵기 */}
            <button type="button" title="굵게 (선택한 텍스트에 **적용**)" onClick={() => {
              const ta = textareaRefs.current[focusedId]; if (!ta) return;
              const s=ta.selectionStart, e2=ta.selectionEnd, v=ta.value;
              const sel = v.slice(s,e2);
              const newV = sel ? v.slice(0,s)+"**"+sel+"**"+v.slice(e2) : v;
              updateBlock(focusedId, newV);
            }} style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", fontWeight:700, fontSize:"13px", cursor:"pointer", color:"#333" }}>B</button>
            {/* 이탤릭 */}
            <button type="button" title="기울임" onClick={() => {
              const ta = textareaRefs.current[focusedId]; if (!ta) return;
              const s=ta.selectionStart, e2=ta.selectionEnd, v=ta.value;
              const sel=v.slice(s,e2);
              if (sel) updateBlock(focusedId, v.slice(0,s)+"_"+sel+"_"+v.slice(e2));
            }} style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", fontStyle:"italic", fontSize:"13px", cursor:"pointer", color:"#333" }}>I</button>
            {/* 밑줄 */}
            <button type="button" title="밑줄" onClick={() => {
              const ta = textareaRefs.current[focusedId]; if (!ta) return;
              const s=ta.selectionStart, e2=ta.selectionEnd, v=ta.value;
              const sel=v.slice(s,e2);
              if (sel) updateBlock(focusedId, v.slice(0,s)+"<u>"+sel+"</u>"+v.slice(e2));
            }} style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", textDecoration:"underline", fontSize:"13px", cursor:"pointer", color:"#333" }}>U</button>
            <div style={{ width:"1px", height:"20px", background:"#E0E0E0", margin:"0 4px" }} />
            {/* 텍스트 크기 */}
            {[["S","13px"],["M","15px"],["L","18px"],["XL","22px"]].map(([lbl,sz]) => (
              <button key={lbl} type="button" title={`글자 크기 ${lbl}`}
                onClick={() => {
                  const ta = textareaRefs.current[focusedId]; if (!ta) return;
                  const sizeMap={"S":"13px","M":"15px","L":"18px","XL":"22px"};
                  // block의 fontSize 메타 설정
                  setBlocks(bs => bs.map(b => b.id===focusedId ? {...b, fontSize: sizeMap[lbl]} : b));
                }}
                style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", padding:"0 7px", height:"28px", fontSize:"11px", fontWeight:600, cursor:"pointer", color:"#555" }}>{lbl}</button>
            ))}
            <div style={{ width:"1px", height:"20px", background:"#E0E0E0", margin:"0 4px" }} />
            {/* 정렬 */}
            {[["≡","left","왼쪽"],["≡","center","가운데"],["≡","right","오른쪽"]].map(([ico,align,title2],ai) => (
              <button key={align} type="button" title={title2+" 정렬"}
                onClick={() => setBlocks(bs => bs.map(b => b.id===focusedId ? {...b, textAlign:align} : b))}
                style={{ border:"1px solid #E0E0E0", background:"#fff", borderRadius:"6px", width:"30px", height:"28px", fontSize:"15px", cursor:"pointer", color:"#555",
                  letterSpacing: align==="center"?"1px":align==="right"?"2px":"0" }}>
                {align==="left"?"≡":align==="center"?"≡":align==="right"?"≡":"≡"}
              </button>
            ))}
          </div>

          {/* 제목 */}
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            style={{
              width:"100%", border:"none", background:"none",
              fontSize:"28px", fontWeight:700, lineHeight:1.3, color:"#111",
              outline:"none", marginBottom:"6px",
              borderBottom: errors.title ? "2px solid #FF6B6B" : "none",
              paddingBottom:"6px",
            }} />
          {errors.title  && <p style={{ fontSize:"12px", color:"#FF6B6B", margin:"0 0 6px" }}>{errors.title}</p>}
          {errors.general&& <p style={{ fontSize:"12px", color:"#FF6B6B", margin:"0 0 6px" }}>{errors.general}</p>}

          <div style={{ height:"1px", background:"#F0F0F0", margin:"16px 0 20px" }} />

          {/* ── 플로팅 텍스트 툴바 (텍스트 선택 시) ── */}
          {floatBar && (
            <div style={{ position:"absolute", left: floatBar.left, top: floatBar.top, zIndex:100, display:"flex", gap:"2px", background:"#1A1A1A", borderRadius:"9px", padding:"5px 7px", boxShadow:"0 6px 20px rgba(0,0,0,0.3)", animation:"fadeIn 0.12s ease" }}>
              {[
                { label:"▸ 접기", action: () => {
                  const { blockId, selStart, selEnd, selectedText } = floatBar;
                  const block = blocks.find(b => b.id === blockId);
                  if (!block) return;
                  const expandId = Date.now(), bodyId = Date.now()+1;
                  setBlocks(bs => {
                    const idx = bs.findIndex(b => b.id === blockId);
                    const n = [...bs];
                    n[idx] = { ...block, content: block.content.slice(0, selStart) };
                    const ins = [
                      { id:expandId, type:"expand", title:selectedText, open:false },
                      { id:bodyId,   type:"expand-body", content:"", parentId:expandId },
                    ];
                    const after = block.content.slice(selEnd);
                    if (after) ins.push({ id:Date.now()+2, type:"text", content:after });
                    n.splice(idx+1, 0, ...ins);
                    return n;
                  });
                  setFloatBar(null);
                }},
              ].map((btn, i) => (
                <button key={i} type="button" onMouseDown={e => { e.preventDefault(); btn.action(); }}
                  style={{ border:"none", background:"none", color:"#fff", fontSize:"12px", fontWeight:600, cursor:"pointer", padding:"3px 9px", borderRadius:"6px", whiteSpace:"nowrap" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
                  onMouseLeave={e => e.currentTarget.style.background="none"}
                >{btn.label}</button>
              ))}
            </div>
          )}

          {/* ── 블록 목록 (핸들 드래그) ── */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            {blocks.map((block, idx) => {
              const isDragging = dragState.dragId === block.id;
              const isOver     = dragState.overIdx === idx && dragState.dragId !== block.id;

              /* 핸들 mousedown → 드래그 시작 */
              const onHandleMouseDown = (e) => {
                e.preventDefault();
                const fromIdx = idx;
                dragRef.current.id      = block.id;
                dragRef.current.fromIdx = fromIdx;
                dragRef.current.overIdx = fromIdx;
                setDragState({ dragId: block.id, overIdx: fromIdx });

                const onMove = (mv) => {
                  // 에디터 내 모든 블록 DOM 요소의 y 위치로 overIdx 계산
                  const editorEl = editorRef.current;
                  if (!editorEl) return;
                  const rows = Array.from(editorEl.querySelectorAll('[data-block-row]'));
                  let closest = fromIdx;
                  let minDist = Infinity;
                  rows.forEach((row, i) => {
                    const rect = row.getBoundingClientRect();
                    const mid  = rect.top + rect.height / 2;
                    const dist = Math.abs(mv.clientY - mid);
                    if (dist < minDist) { minDist = dist; closest = i; }
                  });
                  if (dragRef.current.overIdx !== closest) {
                    dragRef.current.overIdx = closest;
                    setDragState(s => ({ ...s, overIdx: closest }));
                  }
                };

                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                  const { id, overIdx } = dragRef.current;
                  if (id && overIdx !== null) {
                    setBlocks(bs => {
                      const from = bs.findIndex(b => b.id === id);
                      const to   = overIdx;
                      if (from === to) return bs;
                      const n = [...bs];
                      const [moved] = n.splice(from, 1);
                      n.splice(to, 0, moved);
                      return n;
                    });
                  }
                  dragRef.current = { id:null, fromIdx:null, overIdx:null };
                  setDragState({ dragId:null, overIdx:null });
                };

                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              };

              return (
                <div
                  key={block.id}
                  data-block-row={idx}
                  style={{
                    position:"relative",
                    display:"flex",
                    alignItems:"flex-start",
                    gap:"6px",
                    opacity: isDragging ? 0.3 : 1,
                    transition:"opacity 0.12s",
                    borderTop: isOver ? "2.5px solid #111" : "2.5px solid transparent",
                    paddingTop: isOver ? "6px" : "0",
                  }}
                >
                  {/* ── 드래그 핸들 (텍스트 블록용 — 미디어는 본체로 드래그) ── */}
                  {block.type === "text" && (
                    <div
                      onMouseDown={onHandleMouseDown}
                      title="드래그해서 순서 변경"
                      style={{
                        flexShrink:0, width:"18px",
                        paddingTop:"6px",
                        cursor:"grab", userSelect:"none",
                        color:"#CCCCCC", fontSize:"14px", lineHeight:1,
                        opacity: isDragging ? 1 : 0,
                        transition:"opacity 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity="1"}
                      onMouseLeave={e => { if (dragState.dragId !== block.id) e.currentTarget.style.opacity="0"; }}
                    >⠿</div>
                  )}
                  {block.type !== "text" && <div style={{ width:"18px", flexShrink:0 }} />}

                  {/* ── 블록 본체 ── */}
                  <div style={{ flex:1, minWidth:0 }}
                    onMouseEnter={e => {
                      if (block.type !== "text") return;
                      const handle = e.currentTarget.previousSibling;
                      if (handle) handle.style.opacity = "1";
                    }}
                    onMouseLeave={e => {
                      if (block.type !== "text") return;
                      const handle = e.currentTarget.previousSibling;
                      if (handle && dragState.dragId !== block.id) handle.style.opacity = "0";
                    }}
                  >
                    {/* 텍스트 블록 */}
                    {block.type === "text" && (
                      <textarea
                        ref={el => textareaRefs.current[block.id] = el}
                        value={block.content}
                        onChange={e => {
                          updateBlock(block.id, e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                        onKeyDown={e => handleKeyDown(e, block)}
                        onFocus={() => setFocusedId(block.id)}
                        onBlur={() => setTimeout(() => setFloatBar(null), 150)}
                        onMouseUp={e => {
                          const ta = e.currentTarget;
                          const selStart = ta.selectionStart, selEnd = ta.selectionEnd;
                          const sel = ta.value.slice(selStart, selEnd).trim();
                          if (!sel || selStart === selEnd) { setFloatBar(null); return; }
                          // 선택 영역의 실제 위치를 구하기 위해 range 사용
                          const edRect = editorRef.current?.getBoundingClientRect() || { left:0, top:0 };
                          const taRect = ta.getBoundingClientRect();
                          // textarea 내 선택 위치 추정: 라인 높이 기반
                          const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 27;
                          const textBefore = ta.value.slice(0, selStart);
                          const linesAbove = (textBefore.split("\n").length - 1);
                          const approxTop = taRect.top - edRect.top + linesAbove * lineH - 42;
                          setFloatBar({ top: Math.max(approxTop, 0), left: taRect.left - edRect.left, blockId: block.id, selStart, selEnd, selectedText: sel });
                        }}
                        onKeyUp={e => {
                          const ta = e.currentTarget;
                          const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
                          if (!sel) { setFloatBar(null); return; }
                        }}
                        placeholder={blocks.filter(b=>b.type==="text").indexOf(block) === 0
                          ? "내용을 입력하세요. 사진·영상은 위 툴바 버튼이나 드래그로 추가하세요." : ""}
                        rows={1}
                        style={{
                          width:"100%", border:"none", background:"none",
                          fontSize: block.fontSize || "15px", lineHeight:1.9, color:"#333",
                          outline:"none", resize:"none", padding:"2px 0",
                          overflow:"hidden", minHeight:"28px", display:"block",
                          cursor: isDragging ? "grabbing" : "text",
                          textAlign: block.textAlign || "left",
                        }}
                      />
                    )}

                    {/* expand 접기/펼치기 블록 */}
                    {block.type === "expand" && (() => {
                      const body = blocks.find(b => b.parentId === block.id && b.type === "expand-body");
                      const bodyMediaBlocks = blocks.filter(b => b.parentId === block.id && (b.type==="image"||b.type==="video"||b.type==="file"));
                      const addExpandMedia = (files, mType) => {
                        Promise.all(Array.from(files).map(f => new Promise(res => {
                          const r = new FileReader(); r.onload = () => res({ id:Date.now()+Math.random(), type:mType, src:r.result, name:f.name, parentId:block.id }); r.readAsDataURL(f);
                        }))).then(newBlocks => {
                          setBlocks(bs => { const idx=bs.findIndex(b=>b.id===block.id); const n=[...bs]; n.splice(idx+2, 0, ...newBlocks); return n; });
                        });
                      };
                      return (
                        <div style={{ margin:"6px 0", borderRadius:"10px", border:"1px solid #E0E0E0", overflow:"hidden" }}>
                          {/* 헤더 */}
                          <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 14px", background:"#F6F6F4", cursor:"pointer" }}
                            onClick={() => setBlocks(bs => bs.map(b => b.id===block.id ? {...b, open:!b.open} : b))}>
                            <span style={{ fontSize:"10px", color:"#888", display:"inline-block", transition:"transform 0.2s", transform:block.open?"rotate(90deg)":"none" }}>▶</span>
                            <input value={block.title}
                              onChange={e => { e.stopPropagation(); setBlocks(bs => bs.map(b => b.id===block.id ? {...b, title:e.target.value} : b)); }}
                              onClick={e => e.stopPropagation()}
                              placeholder="제목 입력..."
                              style={{ flex:1, border:"none", background:"none", fontSize:"14px", fontWeight:600, color:"#333", outline:"none" }}
                            />
                            {/* 삭제 버튼 */}
                            <button type="button" onClick={e => { e.stopPropagation(); setBlocks(bs => bs.filter(b => b.id!==block.id && b.parentId!==block.id)); }}
                              style={{ border:"none", background:"none", cursor:"pointer", fontSize:"13px", color:"#CCC", padding:"2px 6px", borderRadius:"5px" }}
                              onMouseEnter={e=>{e.currentTarget.style.color="#FF6B6B";e.currentTarget.style.background="#FFF0F0";}}
                              onMouseLeave={e=>{e.currentTarget.style.color="#CCC";e.currentTarget.style.background="none";}}>✕</button>
                          </div>
                          {/* 펼쳐진 내용 */}
                          {block.open && (
                            <div style={{ padding:"12px 16px", borderTop:"1px solid #EBEBEB", background:"#fff" }}>
                              {/* 텍스트 */}
                              {body && (
                                <textarea ref={el=>textareaRefs.current[body.id]=el} value={body.content}
                                  onChange={e=>{updateBlock(body.id,e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
                                  onFocus={()=>setFocusedId(body.id)}
                                  placeholder="내용을 입력하세요..." rows={2}
                                  style={{ width:"100%", border:"none", background:"none", fontSize:"14px", lineHeight:1.8, color:"#444", outline:"none", resize:"none", padding:"4px 0", overflow:"hidden", minHeight:"40px" }}
                                />
                              )}
                              {/* 미디어 */}
                              {bodyMediaBlocks.map(m => (
                                <div key={m.id} style={{ margin:"8px 0", position:"relative" }}>
                                  {m.type==="image" && <img src={m.src} alt={m.name} style={{ width:"100%", borderRadius:"8px", objectFit:"contain", maxHeight:"300px" }} />}
                                  {m.type==="video" && <video src={m.src} controls style={{ width:"100%", borderRadius:"8px", maxHeight:"240px" }} />}
                                  <button type="button" onClick={()=>setBlocks(bs=>bs.filter(b=>b.id!==m.id))}
                                    style={{ position:"absolute", top:"6px", right:"6px", width:"24px", height:"24px", border:"none", borderRadius:"6px", background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:"12px", cursor:"pointer" }}>✕</button>
                                </div>
                              ))}
                              {/* 미디어 추가 버튼 */}
                              <div style={{ display:"flex", gap:"6px", marginTop:"8px" }}>
                                <input type="file" accept="image/*" multiple id={"exp-img-"+block.id} style={{ display:"none" }} onChange={e=>{addExpandMedia(e.target.files,"image");e.target.value="";}} />
                                <input type="file" accept="video/*" multiple id={"exp-vid-"+block.id} style={{ display:"none" }} onChange={e=>{addExpandMedia(e.target.files,"video");e.target.value="";}} />
                                <button type="button" onClick={()=>document.getElementById("exp-img-"+block.id)?.click()} style={{ padding:"4px 12px", borderRadius:"7px", border:"1px dashed #D0D0D0", background:"#FAFAFA", color:"#888", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>🖼️ 사진 추가</button>
                                <button type="button" onClick={()=>document.getElementById("exp-vid-"+block.id)?.click()} style={{ padding:"4px 12px", borderRadius:"7px", border:"1px dashed #D0D0D0", background:"#FAFAFA", color:"#888", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>🎬 영상 추가</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {block.type === "expand-body" && null}

                    {/* 이미지 블록 */}
                    {block.type === "image" && (
                      <div
                        onMouseDown={onHandleMouseDown}
                        onDragStart={e => e.preventDefault()}
                        style={{
                          margin:"8px 0", borderRadius:"14px", overflow:"hidden", background:"#F0F0EE",
                          outline: isOver ? "2.5px solid #111" : "2px solid transparent",
                          transition:"outline 0.15s", position:"relative",
                          cursor: isDragging ? "grabbing" : "grab",
                          userSelect:"none",
                        }}>
                        <img
                          src={block.src} alt={block.name}
                          draggable="false"
                          onDragStart={e => e.preventDefault()}
                          style={{ width:"100%", display:"block", maxHeight:"500px", objectFit:"contain",
                            pointerEvents:"none" }} />
                        <button type="button"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => removeBlock(block.id)}
                          style={{
                            position:"absolute", top:"10px", right:"10px",
                            width:"28px", height:"28px", border:"none", borderRadius:"7px",
                            background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:"13px",
                            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                          }}>✕</button>
                      </div>
                    )}

                    {/* 영상 블록 */}
                    {block.type === "video" && (
                      <div
                        onMouseDown={e => {
                          if (e.target.tagName === "VIDEO") return;
                          onHandleMouseDown(e);
                        }}
                        style={{
                          margin:"8px 0", borderRadius:"14px", overflow:"hidden", background:"#111",
                          outline: isOver ? "2.5px solid #111" : "2px solid transparent",
                          transition:"outline 0.15s", position:"relative",
                          cursor: isDragging ? "grabbing" : "grab",
                          userSelect:"none",
                        }}>
                        <video src={block.src} controls
                          style={{ width:"100%", maxHeight:"420px", display:"block" }} />
                        <button type="button"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => removeBlock(block.id)}
                          style={{
                            position:"absolute", top:"10px", right:"10px",
                            width:"28px", height:"28px", border:"none", borderRadius:"7px",
                            background:"rgba(220,50,50,0.82)", color:"#fff", fontSize:"13px",
                            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                          }}>✕</button>
                      </div>
                    )}

                    {/* 파일 블록 */}
                    {block.type === "file" && (() => {
                      const ext = block.name.split(".").pop().toLowerCase();
                      const iconMap = {
                        zip:"🗜️", rar:"🗜️", "7z":"🗜️", gz:"🗜️",
                        pdf:"📄", doc:"📝", docx:"📝", xls:"📊", xlsx:"📊",
                        ppt:"📊", pptx:"📊", txt:"📃", csv:"📃",
                        mp3:"🎵", wav:"🎵", aac:"🎵",
                        js:"💻", ts:"💻", py:"💻", html:"💻", css:"💻",
                      };
                      const icon = iconMap[ext] || "📎";
                      const sizeMB = (block.size / 1024 / 1024).toFixed(2);
                      const sizeStr = block.size > 1024*1024 ? `${sizeMB} MB` : `${(block.size/1024).toFixed(1)} KB`;
                      return (
                        <div
                          onMouseDown={onHandleMouseDown}
                          style={{
                            margin:"8px 0", borderRadius:"12px",
                            border:"1.5px solid #E8E8E8", background:"#FAFAFA",
                            padding:"14px 16px",
                            display:"flex", alignItems:"center", gap:"14px",
                            cursor: isDragging ? "grabbing" : "grab",
                            userSelect:"none", position:"relative",
                            outline: isOver ? "2px solid #111" : "none",
                          }}>
                          <div style={{
                            width:"44px", height:"44px", borderRadius:"10px",
                            background:"#F0F0F0", flexShrink:0,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:"22px",
                          }}>{icon}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:"14px", fontWeight:600, color:"#111",
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {block.name}
                            </p>
                            <p style={{ margin:"2px 0 0", fontSize:"12px", color:"#AAA" }}>
                              {sizeStr} · {ext.toUpperCase()}
                            </p>
                          </div>
                          <a href={block.src} download={block.name}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                              padding:"7px 14px", borderRadius:"8px",
                              border:"1.5px solid #E8E8E8", background:"#fff",
                              color:"#555", fontSize:"12px", fontWeight:600,
                              textDecoration:"none", flexShrink:0,
                            }}>다운로드</a>
                          <button type="button"
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => removeBlock(block.id)}
                            style={{
                              width:"26px", height:"26px", border:"none", borderRadius:"6px",
                              background:"#F0F0F0", color:"#AAA", fontSize:"12px",
                              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                              flexShrink:0,
                            }}>✕</button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 여백 클릭 시 마지막 텍스트 블록 포커스 */}
          <div
            style={{ minHeight:"80px", cursor:"text" }}
            onClick={() => {
              const lastText = [...blocks].reverse().find(b => b.type === "text");
              if (lastText) textareaRefs.current[lastText.id]?.focus();
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── AI GEN MODAL ── */
function AIGenModal({ onClose, onAdd }) {
  const [topic, setTopic]     = useState("");
  const [category, setCategory] = useState("ai-trend");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const catLabel = CATEGORIES.find(c => c.id === category)?.label || "";
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:`AI 팀 뉴스레터. 카테고리:[${catLabel}] 주제:"${topic}"
JSON만 반환:
{"title":"30자이내 제목","summary":"80~100자 요약","body":"200~250자 본문(개행가능)","emoji":"이모지1개","tag":"태그(공백없이)"}` }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.map(b => b.text||"").join("") || "";
      setResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    } catch { setError("생성 중 오류가 발생했어요. 다시 시도해주세요."); }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!result) return;
    onAdd({
      id:Date.now(), category,
      categoryLabel:CATEGORIES.find(c => c.id === category)?.label || "",
      title:result.title, summary:result.summary, body:result.body||result.summary,
      emoji:result.emoji, tag:result.tag, url:"",
      date: new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,""),
      author:"AI 생성", likes:0, bookmarked:false, liked:false, comments:[],
    });
    onClose();
  };

  const cs = CAT_STYLE[category];
  return (
    <Overlay onClick={onClose}>
      <div style={{ padding:"28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"22px" }}>
          <h2 style={{ fontSize:"17px", fontWeight:700 }}>✨ AI 카드 자동 생성</h2>
          <CloseBtn onClick={onClose} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div>
            <label style={{ fontSize:"13px", fontWeight:600, color:"#444", display:"block", marginBottom:"8px" }}>카테고리</label>
            <div style={{ display:"flex", gap:"8px" }}>
              {CATEGORIES.filter(c => c.id !== "all").map(c => {
                const s = CAT_STYLE[c.id]; const a = category === c.id;
                return (
                  <button key={c.id} onClick={() => setCategory(c.id)} style={{
                    padding:"7px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:600,
                    border:`1.5px solid ${a ? s.border : "#E8E8E8"}`,
                    background:a ? s.bg : "#fff", color:a ? s.text : "#888", transition:"all 0.15s",
                  }}>{c.label}</button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize:"13px", fontWeight:600, color:"#444", display:"block", marginBottom:"8px" }}>주제 또는 키워드</label>
            <textarea value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="예: Claude 3.7의 새로운 기능과 활용법" rows={3}
              style={{ ...inputStyle(false), resize:"none" }}
              onFocus={e => e.target.style.borderColor="#111"}
              onBlur={e => e.target.style.borderColor="#E8E8E8"} />
          </div>

          {error && <p style={{ fontSize:"13px", color:"#FF6B6B" }}>{error}</p>}

          {result && (
            <div style={{ background:"#F8F8F6", borderRadius:"12px", padding:"16px", border:"1.5px solid #EBEBEB" }}>
              <p style={{ fontSize:"11px", fontWeight:700, color:"#AAAAAA", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>미리보기</p>
              <p style={{ fontWeight:700, fontSize:"15px", color:"#111", marginBottom:"6px" }}>{result.emoji} {result.title}</p>
              <p style={{ fontSize:"13px", color:"#666", lineHeight:1.7, marginBottom:"10px" }}>{result.summary}</p>
              <span style={{ fontSize:"12px", fontWeight:600, padding:"3px 9px", borderRadius:"6px", background:cs.bg, color:cs.text }}>#{result.tag}</span>
            </div>
          )}

          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={generate} disabled={loading || !topic.trim()} style={{
              flex:result ? 1 : 2, padding:"13px", borderRadius:"10px", border:"none",
              background:loading || !topic.trim() ? "#EBEBEB" : "#111",
              color:loading || !topic.trim() ? "#BBBBBB" : "#fff",
              fontSize:"14px", fontWeight:700, cursor:loading || !topic.trim() ? "not-allowed" : "pointer",
            }}>{loading ? "✨ 생성 중..." : "✨ 생성하기"}</button>
            {result && (
              <button onClick={handleAdd} style={{
                flex:1, padding:"13px", borderRadius:"10px",
                border:"1.5px solid #111", background:"#fff",
                color:"#111", fontSize:"14px", fontWeight:700, cursor:"pointer",
              }}>+ 추가하기</button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ── NEWS CARD ── */
function NewsCard({ post, index, onClick, onLike, onBookmark, onDelete }) {
  const [hov, setHov] = useState(false);
  const cs = CAT_STYLE[post.category];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:"#fff", borderRadius:"16px", border:"1.5px solid #EEEEEC",
        padding:"24px", cursor:"pointer", display:"flex", flexDirection:"column", gap:"12px",
        boxShadow: hov ? "0 18px 44px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.04)",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition:"all 0.22s cubic-bezier(.4,0,.2,1)",
        animation:"fadeUp 0.38s ease both",
        animationDelay:`${index * 55}ms`,
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{
          fontSize:"11px", fontWeight:700, letterSpacing:"0.06em",
          padding:"4px 10px", borderRadius:"999px",
          background:cs.bg, color:cs.text, border:`1px solid ${cs.border}`,
        }}>{post.categoryLabel}</span>
        <span style={{ fontSize:"12px", color:"#C0C0C0" }}>{post.date}</span>
      </div>

      <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
        <div style={{
          width:"42px", height:"42px", minWidth:"42px",
          background:cs.bg, borderRadius:"11px",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px",
        }}>{post.emoji}</div>
        <h3 style={{ fontSize:"15px", fontWeight:700, lineHeight:1.45, color:"#111", margin:0 }}>{post.title}</h3>
      </div>

      <p style={{
        fontSize:"13px", color:"#777", lineHeight:1.72, margin:0,
        display:"-webkit-box", WebkitLineClamp:3,
        WebkitBoxOrient:"vertical", overflow:"hidden",
      }}>{post.summary}</p>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto", paddingTop:"2px" }}>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <span style={{ fontSize:"11px", fontWeight:600, color:cs.text, padding:"2px 8px", background:cs.bg, borderRadius:"5px" }}>#{post.tag}</span>
          {post.url && <span style={{ fontSize:"12px", color:"#CCCCCC" }}>🔗</span>}
          {post.comments?.length > 0 && (
            <span style={{ fontSize:"11px", color:"#CCCCCC", display:"flex", alignItems:"center", gap:"2px" }}>
              💬 {post.comments.length}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          <button onClick={e => { e.stopPropagation(); onLike(post.id); }} style={{
            border:"none", background:"none", cursor:"pointer", padding:"4px 6px",
            fontSize:"13px", display:"flex", alignItems:"center", gap:"3px", transition:"color 0.15s",
            color:post.liked ? "#FF6B6B" : "#CCCCCC",
          }}>{post.liked ? "❤️" : "🤍"}<span style={{ fontWeight:600, fontSize:"12px" }}>{post.likes}</span></button>
          <button onClick={e => { e.stopPropagation(); onBookmark(post.id); }} style={{
            border:"none", background:"none", cursor:"pointer", padding:"4px 6px",
            fontSize:"14px", transition:"color 0.15s",
            color:post.bookmarked ? "#F59E0B" : "#CCCCCC",
          }}>{post.bookmarked ? "🔖" : "📌"}</button>
          <button onClick={e => { e.stopPropagation(); onDelete(post.id); }} style={{
            border:"none", background:"none", cursor:"pointer", padding:"4px 6px",
            fontSize:"13px", color:"#DDDDDD", transition:"color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color="#FF6B6B"}
          onMouseLeave={e => e.currentTarget.style.color="#DDDDDD"}
          >🗑️</button>
        </div>
      </div>
    </div>
  );
}

/* ── POST PAGE (게시글 전체 페이지) ── */
function PostPage({ post, onBack, onLike, onBookmark, onEdit, onDelete, onAddComment, onDeleteComment }) {
  const cs = CAT_STYLE[post.category] || CAT_STYLE["ai-trend"];
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [replyTo, setReplyTo]         = useState(null);
  const comments = post.comments || [];

  const submitComment = () => {
    if (!commentText.trim() || !commentName.trim()) return;
    onAddComment(post.id, {
      id: Date.now(), name: commentName.trim(), text: commentText.trim(),
      date: new Date().toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,""),
      replyTo: replyTo ? replyTo.name : null,
    });
    setCommentText(""); setReplyTo(null);
  };

  const B_SECTIONS = [
    { id:"industry", label:"업계 소식",   emoji:"📰", color:"#D97706" },
    { id:"content",  label:"콘텐츠 소식", emoji:"🎬", color:"#7C3AED" },
    { id:"trend",    label:"트렌드 소식", emoji:"📈", color:"#059669" },
    { id:"request",  label:"제작 요청",   emoji:"✏️",  color:"#2563EB" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#F6F6F4", fontFamily:"'Pretendard', -apple-system, sans-serif" }}>
      {/* 상단 바 */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #EAEAEA" }}>
        <div style={{ maxWidth:"760px", margin:"0 auto", padding:"0 24px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={onBack} style={{ border:"none", background:"none", cursor:"pointer", fontSize:"14px", fontWeight:600, color:"#555", display:"flex", alignItems:"center", gap:"6px", padding:"6px 12px", borderRadius:"8px" }}>
            ← 목록으로
          </button>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={() => onEdit(post)} style={{ padding:"7px 14px", borderRadius:"8px", border:"1.5px solid #E8E8E8", background:"#fff", color:"#555", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>✏️ 수정</button>
            <button onClick={() => onDelete(post.id)} style={{ padding:"7px 14px", borderRadius:"8px", border:"1.5px solid #FFE0E0", background:"#FFF5F5", color:"#FF6B6B", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>🗑️ 삭제</button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"40px 24px 80px" }}>
        <div style={{ background:"#fff", borderRadius:"20px", padding:"40px", boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>

          {/* 카테고리 + 날짜 */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
            <span style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.07em", padding:"4px 12px", borderRadius:"999px", background:cs.bg, color:cs.text, border:`1px solid ${cs.border}` }}>{post.categoryLabel}</span>
            <span style={{ fontSize:"13px", color:"#AAAAAA" }}>{post.date}</span>
            <span style={{ fontSize:"11px", fontWeight:700, padding:"3px 9px", borderRadius:"6px", background:cs.bg, color:cs.text }}>#{post.tag}</span>
          </div>

          {/* 제목 */}
          <div style={{ display:"flex", gap:"16px", alignItems:"flex-start", marginBottom:"16px" }}>
            <div style={{ width:"52px", height:"52px", minWidth:"52px", background:cs.bg, borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px" }}>{post.emoji}</div>
            <h1 style={{ margin:0, fontSize:"26px", fontWeight:700, lineHeight:1.3, color:"#111" }}>{post.title}</h1>
          </div>

          {/* 작성자 */}
          <div style={{ display:"flex", gap:"10px", alignItems:"center", marginBottom:"28px", paddingBottom:"24px", borderBottom:"1px solid #F0F0F0" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"999px", background:"#111", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700 }}>{(post.author||"?")[0]}</div>
            <span style={{ fontSize:"14px", fontWeight:600, color:"#111" }}>{post.author}</span>
          </div>

          {/* B레터 bBlocks 렌더링 */}
          {post.bBlocks && post.bBlocks.length > 0 && (
            <div style={{ marginBottom:"24px" }}>
              {post.bBlocks.map((block, i) => {
                if (block.type === "section") {
                  const sec = B_SECTIONS.find(s => s.id === block.sectionId) || B_SECTIONS[0];
                  return (
                    <div key={block.id||i} style={{ display:"flex", alignItems:"center", gap:"8px", margin:"32px 0 16px" }}>
                      <div style={{ flex:1, height:"1.5px", background:"#EBEBEB" }} />
                      <div style={{ padding:"6px 20px", borderRadius:"999px", border:`2px solid ${sec.color}`, fontSize:"13px", fontWeight:700, color:sec.color, whiteSpace:"nowrap", background:"#fff" }}>{sec.emoji} {sec.label}</div>
                      <div style={{ flex:1, height:"1.5px", background:"#EBEBEB" }} />
                    </div>
                  );
                }
                if (block.type === "text" && block.content) return (
                  <p key={block.id||i} style={{ fontSize:"15px", color:"#444", lineHeight:1.9, margin:"0 0 8px", whiteSpace:"pre-line" }} dangerouslySetInnerHTML={{ __html: renderText(block.content) }} />
                );
                if (block.type === "image") return (
                  <div key={block.id||i} style={{ margin:"16px 0", borderRadius:"14px", overflow:"hidden", background:"#F0F0EE" }}>
                    <img src={block.src} alt={block.name} style={{ width:"100%", display:"block", maxHeight:"600px", objectFit:"contain" }} />
                  </div>
                );
                if (block.type === "video") return (
                  <div key={block.id||i} style={{ margin:"16px 0", borderRadius:"14px", overflow:"hidden", background:"#111" }}>
                    <video src={block.src} controls style={{ width:"100%", maxHeight:"480px", display:"block" }} />
                  </div>
                );
                if (block.type === "file") {
                  const ext=block.name?.split(".")?.pop()?.toLowerCase()||"";
                  const iconMap={zip:"🗜️",rar:"🗜️",pdf:"📄",doc:"📝",docx:"📝",xls:"📊",xlsx:"📊",mp3:"🎵",wav:"🎵"};
                  return (
                    <div key={block.id||i} style={{ margin:"12px 0", borderRadius:"12px", border:"1.5px solid #EBEBEB", background:"#FAFAFA", padding:"14px 16px", display:"flex", alignItems:"center", gap:"14px" }}>
                      <div style={{ width:"42px", height:"42px", borderRadius:"10px", background:"#F0F0F0", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>{iconMap[ext]||"📎"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:"14px", fontWeight:600, color:"#111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{block.name}</p>
                      </div>
                      <a href={block.src} download={block.name} style={{ padding:"7px 14px", borderRadius:"8px", border:"1.5px solid #E8E8E8", background:"#fff", color:"#555", fontSize:"12px", fontWeight:600, textDecoration:"none", flexShrink:0 }}>⬇ 다운로드</a>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* 일반 블록 렌더링 */}
          {!post.bBlocks && post.blocks && post.blocks.length > 0 && (
            <div style={{ marginBottom:"24px" }}>
              {post.blocks.map((block,i) => {
                if (block.type==="expand") {
                  const body = post.blocks?.find(b => b.parentId === block.id);
                  return (
                    <details key={block.id||i} open style={{ margin:"10px 0", borderRadius:"10px", border:"1px solid #E0E0E0", overflow:"hidden" }}>
                      <summary style={{ padding:"12px 16px", fontSize:"14px", fontWeight:600, color:"#333", cursor:"pointer", background:"#F6F6F4", display:"flex", alignItems:"center", gap:"8px", listStyle:"none" }}>
                        <span style={{ fontSize:"11px", color:"#888" }}>▶</span> {block.title||"(제목 없음)"}
                      </summary>
                      {body?.content && <div style={{ padding:"14px 16px", fontSize:"14px", color:"#444", lineHeight:1.8, borderTop:"1px solid #E0E0E0", whiteSpace:"pre-line" }}>{body.content}</div>}
                    </details>
                  );
                }
                if (block.type==="expand-body") return null;
                if (block.type==="text"&&block.content) return <p key={block.id||i} style={{ fontSize:"15px", color:"#444", lineHeight:1.9, margin:"0 0 8px", whiteSpace:"pre-line" }} dangerouslySetInnerHTML={{ __html: renderText(block.content) }} />;
                if (block.type==="image") return <div key={block.id||i} style={{ margin:"16px 0", borderRadius:"14px", overflow:"hidden" }}><img src={block.src} alt={block.name} style={{ width:"100%", display:"block", maxHeight:"600px", objectFit:"contain" }} /></div>;
                if (block.type==="video") return <div key={block.id||i} style={{ margin:"16px 0", borderRadius:"14px", overflow:"hidden", background:"#111" }}><video src={block.src} controls style={{ width:"100%", maxHeight:"480px", display:"block" }} /></div>;
                return null;
              })}
            </div>
          )}

          {/* 샘플 포스트 body */}
          {!post.bBlocks && (!post.blocks || post.blocks.length===0) && (
            <div style={{ fontSize:"15px", color:"#444", lineHeight:1.9, marginBottom:"24px", whiteSpace:"pre-line" }} dangerouslySetInnerHTML={{ __html: renderText(post.body||"") }} />
          )}

          {/* URL 링크 */}
          {post.url && (
            <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"14px 18px", borderRadius:"12px", background:"#F6F6F4", border:"1.5px solid #EBEBEB", textDecoration:"none", color:"#333", fontSize:"13px", fontWeight:500, marginBottom:"24px" }}>
              <span style={{ fontSize:"18px" }}>🔗</span>
              <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.url}</span>
              <span style={{ color:"#BBBBBB", fontSize:"12px" }}>바로가기 →</span>
            </a>
          )}

          {/* 좋아요 / 북마크 */}
          <div style={{ display:"flex", gap:"10px", paddingTop:"20px", borderTop:"1px solid #F0F0F0" }}>
            <button onClick={()=>onLike(post.id)} style={{ flex:1, padding:"13px", borderRadius:"12px", cursor:"pointer", fontSize:"14px", fontWeight:600, border:`1.5px solid ${post.liked?"#FF6B6B":"#E8E8E8"}`, background:post.liked?"#FFF0F0":"#fff", color:post.liked?"#FF6B6B":"#888", transition:"all 0.18s" }}>{post.liked?"❤️":"🤍"} 좋아요 {post.likes}</button>
            <button onClick={()=>onBookmark(post.id)} style={{ flex:1, padding:"13px", borderRadius:"12px", cursor:"pointer", fontSize:"14px", fontWeight:600, border:`1.5px solid ${post.bookmarked?"#F59E0B":"#E8E8E8"}`, background:post.bookmarked?"#FFFBEB":"#fff", color:post.bookmarked?"#F59E0B":"#888", transition:"all 0.18s" }}>{post.bookmarked?"🔖":"📌"} {post.bookmarked?"저장됨":"북마크"}</button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div style={{ background:"#fff", borderRadius:"20px", padding:"32px 40px", marginTop:"16px", boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize:"16px", fontWeight:700, color:"#111", marginBottom:"20px" }}>💬 댓글 {comments.length>0?comments.length:""}</p>

          {comments.length === 0 ? (
            <p style={{ fontSize:"14px", color:"#CCCCCC", textAlign:"center", padding:"20px 0 28px" }}>첫 댓글을 남겨보세요 👋</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"4px", marginBottom:"20px" }}>
              {comments.map(c => (
                <div key={c.id} style={{ padding:"14px 16px", borderRadius:"14px", background:c.replyTo?"#F8F8F8":"#FAFAFA", borderLeft:c.replyTo?"3px solid #E0E0E0":"none", marginLeft:c.replyTo?"12px":"0" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"28px", height:"28px", borderRadius:"999px", background:"#111", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, flexShrink:0 }}>{c.name[0]}</div>
                      <span style={{ fontSize:"14px", fontWeight:700, color:"#111" }}>{c.name}</span>
                      <span style={{ fontSize:"11px", color:"#CCCCCC" }}>{c.date}</span>
                    </div>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <button onClick={()=>setReplyTo({id:c.id,name:c.name})} style={{ border:"none", background:"none", cursor:"pointer", fontSize:"12px", color:"#AAAAAA", fontWeight:600 }}>↩ 답글</button>
                      <button onClick={()=>onDeleteComment(post.id,c.id)} style={{ border:"none", background:"none", cursor:"pointer", fontSize:"12px", color:"#DDDDDD", fontWeight:600 }}>삭제</button>
                    </div>
                  </div>
                  {c.replyTo && <p style={{ fontSize:"11px", color:"#AAAAAA", margin:"0 0 4px" }}>@{c.replyTo} 에게</p>}
                  <p style={{ fontSize:"14px", color:"#444", lineHeight:1.7, margin:0 }}>{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {replyTo && (
            <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 14px", background:"#F0F0F0", borderRadius:"9px", marginBottom:"10px", fontSize:"13px", color:"#666" }}>
              <span>↩ <b>{replyTo.name}</b>에게 답글 중</span>
              <button onClick={()=>setReplyTo(null)} style={{ border:"none", background:"none", cursor:"pointer", fontSize:"14px", color:"#AAAAAA", marginLeft:"auto" }}>×</button>
            </div>
          )}

          <select value={commentName} onChange={e=>setCommentName(e.target.value)} style={{ width:"100%", padding:"11px 14px", borderRadius:"10px", border:"1.5px solid #EAEAEA", fontSize:"13px", outline:"none", color:commentName?"#333":"#AAAAAA", background:"#fff", cursor:"pointer", marginBottom:"10px" }}
            onFocus={e=>e.target.style.borderColor="#111"} onBlur={e=>e.target.style.borderColor="#EAEAEA"}>
            <option value="" disabled>이름 선택</option>
            {TEAM_MEMBERS.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <div style={{ display:"flex", gap:"10px" }}>
            <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment();}}} placeholder="댓글을 입력하세요 (Enter로 등록)" rows={3}
              style={{ flex:1, padding:"12px 14px", borderRadius:"10px", border:"1.5px solid #EAEAEA", fontSize:"14px", outline:"none", resize:"none", lineHeight:1.6 }}
              onFocus={e=>e.target.style.borderColor="#111"} onBlur={e=>e.target.style.borderColor="#EAEAEA"} />
            <button onClick={submitComment} style={{ padding:"0 20px", borderRadius:"10px", border:"none", background:"#111", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer", flexShrink:0 }}>등록</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PASSWORD GATE ── */
const PASSWORD = "bc0410";

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
      fontFamily:"'Pretendard', -apple-system, sans-serif",
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
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
      `}</style>
    </div>
  );
}

/* ── APP ── */
export default function App() {
  const [auth, setAuth]             = useState(() => sessionStorage.getItem("bconbu-auth") === "1");
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat]   = useState("all");
  const [search, setSearch]         = useState("");
  const [showWrite, setShowWrite]   = useState(false);
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
    if (!window.confirm("이 카드를 삭제할까요?")) return;
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
    return <PasswordGate onEnter={() => { sessionStorage.setItem("bconbu-auth","1"); setAuth(true); }} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"16px", background:"#F5F5F3", fontFamily:"'Pretendard', sans-serif" }}>
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
            <button onClick={() => setBmOnly(b => !b)} style={{
              padding:"8px 14px", borderRadius:"9px", cursor:"pointer", fontSize:"13px", fontWeight:600,
              border:`1.5px solid ${bmOnly ? "#F59E0B" : "#E8E8E8"}`,
              background:bmOnly ? "#FFFBEB" : "#fff",
              color:bmOnly ? "#F59E0B" : "#888", transition:"all 0.18s",
              display:"flex", alignItems:"center", gap:"5px",
            }}>
              🔖{bmCount > 0 && <span style={{
                background:"#F59E0B", color:"#fff",
                borderRadius:"999px", padding:"1px 6px", fontSize:"11px", fontWeight:700,
              }}>{bmCount}</span>}
            </button>
            <div style={{ position:"relative" }}
              onMouseEnter={e => e.currentTarget.querySelector(".write-menu").style.display="flex"}
              onMouseLeave={e => e.currentTarget.querySelector(".write-menu").style.display="none"}
            >
              <button style={{
                padding:"8px 16px", borderRadius:"9px", cursor:"pointer",
                border:"1.5px solid #E8E8E8", background:"#fff",
                color:"#444", fontSize:"13px", fontWeight:600,
              }}>✏️ 직접 작성 ▾</button>
              <div className="write-menu" style={{
                display:"none", position:"absolute", top:"100%", right:0,
                background:"#fff", borderRadius:"12px", border:"1.5px solid #EAEAEA",
                boxShadow:"0 8px 24px rgba(0,0,0,0.1)", padding:"6px",
                flexDirection:"column", gap:"2px", minWidth:"140px", zIndex:100, marginTop:"4px",
              }}>
                {[
                  { id:"ai-trend", label:"AI 트렌드", emoji:"🤖" },
                  { id:"b-letter", label:"B레터",     emoji:"📰" },
                  { id:"source",   label:"소스 공유",  emoji:"🔧" },
                ].map(c => (
                  <button key={c.id} onClick={() => { setEditPost(null); setWriteCategory(c.id); setShowWrite(true); }} style={{
                    padding:"9px 14px", borderRadius:"8px", border:"none", background:"none",
                    fontSize:"13px", fontWeight:600, color:"#333", cursor:"pointer", textAlign:"left",
                    display:"flex", alignItems:"center", gap:"8px",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="#F5F5F5"}
                  onMouseLeave={e => e.currentTarget.style.background="none"}
                  >{c.emoji} {c.label}</button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* HERO */}
      <div style={{ position:"relative", color:"#fff", padding:"60px 24px 48px", textAlign:"center", overflow:"hidden", minHeight:"280px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`url("data:image/jpeg;base64,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")`, backgroundSize:"cover", backgroundPosition:"center 30%", filter:"brightness(0.4)", zIndex:0 }} />
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
      <main style={{ maxWidth:"760px", margin:"0 auto", padding:"30px 24px 80px" }}>
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
        padding:"24px", textAlign:"center", fontSize:"13px", color:"#CCCCCC",
      }}>
        <span style={{ fontWeight:700, color:"#999" }}>⚡ 브콘부 물류창고</span>
        <span style={{ margin:"0 10px" }}>·</span>
        브콘부 물류창고 · {new Date().getFullYear()}
      </footer>
    </>
  );
}

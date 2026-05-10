import { useState, useEffect } from "react";

// ── Platform config ──────────────────────────────────────
const P = {
  x:         { color:"#1DA1F2", label:"𝕏 (Twitter)",  short:"𝕏",  imgW:1200, imgH:675,  imgRatio:"16:9", videoMax:"2分20秒", videoSize:"512MB" },
  threads:   { color:"#a259ff", label:"Threads",       short:"TH", imgW:1080, imgH:1080, imgRatio:"1:1",  videoMax:"5分",     videoSize:"1GB"   },
  instagram: { color:"#E1306C", label:"Instagram",     short:"IG", imgW:1080, imgH:1350, imgRatio:"4:5",  videoMax:"90秒",    videoSize:"4GB"   },
};

const PLATFORM_DOMAINS = {
  x:         ["twitter.com","x.com","t.co"],
  threads:   ["threads.net","threads.com"],
  instagram: ["instagram.com","instagr.am"],
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace("www.","");
    for (const [k,domains] of Object.entries(PLATFORM_DOMAINS))
      if (domains.some(d => host.includes(d))) return k;
  } catch {}
  return null;
}

// ── Text converters ──────────────────────────────────────
function toX(text, link) {
  const tags = text.match(/#\S+/g) || [];
  let body = text.replace(/#\S+/g,"").trim();
  const reserve = (link?23:0) + (tags.length ? tags.slice(0,3).join(" ").length+2 : 0);
  if (body.length > 280-reserve) body = body.slice(0,277-reserve)+"…";
  if (tags.length) body += "\n\n"+tags.slice(0,3).join(" ");
  if (link) body += "\n\n"+link;
  return body;
}
function toThreads(text, link) {
  const body = text.replace(/#\S+/g,"").trim();
  const emo = ["✨","👇","💡","🔥","📌"];
  let out = body.split(/(?<=[。！？.!?])\s*/)
    .map((s,i)=>i===0?s.trim():emo[i%emo.length]+" "+s.trim())
    .filter(Boolean).join("\n\n").slice(0,500);
  if (link) out += "\n\n🔗 "+link;
  return out;
}
function toInstagram(text) {
  const tags = text.match(/#\S+/g) || [];
  const body = text.replace(/#\S+/g,"").trim();
  if (!tags.length) return body;
  return body+"\n\n.\n.\n.\n"+tags.join(" ");
}

// ── Image resize ─────────────────────────────────────────
function resizeImage(dataUrl, tw, th) {
  return new Promise((res,rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width=tw; c.height=th;
      const ctx=c.getContext("2d");
      // 黒背景
      ctx.fillStyle="#000000";
      ctx.fillRect(0,0,tw,th);
      // contain: 画像全体が収まるようにスケール
      const sr=img.naturalWidth/img.naturalHeight, dr=tw/th;
      let dw,dh;
      if(sr>dr){dw=tw; dh=tw/sr;}
      else{dh=th; dw=th*sr;}
      const dx=(tw-dw)/2, dy=(th-dh)/2;
      ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,dx,dy,dw,dh);
      res(c.toDataURL("image/jpeg",0.92));
    };
    img.onerror=rej; img.src=dataUrl;
  });
}

// ── Claude API call (URL mode) ───────────────────────────
async function fetchPostFromUrl(url) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      tools:[{ type:"web_search_20250305", name:"web_search" }],
      messages:[{
        role:"user",
        content:`次のSNS投稿URLの内容を取得して、投稿本文テキストとハッシュタグを抽出してください。URLにアクセスして投稿の内容を確認してください。\n\nURL: ${url}\n\n必ず以下のJSON形式のみで返してください（他のテキスト不要）:\n{"text":"投稿本文（ハッシュタグ含む）","platform":"x|threads|instagram","error":null}\n\n取得できない場合:\n{"text":null,"platform":null,"error":"エラー理由"}`
      }]
    })
  });
  const data = await resp.json();
  const raw = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("") || "";
  const clean = raw.replace(/```json|```/g,"").trim();
  try { return JSON.parse(clean); }
  catch { return { text:null, platform:null, error:"解析エラー: "+raw.slice(0,100) }; }
}

// ── Ad Modal ─────────────────────────────────────────────
function AdModal({ onDone }) {
  const [sec,setSec]=useState(5);
  useEffect(()=>{
    if(sec<=0){onDone();return;}
    const t=setTimeout(()=>setSec(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[sec,onDone]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.94)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
      <div style={{width:"100%",maxWidth:360,background:"#1a1a2e",borderRadius:20,overflow:"hidden",border:"1px solid #333"}}>
        <div style={{padding:"36px 24px",textAlign:"center",background:"linear-gradient(135deg,#1a1a2e,#0f3460)",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <div style={{fontSize:44}}>📣</div>
          <div style={{color:"#a259ff",fontSize:10,letterSpacing:3}}>ADVERTISEMENT</div>
          <div style={{color:"#fff",fontSize:20,fontWeight:700,lineHeight:1.35}}>副業で月5万円を<br/>達成する方法</div>
          <div style={{color:"#aaa",fontSize:13}}>SNS×アフィリエイト完全攻略</div>
          <div style={{padding:"10px 28px",borderRadius:99,background:"#a259ff",color:"#fff",fontSize:14,fontWeight:600}}>詳しく見る →</div>
        </div>
        <div style={{background:"#111"}}>
          <div style={{height:4,background:"#1e1e1e"}}>
            <div style={{height:"100%",width:`${((5-sec)/5)*100}%`,background:"linear-gradient(90deg,#a259ff,#6366f1)",transition:"width 1s linear"}}/>
          </div>
          <div style={{padding:"13px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#666",fontSize:13}}>広告を視聴中...</span>
            <span style={{color:"#fff",fontWeight:800,fontSize:22}}>{sec>0?sec:"✓"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────
function ResultCard({ pid, text, imgUrl, link, vidSrc }) {
  const [copied,setCopied]=useState(false);
  const {color,label,imgW,imgH,imgRatio,videoMax,videoSize}=P[pid];
  const copy=()=>navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  const dlImg=()=>{const a=document.createElement("a");a.href=imgUrl;a.download=`${pid}_${imgW}x${imgH}.jpg`;a.click();};
  const dlVid=()=>{const a=document.createElement("a");a.href=vidSrc;a.download=`${pid}_video.mp4`;a.click();};
  return (
    <div style={{background:"#141414",borderRadius:16,overflow:"hidden",border:`1px solid ${color}33`,marginBottom:16}}>
      <div style={{padding:"10px 16px",background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${color}22`}}>
        <span style={{color,fontWeight:700,fontSize:14}}>{label}</span>
        <span style={{color:"#555",fontSize:11}}>{imgW}×{imgH}</span>
      </div>
      {imgUrl&&(
        <div style={{position:"relative",background:"#000"}}>
          <img src={imgUrl} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>
          <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.6)",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#fff"}}>{imgW}×{imgH} ({imgRatio})</div>
          <button onClick={dlImg} style={{position:"absolute",bottom:8,right:8,background:color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ 画像DL</button>
        </div>
      )}
      {vidSrc&&(
        <div style={{position:"relative",background:"#000"}}>
          <video src={vidSrc} controls style={{width:"100%",maxHeight:180,display:"block"}}/>
          <button onClick={dlVid} style={{position:"absolute",bottom:8,right:8,background:color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ 動画DL</button>
        </div>
      )}
      {pid==="instagram"&&link&&(
        <div style={{padding:"8px 14px",background:"#1a0808",borderBottom:"1px solid #E1306C22",display:"flex",gap:8,alignItems:"flex-start"}}>
          <span>⚠️</span>
          <span style={{color:"#fca5a5",fontSize:11,lineHeight:1.5}}>Instagramのリンクはキャプション内では非クリックです。プロフィールURLかストーリーのリンクスタンプを使ってください。</span>
        </div>
      )}
      <div style={{padding:"14px 16px 8px"}}>
        <pre style={{color:"#ddd",fontSize:14,lineHeight:1.75,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"inherit"}}>{text}</pre>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          <span style={{color:"#555",fontSize:11}}>{text.length}文字</span>
          {pid==="x"&&<span style={{color:text.length>280?"#f87171":"#555",fontSize:11}}>上限280文字</span>}
        </div>
      </div>
      <div style={{padding:"8px 16px 14px"}}>
        <button onClick={copy} style={{width:"100%",padding:11,borderRadius:10,border:`1px solid ${copied?"#22c55e66":`${color}55`}`,background:copied?"#22c55e18":`${color}18`,color:copied?"#22c55e":color,fontWeight:700,fontSize:14,cursor:"pointer",transition:"all 0.2s"}}>
          {copied?"✅ コピーしました！":"📋 テキストをコピー"}
        </button>
      </div>
    </div>
  );
}

// ── Paste Zone ────────────────────────────────────────────
function FileZone({ accept, icon, label, preview, previewType, onFile, onClear }) {
  const id = "fz-" + label.replace(/\s/g,"");
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onFile(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  if (preview) return (
    <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #2a2a2a"}}>
      {previewType==="image"
        ? <img src={preview} alt="" style={{width:"100%",maxHeight:150,objectFit:"cover",display:"block"}}/>
        : <video src={preview} controls style={{width:"100%",maxHeight:150,display:"block"}}/>}
      <div style={{display:"flex"}}>
        <label htmlFor={id+"-re"} style={{flex:1,padding:8,background:"#1a1a1a",borderTop:"1px solid #222",color:"#888",fontSize:13,cursor:"pointer",textAlign:"center",borderRight:"1px solid #222"}}>
          🔄 変更
          <input id={id+"-re"} type="file" accept={accept} onChange={handleChange} style={{display:"none"}}/>
        </label>
        <button onClick={onClear} style={{flex:1,padding:8,background:"#1a1a1a",border:"none",borderTop:"1px solid #222",color:"#888",fontSize:13,cursor:"pointer"}}>✕ 削除</button>
      </div>
    </div>
  );
  return (
    <label htmlFor={id} style={{display:"block",cursor:"pointer"}}>
      <input id={id} type="file" accept={accept} onChange={handleChange} style={{display:"none"}}/>
      <div style={{borderRadius:12,border:"2px dashed #2a2a2a",background:"#141414",padding:"20px 16px",textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
        <div style={{fontSize:14,color:"#ccc",fontWeight:600,marginBottom:3}}>{label}</div>
        <div style={{fontSize:11,color:"#555"}}>タップして選択</div>
      </div>
    </label>
  );
}

// ── MODE A: 作成モード ────────────────────────────────────
function CreateMode({ onNeedAd, adDone, setAdDone }) {
  const [input,setInput]  = useState("");
  const [link,setLink]    = useState("");
  const [imgSrc,setImg]   = useState(null);
  const [vidSrc,setVid]   = useState(null);
  const [proc,setProc]    = useState(false);
  const [results,setResults] = useState(null);

  useEffect(()=>{
    if (!adDone) return;
    setAdDone(false);
    (async()=>{
      setProc(true);
      const texts={x:toX(input,link),threads:toThreads(input,link),instagram:toInstagram(input)};
      const imgs={};
      if(imgSrc) for(const[k,pf]of Object.entries(P)) imgs[k]=await resizeImage(imgSrc,pf.imgW,pf.imgH);
      setResults({texts,imgs,vidSrc}); setProc(false);
    })();
  },[adDone]);



  const canGo = input.trim().length>0 && !proc;
  return (
    <div>
      {/* Text */}
      <div style={{fontSize:13,color:"#888",marginBottom:8,marginTop:4}}>📝 投稿テキスト <span style={{color:"#555"}}>（必須）</span></div>
      <textarea value={input} onChange={e=>{setInput(e.target.value);setResults(null);}}
        placeholder={"投稿テキストを入力...\n例：今日から副業始めました！\n#副業 #SNS運用"}
        style={{width:"100%",minHeight:110,padding:14,background:"#141414",border:"1px solid #2a2a2a",borderRadius:14,color:"#eee",fontSize:15,lineHeight:1.7,resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
        onFocus={e=>e.target.style.borderColor="#a259ff88"} onBlur={e=>e.target.style.borderColor="#2a2a2a"}
      />
      {/* Link */}
      <div style={{fontSize:13,color:"#888",marginBottom:8,marginTop:14}}>🔗 リンク <span style={{color:"#555"}}>（任意）</span></div>
      <input type="url" value={link} onChange={e=>{setLink(e.target.value);setResults(null);}} placeholder="https://example.com"
        style={{width:"100%",padding:"12px 14px",background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,color:"#eee",fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
        onFocus={e=>e.target.style.borderColor="#1DA1F288"} onBlur={e=>e.target.style.borderColor="#2a2a2a"}
      />
      {/* Image */}
      <div style={{fontSize:13,color:"#888",marginBottom:8,marginTop:14}}>🖼️ 画像 <span style={{color:"#555"}}>（任意・自動リサイズ）</span></div>
      <FileZone accept="image/*" icon="🖼️" label="画像を選択" preview={imgSrc} previewType="image" onFile={d=>{setImg(d);setResults(null);}} onClear={()=>{setImg(null);setResults(null);}}/>
      {imgSrc&&(
        <div style={{marginTop:8,display:"flex",gap:8}}>
          {Object.entries(P).map(([k,v])=>(
            <div key={k} style={{flex:1,textAlign:"center"}}>
              <div style={{borderRadius:6,overflow:"hidden",border:`1.5px solid ${v.color}66`,aspectRatio:`${v.imgW}/${v.imgH}`}}>
                <img src={imgSrc} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              </div>
              <div style={{color:v.color,fontSize:9,marginTop:3,fontWeight:700}}>{v.imgRatio}</div>
            </div>
          ))}
        </div>
      )}
      {/* Video */}
      <div style={{fontSize:13,color:"#888",marginBottom:8,marginTop:14}}>🎬 動画 <span style={{color:"#555"}}>（任意）</span></div>
      <FileZone accept="video/*" icon="🎬" label="動画を選択" preview={vidSrc} previewType="video" onFile={d=>{setVid(d);setResults(null);}} onClear={()=>{setVid(null);setResults(null);}}/>
      {!vidSrc&&(
        <div style={{marginTop:8,display:"flex",gap:6}}>
          {Object.entries(P).map(([k,v])=>(
            <div key={k} style={{flex:1,padding:"7px 8px",borderRadius:8,background:`${v.color}10`,border:`1px solid ${v.color}33`,textAlign:"center"}}>
              <div style={{color:v.color,fontSize:10,fontWeight:700,marginBottom:1}}>{v.short}</div>
              <div style={{color:"#555",fontSize:9,lineHeight:1.4}}>{v.videoMax}<br/>{v.videoSize}</div>
            </div>
          ))}
        </div>
      )}
      {/* Button */}
      <button onClick={()=>canGo&&onNeedAd()} disabled={!canGo}
        style={{width:"100%",marginTop:18,padding:17,borderRadius:14,border:"none",cursor:canGo?"pointer":"not-allowed",background:canGo?"linear-gradient(135deg,#a259ff,#6366f1)":"#1e1e1e",color:canGo?"#fff":"#555",fontSize:16,fontWeight:700,transition:"all 0.2s",boxShadow:canGo?"0 4px 24px rgba(162,89,255,0.4)":"none"}}>
        {proc?"⏳ 変換中...":canGo?"📺 広告を見て変換する":"テキストを入力してください"}
      </button>
      {/* Results */}
      {results&&(
        <div style={{marginTop:24}}>
          <div style={{fontSize:13,color:"#22c55e",marginBottom:14}}>✅ 変換完了！</div>
          {Object.keys(P).map(k=>(
            <ResultCard key={k} pid={k} text={results.texts[k]} imgUrl={results.imgs[k]} link={link} vidSrc={results.vidSrc}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MODE B: URL変換モード ─────────────────────────────────
function UrlMode({ onNeedAd, adDone, setAdDone }) {
  const [url,setUrl]         = useState("");
  const [detected,setDetected] = useState(null);
  const [fetching,setFetching] = useState(false);
  const [fetchErr,setFetchErr] = useState("");
  const [extracted,setExtracted] = useState(null); // {text, platform}
  const [results,setResults]   = useState(null);
  const [proc,setProc]         = useState(false);

  const handleUrl = (v) => {
    setUrl(v); setResults(null); setExtracted(null); setFetchErr("");
    setDetected(detectPlatform(v));
  };

  const fetchContent = async () => {
    if (!url.trim()) return;
    setFetching(true); setFetchErr(""); setExtracted(null); setResults(null);
    try {
      const res = await fetchPostFromUrl(url);
      if (res.error) { setFetchErr(res.error); }
      else { setExtracted(res); }
    } catch(e) { setFetchErr("取得に失敗しました: "+e.message); }
    setFetching(false);
  };

  useEffect(()=>{
    if (!adDone || !extracted) return;
    setAdDone(false);
    (async()=>{
      setProc(true);
      const {text} = extracted;
      const texts={x:toX(text,""),threads:toThreads(text,""),instagram:toInstagram(text)};
      setResults({texts}); setProc(false);
    })();
  },[adDone, extracted]);

  const canConvert = !!extracted && !proc;

  return (
    <div>
      <div style={{padding:"12px 14px",borderRadius:12,background:"#0a1a2a",border:"1px solid #1DA1F244",marginBottom:16,fontSize:13,color:"#7dd3fc",lineHeight:1.6}}>
        💡 X・Threads・InstagramのURLを貼ると、投稿内容を取得して他のSNS用に変換します
      </div>

      {/* URL input */}
      <div style={{fontSize:13,color:"#888",marginBottom:8}}>🔗 投稿URL</div>
      <div style={{position:"relative"}}>
        <input type="url" value={url} onChange={e=>handleUrl(e.target.value)}
          placeholder="https://x.com/... または https://threads.net/..."
          style={{width:"100%",padding:"12px 14px",background:"#141414",border:`1px solid ${detected?P[detected].color+"66":"#2a2a2a"}`,borderRadius:12,color:"#eee",fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
          onFocus={e=>e.target.style.borderColor="#a259ff88"} onBlur={e=>e.target.style.borderColor=detected?P[detected].color+"66":"#2a2a2a"}
        />
        {detected&&(
          <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",padding:"3px 8px",borderRadius:99,background:P[detected].color+"22",color:P[detected].color,fontSize:11,fontWeight:700}}>
            {P[detected].label}
          </div>
        )}
      </div>

      {/* Supported platforms */}
      <div style={{marginTop:8,display:"flex",gap:6}}>
        {Object.entries(P).map(([k,v])=>(
          <div key={k} style={{flex:1,padding:"5px 8px",borderRadius:8,background:detected===k?`${v.color}22`:"#141414",border:`1px solid ${detected===k?v.color+"66":"#1e1e1e"}`,textAlign:"center",transition:"all 0.2s"}}>
            <div style={{color:detected===k?v.color:"#555",fontSize:11,fontWeight:600}}>{v.short}</div>
          </div>
        ))}
      </div>

      {/* Fetch button */}
      <button onClick={fetchContent} disabled={!url.trim()||fetching}
        style={{width:"100%",marginTop:12,padding:14,borderRadius:12,border:"none",cursor:url.trim()?"pointer":"not-allowed",background:url.trim()?"linear-gradient(135deg,#1DA1F2,#0ea5e9)":"#1e1e1e",color:url.trim()?"#fff":"#555",fontSize:15,fontWeight:700,transition:"all 0.2s",boxShadow:url.trim()?"0 4px 20px rgba(29,161,242,0.3)":"none"}}>
        {fetching?"⏳ 投稿を取得中...":"🔍 投稿を取得する"}
      </button>

      {fetchErr&&(
        <div style={{marginTop:10,padding:"10px 14px",borderRadius:10,background:"#1a0808",border:"1px solid #f8717133",color:"#f87171",fontSize:12,lineHeight:1.5}}>
          ⚠️ {fetchErr}<br/>
          <span style={{color:"#666"}}>プライベート設定の投稿や期限切れURLは取得できません。</span>
        </div>
      )}

      {/* Extracted preview */}
      {extracted&&(
        <div style={{marginTop:12,padding:14,borderRadius:12,background:"#0a1a0a",border:"1px solid #22c55e44"}}>
          <div style={{fontSize:12,color:"#22c55e",marginBottom:8,fontWeight:600}}>✅ 投稿を取得しました</div>
          <pre style={{color:"#ddd",fontSize:13,lineHeight:1.6,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"inherit",maxHeight:120,overflow:"auto"}}>{extracted.text}</pre>
        </div>
      )}

      {/* Convert button */}
      {extracted&&(
        <button onClick={()=>canConvert&&onNeedAd()} disabled={!canConvert}
          style={{width:"100%",marginTop:14,padding:17,borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a259ff,#6366f1)",color:"#fff",fontSize:16,fontWeight:700,boxShadow:"0 4px 24px rgba(162,89,255,0.4)"}}>
          {proc?"⏳ 変換中...":"📺 広告を見て変換する"}
        </button>
      )}

      {/* Results */}
      {results&&(
        <div style={{marginTop:24}}>
          <div style={{fontSize:13,color:"#22c55e",marginBottom:14}}>✅ 変換完了！</div>
          {Object.keys(P)
            .filter(k=>extracted?.platform ? k!==extracted.platform : true)
            .map(k=>(
              <ResultCard key={k} pid={k} text={results.texts[k]} link=""/>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [mode,setMode]     = useState(null);   // null=選択, "create", "url"
  const [showAd,setShowAd] = useState(false);
  const [adDone,setAdDone] = useState(false);

  const onNeedAd = () => setShowAd(true);
  const onAdDone = () => { setShowAd(false); setAdDone(true); };

  // TOP: mode selector
  if (!mode) return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#a259ff,#1DA1F2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:16}}>🔄</div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>SNS変換ツール</div>
      <div style={{fontSize:13,color:"#555",marginBottom:40,letterSpacing:1}}>X · THREADS · INSTAGRAM</div>

      <div style={{width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:14}}>
        {/* Create mode */}
        <button onClick={()=>setMode("create")} style={{padding:"22px 24px",borderRadius:18,border:"1px solid #a259ff44",background:"linear-gradient(135deg,#1a0a2e,#0f0f1e)",cursor:"pointer",textAlign:"left",transition:"all 0.2s",boxShadow:"0 4px 24px rgba(162,89,255,0.15)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:"#a259ff22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>✏️</div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>投稿を作成・変換</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>テキスト・画像・動画・リンクを入力して<br/>各SNS用に最適変換する</div>
            </div>
          </div>
          <div style={{marginTop:14,display:"flex",gap:6}}>
            {["📝 テキスト","🖼️ 画像","🎬 動画","🔗 リンク"].map(t=>(
              <div key={t} style={{padding:"3px 8px",borderRadius:99,background:"#a259ff18",color:"#a259ff",fontSize:10,fontWeight:600}}>{t}</div>
            ))}
          </div>
        </button>

        {/* URL mode */}
        <button onClick={()=>setMode("url")} style={{padding:"22px 24px",borderRadius:18,border:"1px solid #1DA1F244",background:"linear-gradient(135deg,#0a1520,#0a0f1e)",cursor:"pointer",textAlign:"left",transition:"all 0.2s",boxShadow:"0 4px 24px rgba(29,161,242,0.15)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:"#1DA1F222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🔗</div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>URLから変換</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>SNSの投稿URLを貼るだけで<br/>他のSNS用テキストに自動変換する</div>
            </div>
          </div>
          <div style={{marginTop:14,display:"flex",gap:6}}>
            {["𝕏 Twitter","Threads","Instagram"].map((t,i)=>(
              <div key={t} style={{padding:"3px 8px",borderRadius:99,background:[`#1DA1F218`,`#a259ff18`,`#E1306C18`][i],color:[`#1DA1F2`,`#a259ff`,`#E1306C`][i],fontSize:10,fontWeight:600}}>{t}</div>
            ))}
          </div>
        </button>
      </div>

      <div style={{marginTop:32,padding:"10px 16px",borderRadius:10,background:"#141414",border:"1px solid #1e1e1e",fontSize:11,color:"#555",textAlign:"center"}}>
        🚀 Vercelデプロイ後は画像・動画もタップ選択可能
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",color:"#fff",maxWidth:480,margin:"0 auto",paddingBottom:80}}>
      {showAd&&<AdModal onDone={onAdDone}/>}

      {/* Header */}
      <div style={{padding:"16px 20px",background:"linear-gradient(180deg,#160a28,#0a0a0a)",borderBottom:"1px solid #1e1e1e",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setMode(null)} style={{background:"#1e1e1e",border:"none",color:"#888",width:34,height:34,borderRadius:10,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800}}>{mode==="create"?"✏️ 投稿を作成・変換":"🔗 URLから変換"}</div>
          <div style={{fontSize:11,color:"#555"}}>X · Threads · Instagram</div>
        </div>
        {/* Mode toggle */}
        <button onClick={()=>setMode(mode==="create"?"url":"create")}
          style={{padding:"5px 12px",borderRadius:99,border:"1px solid #2a2a2a",background:"#141414",color:"#888",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
          {mode==="create"?"🔗 URL変換へ":"✏️ 作成へ"}
        </button>
      </div>

      <div style={{padding:"16px 16px 0"}}>
        {mode==="create"
          ? <CreateMode onNeedAd={onNeedAd} adDone={adDone} setAdDone={setAdDone}/>
          : <UrlMode    onNeedAd={onNeedAd} adDone={adDone} setAdDone={setAdDone}/>
        }
      </div>

      {/* Pro banner */}
      <div style={{margin:"20px 16px 0",padding:16,borderRadius:14,background:"linear-gradient(135deg,#1a0a2e,#0a0f2e)",border:"1px solid #a259ff44",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#a259ff"}}>⚡ Pro版</div>
          <div style={{fontSize:11,color:"#666",marginTop:2}}>広告なし・自動投稿・一括DL</div>
        </div>
        <div style={{padding:"8px 16px",borderRadius:99,background:"#a259ff",color:"#fff",fontSize:12,fontWeight:700}}>¥980/月</div>
      </div>
    </div>
  );
}

// Kupp.no in-browser deal reader. Load on a shop page, then call __I(urls, opts) and __SAVE(shop, src, file).
window.__PARSE=(t)=>{const N=s=>(s||'').replace(/[    ]/g,' ');t=N(t);
const P=s=>{const m=N(s).match(/(\d{1,3}(?:[ .]\d{3})+|\d{1,6})/);return m?parseInt(m[1].replace(/[ .]/g,'')):null};
const before=/(\bfør(pris)?|tidligere(\s*pris)?|ord(inær)?\.?\s*pris|veil(edende)?\.?\s*(utsalgs)?pris|normalpris|laveste pris[^\d\n]{0,40}?30 dager|30-dagers laveste pris|ordinær)\s*:?\s*(kr\.?\s*)?(\d{1,3}(?:[ .]\d{3})+|\d{2,6})/i;
const bm=t.match(before);if(!bm)return null;const was=P(bm[bm.length-1]);if(!was)return null;
const sm=t.match(/\bspar\s*:?\s*(kr\.?\s*)?(\d{1,3}(?:[ .]\d{3})+|\d{1,6})(?!\s*%)/i);
let now=null;if(sm){const s=P(sm[2]);if(s&&s<was)now=was-s;}
if(now==null){const pm=t.match(/\b(pris|nå|kampanjepris|tilbud|tilbudspris)\s*:?\s*(kr\.?\s*)?(\d{1,3}(?:[ .]\d{3})+|\d{2,6})/i);if(pm){const v=P(pm[3]);if(v<was)now=v;}}
if(now==null){const rx=/(\d{1,3}(?:[ .]\d{3})+|\d{2,6})(?:[,.]\d{2})?\s*(?:,-|\.-|kr\b|NOK)/gi;const all=[...t.matchAll(rx)].map(m=>P(m[0])).filter(v=>v&&v<was&&v>was*0.08);const head=t.slice(0,t.search(before));const c=[...head.matchAll(rx)].map(m=>P(m[0])).filter(v=>v&&v<was&&v>was*0.08);if(c.length)now=c[c.length-1];else if(all.length)now=all[0];}
if(now==null||now>=was)return null;return [now,was];};
window.__SEEN=window.__SEEN||new Map();
window.__I=async(urls,o)=>{const W=ms=>new Promise(r=>setTimeout(r,ms));const N=s=>(s||'').replace(/[    ]/g,' ');
const linkRe=new RegExp(o.link);const seen=window.__SEEN;let pages=0,errs=0;const H=x=>x.href.split('?')[0].split('#')[0];
const keyRe=/(\bfør(pris)?|tidligere|ord(inær)?\.?\s*pris|veil(edende)?\.?\s*(utsalgs)?pris|normalpris|30 dager|30-dagers|ordinær)\s*:?\s*(kr\.?\s*)?\d/i;
const scan=(doc)=>{for(const a of doc.querySelectorAll('a[href]')){if(!linkRe.test(a.href))continue;const href=H(a);if(seen.has(href))continue;
 let el=a,card=null;for(let i=0;i<12&&el.parentElement;i++){el=el.parentElement;const hs=new Set([...el.querySelectorAll('a[href]')].filter(x=>linkRe.test(x.href)).map(H));if(hs.size>1)break;if(keyRe.test(N(el.innerText))&&el.querySelector('img')){card=el;break;}}
 if(!card)continue;const pr=window.__PARSE(card.innerText);if(!pr)continue;
 let name=[...card.querySelectorAll(o.nameSel||'h2,h3,h4,[class*="title" i],[class*="name" i]')].map(x=>N(x.innerText).trim()).filter(x=>x.length>6&&!/\d+\s*(kr|,-)/.test(x)).sort((x,y)=>y.length-x.length)[0]||N(a.innerText).trim()||(card.querySelector('img')||{}).alt||'';
 name=name.split('\n')[0].trim().slice(0,110);
 const img=[...card.querySelectorAll('img')].map(i=>i.currentSrc||i.getAttribute('src')||(i.getAttribute('srcset')||'').split(' ')[0]||i.getAttribute('data-src')||'').filter(s=>s&&!s.startsWith('data:')&&!/splash|logo|badge|icon|sprite|energy|\.svg/i.test(s))[0]||'';
 const im=img?new URL(img,doc.location.href).href:'';
 if(name)seen.set(href,[name,pr[0],pr[1],o.keepQ?im:im.split('?')[0],href]);}};
window.__scan=scan;
const load=(u)=>new Promise(res=>{const f=document.createElement('iframe');f.style.cssText='position:fixed;left:0;top:0;width:1280px;height:2400px;opacity:0;pointer-events:none;z-index:-1';
 let done=false;const fin=async()=>{if(done)return;done=true;try{const d=f.contentDocument;for(let i=0;i<(o.scrolls||6);i++){f.contentWindow.scrollBy(0,1200);await W(o.wait||400);}
 if(o.more){for(let k=0;k<(o.moreTimes||8);k++){const b=[...d.querySelectorAll('button,a')].find(x=>new RegExp(o.more,'i').test(x.innerText||''));if(!b)break;b.click();await W(o.moreWait||2500);f.contentWindow.scrollBy(0,4000);await W(500);}}
 await W(800);scan(d);pages++;}catch(e){errs++;window.__ERR=String(e)}f.remove();res();};
 f.onload=()=>setTimeout(fin,o.settle||3000);setTimeout(fin,o.timeout||60000);f.src=u;document.body.appendChild(f);});
window.__PROG={pages:0,errs:0,total:urls.length,done:false};
for(let i=0;i<urls.length;i+=(o.par||3)){await Promise.all(urls.slice(i,i+(o.par||3)).map(load));window.__PROG.pages=pages;window.__PROG.errs=errs;}
window.__PROG.done=true;return {pages,errs,found:seen.size};};
window.__SAVE=(shop,src,file,min)=>{const all=[...window.__SEEN.values()].filter(x=>1-x[1]/x[2]>=(min||0.3)).sort((x,y)=>(1-y[1]/y[2])-(1-x[1]/x[2]));const out={shop,src,read:new Date().toISOString(),imgBase:"",urlBase:"",d:all};const b=new Blob([JSON.stringify(out)],{type:"application/json"});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=file;document.body.appendChild(a);a.click();a.remove();window.__SAVED={file,items:all.length,bytes:b.size};return window.__SAVED;};
// Look at the current page: which links look like products, and a sample card text
window.__PEEK=(re)=>{const N=s=>(s||'').replace(/[    ]/g,' ');const linkRe=new RegExp(re);const as=[...document.querySelectorAll('a[href]')].filter(a=>linkRe.test(a.href));
 const uniq=[...new Set(as.map(a=>a.href.split('?')[0]))];let card=null;for(const a of as){let el=a;for(let i=0;i<10&&el.parentElement;i++){el=el.parentElement;const hs=new Set([...el.querySelectorAll('a[href]')].filter(x=>linkRe.test(x.href)).map(x=>x.href.split('?')[0]));if(hs.size>1)break;if(/\d/.test(el.innerText)&&el.querySelector('img')&&el.innerText.length>40){card=N(el.innerText).slice(0,260);break;}}if(card)break;}
 return {count:uniq.length,sample:uniq.slice(0,2),card,parse:card?window.__PARSE(card):null};};
"kupp scraper loaded";

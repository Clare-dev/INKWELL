const $=(s,r=document)=>r.querySelector(s),sh=a=>a.split('.')[0];
const ICON={light:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',dark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'};
const LOGO='<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c4 6 8 9.5 8 14.5a8 8 0 0 1-16 0C8 12.500 12 9 16 3z" fill="var(--ac)"/><path d="M12 24h8" stroke="var(--bg)" stroke-width="2" stroke-linecap="round"/></svg>';
const page=location.pathname.split('/').pop()||'index.html';
const fav=document.createElement('link');fav.rel='icon';fav.href='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 3c4 6 8 9.5 8 14.5a8 8 0 0 1-16 0C8 12.5 12 9 16 3z" fill="#0b6b4a"/><path d="M12 24h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>');document.head.append(fav);
const L=[['index.html','Home'],['order.html','Order'],['proof.html','Proof'],['faq.html','FAQ']];
$('#top').outerHTML=`<header class="nav"><div class="w"><a class="logo" href="index.html">${LOGO}Inkwell</a><nav class="nl">${L.map(([h,t])=>`<a href="${h}" class="${page===h?'on':''}">${t}</a>`).join('')}<button class="tg" id="tg" aria-label="Toggle colour theme"></button><a class="btn pri sm" href="order.html">Place an order</a></nav></div></header>`;
$('#foot').outerHTML=`<footer><div class="w"><span>Inkwell · built for NEAR HACKATHON 2026 · runs on NEAR testnet</span><nav>${L.map(([h,t])=>`<a href="${h}">${t}</a>`).join('')}</nav></div></footer>`;
const root=document.documentElement,setT=t=>{root.dataset.theme=t;$('#tg').innerHTML=ICON[t];try{localStorage.setItem('iw-theme',t)}catch(e){}};
setT(root.dataset.theme||'light');$('#tg').onclick=()=>setT(root.dataset.theme==='dark'?'light':'dark');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach(e=>io.observe(e));
function count(el,to){if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=to;return}let t0;const f=t=>{t0??=t;const p=Math.min(1,(t-t0)/900);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
const OK=['sale','payout','delivered','distribution','escrow_released','resume'],BAD=['blocked','chain_rejected','order_rejected','order_refunded','order_failed','ai_failed','kill','walk_away'];
function fmt(t,d){switch(t){
 case'sale':return['Order received',`${d.id} · ${d.price} units · ${d.token} · escrow ${d.escrow}`];
 case'bids_revealed':return['Sealed bids',`${d.task}: `+d.bids.map(b=>`${sh(b.agent)} ${b.price}`).join(' vs ')];
 case'counter':return['Counter-offer',`${sh(d.agent)} quoted above plan; manager offered ${d.offered}`];
 case'walk_away':return['Manager walked away',sh(d.agent)+' would not meet the plan'];
 case'payout':return['Payout',`${d.task} → ${d.agent} · ${d.price} units`];
 case'delivered':return['Delivered',`${d.id} · draft delivered`];
 case'distribution':return['Profit split',`${d.kind} receives ${d.amount} units`];
 case'escrow_released':return['Escrow released',`profit ${d.profit} · treasury ${d.treasury} · contributors ${d.contributors}`];
 case'attack':return['Attack attempt',d.what];
 case'blocked':return['Blocked',`${d.agent} · ${d.reason}`];
 case'chain_rejected':return['Refused on-chain',/per-payout cap/.test(d.reason)?'The contract refused: over the per-payout cap':/allowed by the access key/.test(d.reason)?'The access key refused: method not allowed':'Refused by the contract'];
 case'attestation':return['Private model attested',`${d.model} · nonce echoed: ${d.nonce_echoed} · hardware quote present: ${d.has_intel_quote}`];
 case'order_from_web':return['Order accepted','Running on NEAR testnet'];
 case'ai_failed':return['Private model did not answer','No draft could be written'];
 case'ai_retry':return['Retrying the private model','Attempt '+d.attempt+' did not answer in time'];
 case'order_refunded':return['Order cancelled and refunded',d.reason];
 case'order_failed':return['Order failed',d.reason];
 case'order_rejected':return['Order rejected',`${d.id} · ${d.reason}`];
 case'kill':return['Kill switch on','All payments and orders are halted'];
 case'resume':return['Kill switch off','Studio resumed'];
 default:return[t.replace(/_/g,' '),d.note||'']}}
function add(box,t,d){const{tx,...r}=d||{},[h,x]=fmt(t,r),e=document.createElement('div');e.className='ev '+(OK.includes(t)?'ok':BAD.includes(t)?'bad':'');
 const b=document.createElement('b');b.textContent=h;const s=document.createElement('span');s.textContent=x;
 if(tx){const a=document.createElement('a');a.href='https://testnet.nearblocks.io/txns/'+tx;a.target='_blank';a.rel='noopener';a.textContent='view tx ↗';s.append(a)}
 const w=document.createElement('div');w.append(b,s);e.append(w);box.append(e);box.scrollTop=box.scrollHeight}
async function proof(){const a=await (await fetch('testnet-proof.json')).json();return{rows:a,tx:a.filter(e=>e.tx).length,rj:a.filter(e=>e.type==='chain_rejected').length}}
window.IW={add,proof,count};

/**
 * botimi Widget Loader Route
 *
 * Serves the vanilla JS widget script that renders the chat bubble
 * on a customer's website. This is a PUBLIC endpoint (no auth) —
 * bots are identified by their apiKey (bot ID) in botimiConfig.
 */
import { Router } from "express";
import db from "../db/index.js";
import { handleChatMessage } from "./chat.js";

const router = Router();

// CORS itself is handled centrally in index.js (a dynamic per-request origin
// delegate — /api/chat and /api/widget allow any origin there). What's
// needed here is Cross-Origin-Resource-Policy: Helmet's default
// "same-origin" blocks a real customer site from even loading loader.js as
// a <script src>, independent of CORS — a different browser mechanism
// (CORS governs fetch/XHR reads, CORP governs whether the resource can be
// embedded at all).
router.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

/**
 * GET /api/widget/loader.js
 * Serves the widget JavaScript bundle.
 * The bot config is read from window.botimiConfig set by the embed snippet.
 */
router.get("/loader.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");

  const apiBase = `${req.protocol}://${req.get('host')}`;
  const widgetJS = `(function(){'use strict';
var c=window.botimiConfig||{},k=c.apiKey||'',t=c.theme||'dark',p=c.position||'bottom-right',cl=c.color||'#c0c1ff',hb=c.hideBranding||false;
if(!k){console.warn('[botimi] No apiKey found.');return;}
var B='${apiBase}';
var s=document.createElement('style');
s.textContent='#botimi-wc{all:initial;position:fixed;z-index:999999;'+(p==='bottom-left'?'left:20px;':'right:20px;')+'bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}'+
'#botimi-wc *{box-sizing:border-box}'+
'.bb{width:60px;height:60px;border-radius:50%;background:'+cl+';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s}'+
'.bb:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,.35)}'+
'.bb svg{width:28px;height:28px}'+
'.bcp{position:fixed;'+(p==='bottom-left'?'left:20px;':'right:20px;')+'bottom:90px;width:380px;max-width:calc(100vw-40px);height:560px;max-height:calc(100vh-120px);border-radius:16px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.3);'+(t==='light'?'background:#fff;color:#1a1a2e;':'background:#1a1a2e;color:#e0e0e0;')+'}'+
'.bcp.open{display:flex}'+
'.bh{padding:16px;background:'+cl+';color:#fff;display:flex;align-items:center;gap:12px}'+
'.bha{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px}'+
'.bht{flex:1;font-weight:600;font-size:14px}'+
'.bhc{cursor:pointer;opacity:.7;font-size:20px;line-height:1}'+
'.bhc:hover{opacity:1}'+
'.bm{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}'+
'.bmsg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-wrap:break-word}'+
'.bmsg.bot{align-self:flex-start;'+(t==='light'?'background:#f0f0f5;color:#1a1a2e;':'background:#2a2a3e;color:#e0e0e0;')+'border-bottom-left-radius:4px}'+
'.bmsg.user{align-self:flex-end;background:'+cl+';color:#fff;border-bottom-right-radius:4px}'+
'.bi{padding:12px 16px;border-top:1px solid '+(t==='light'?'#e0e0e0':'#2a2a3e')+';display:flex;gap:8px}'+
'.bi input{flex:1;border:none;border-radius:20px;padding:10px 16px;font-size:13px;outline:none;'+(t==='light'?'background:#f0f0f5;color:#1a1a2e;':'background:#2a2a3e;color:#e0e0e0;')+'}'+
'.bi input::placeholder{'+(t==='light'?'color:#999':'color:#666')+'}'+
'.bsb{width:38px;height:38px;border-radius:50%;background:'+cl+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
'.bsb svg{width:18px;height:18px;fill:#fff}'+
'.btyping{align-self:flex-start;display:flex;gap:4px;padding:10px 14px;'+(t==='light'?'background:#f0f0f5;':'background:#2a2a3e;')+'border-radius:14px;border-bottom-left-radius:4px}'+
'.btyping span{width:6px;height:6px;border-radius:50%;'+(t==='light'?'background:#999;':'background:#666;')+'animation:bb 1.2s infinite}'+
'.btyping span:nth-child(2){animation-delay:.2s}'+
'.btyping span:nth-child(3){animation-delay:.4s}'+
'@keyframes bb{0\\%{transform:translateY(0)}30\\%{transform:translateY(-6px)}60\\%,100\\%{transform:translateY(0)}}'+
'.bpw{text-align:center;font-size:10px;padding:6px;opacity:.4}'+
'.bpx{position:fixed;'+(p==='bottom-left'?'left:20px;':'right:20px;')+'bottom:90px;max-width:260px;padding:12px 14px;border-radius:14px;'+(p==='bottom-left'?'border-bottom-left-radius:4px;':'border-bottom-right-radius:4px;')+(t==='light'?'background:#fff;color:#1a1a2e;':'background:#1a1a2e;color:#e0e0e0;')+'box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:13px;line-height:1.5;cursor:pointer;display:flex;align-items:flex-start;gap:8px;animation:bpin .25s ease-out}'+
'.bpx .bpxc{opacity:.5;font-size:16px;line-height:1;flex-shrink:0}'+
'.bpx .bpxc:hover{opacity:1}'+
'@keyframes bpin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(s);
var d=document.createElement('div');d.id='botimi-wc';
var pnl=document.createElement('div');pnl.className='bcp';
pnl.innerHTML='<div class="bh"><div class="bha">B</div><div class="bht">botimi AI</div><div class="bhc" id="bcx">&times;</div></div><div class="bm" id="bms"><div class="bmsg bot">Hello! I\\'m your AI assistant. How can I help you today?</div></div><div class="bi"><input type="text" id="bip" placeholder="Type your message..."/><button class="bsb" id="bsnd"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>'+(hb?'':'<div class="bpw">Powered by botimi</div>');
var bbl=document.createElement('div');bbl.className='bb';
bbl.innerHTML='<svg viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';
d.appendChild(pnl);d.appendChild(bbl);document.body.appendChild(d);
var op=0,me=document.getElementById('bms'),ip=document.getElementById('bip'),sb=document.getElementById('bsnd'),cx=document.getElementById('bcx');
function tg(){op=!op;pnl.classList.toggle('open',op);bbl.style.display=op?'none':'flex';hidePx();}
bbl.addEventListener('click',tg);cx.addEventListener('click',tg);
function am(t,r){var dv=document.createElement('div');dv.className='bmsg '+r;dv.textContent=t;me.appendChild(dv);me.scrollTop=me.scrollHeight;}
function sty(){var dv=document.createElement('div');dv.className='btyping';dv.id='btyp';dv.innerHTML='<span></span><span></span><span></span>';me.appendChild(dv);me.scrollTop=me.scrollHeight;}
function hty(){var e=document.getElementById('btyp');if(e)e.remove();}
async function sm(){var t=ip.value.trim();if(!t)return;ip.value='';am(t,'user');sty();
try{var r=await fetch(B+'/api/widget/'+k+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,conversationId:c.cid||null})});
if(!r.ok)throw new Error('Request failed');var d=await r.json();hty();am(d.reply||'No response','bot');if(d.conversationId)c.cid=d.conversationId;}
catch(e){hty();am('Sorry, I\\'m having trouble connecting. Please try again later.','bot');console.error('[botimi]',e);}}
sb.addEventListener('click',sm);ip.addEventListener('keydown',function(e){if(e.key==='Enter')sm();});
var px=null;
function hidePx(){if(px){px.remove();px=null;}}
function showPx(msg){if(op||px)return;px=document.createElement('div');px.className='bpx';px.innerHTML='<span>'+msg.replace(/</g,'&lt;')+'</span><span class="bpxc">&times;</span>';px.addEventListener('click',function(e){if(e.target.classList.contains('bpxc')){hidePx();}else{hidePx();tg();}});document.body.appendChild(px);}
fetch(B+'/api/widget/'+k+'/config').then(function(r){return r.ok?r.json():null;}).then(function(cfg){
if(cfg&&cfg.proactiveMessage){setTimeout(function(){showPx(cfg.proactiveMessage);},Math.max((cfg.proactiveDelaySeconds||15),3)*1000);}
}).catch(function(){});
})();`;

  res.send(widgetJS);
});

/**
 * GET /api/widget/:apiKey/config
 * Public, lightweight config the loader script fetches on load — currently
 * just the proactive-message settings. Kept separate from the embed
 * snippet's window.botimiConfig so existing installs don't need to change
 * their snippet every time a new bot setting needs to reach the widget.
 */
router.get("/:apiKey/config", (req, res) => {
  const bot = db.prepare("SELECT proactive_message, proactive_delay_seconds FROM bots WHERE id = ? AND is_active = 1").get(req.params.apiKey);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  res.json({
    proactiveMessage: bot.proactive_message || "",
    proactiveDelaySeconds: bot.proactive_delay_seconds ?? 15,
  });
});

/**
 * POST /api/widget/:apiKey/chat
 * Public endpoint called by the widget from customer websites.
 * Delegates to the same logic as POST /api/chat/message (see chat.js) —
 * these were previously two separate, drifted implementations, which is
 * how this one ended up silently broken (wrong field name reading the RAG
 * result) and missing the confidence/escalation logic entirely.
 */
router.post("/:apiKey/chat", async (req, res) => {
  try {
    const { message, conversationId, visitorId, visitorName } = req.body;
    const result = await handleChatMessage({ apiKey: req.params.apiKey, message, conversationId, visitorId, visitorName });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[Widget Chat] Error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

export default router;

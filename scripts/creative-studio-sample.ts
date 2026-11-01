/** Free, reproducible production sample. Does not call a generative API. */
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const web=createRequire(path.join(root,'apps/web/package.json'));
const next=createRequire(web.resolve('next/package.json'));
const sharp=next('sharp');
const {createElement}=web('react');
const {renderToStaticMarkup}=web('react-dom/server');
const {Coffee}=web('lucide-react');
const {jsPDF}=web('jspdf');
const destination=process.argv[2];
if(!destination||!path.isAbsolute(destination))throw new Error('Pass an absolute output project folder.');
const out=destination;
const motion=path.join(out,'motion-source/pause-video');
await mkdir(motion,{recursive:true});
const icon=renderToStaticMarkup(createElement(Coffee,{width:420,height:420,strokeWidth:1.1,color:'#f7efe0'}));
const iconInner=icon.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
const svg=(headline:string[],body:string[],number:string,dark=false)=>{
 const bg=dark?'#243d30':'#f4ecdc',fg=dark?'#f4ecdc':'#243d30';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="${bg}"/><text x="80" y="110" font-family="Arial" font-weight="bold" font-size="26" letter-spacing="7" fill="${fg}">PAUSE / COFFEE</text><text x="1000" y="110" text-anchor="end" font-family="Arial" font-size="22" fill="${fg}">${number}</text><circle cx="800" cy="870" r="275" fill="#ce7244"/><g transform="translate(620 680) scale(15)" fill="none" stroke="#f7efe0" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${iconInner}</g>${headline.map((s,i)=>`<text x="80" y="${260+i*115}" font-family="Georgia" font-size="104" letter-spacing="-4" fill="${fg}">${s}</text>`).join('')}${body.map((s,i)=>`<text x="80" y="${560+i*47}" font-family="Arial" font-size="32" fill="${fg}">${s}</text>`).join('')}<line x1="80" y1="1210" x2="1000" y2="1210" stroke="${fg}" opacity=".3"/><text x="80" y="1270" font-family="Arial" font-size="22" fill="${fg}">A little space. A better next step.</text><text x="1000" y="1270" text-anchor="end" font-family="Arial" font-size="18" fill="${fg}">CONCEPT BRAND</text></svg>`;
};
const slides=[
 {title:['Your next idea','needs a pause.'],body:['Five small ways to make room.','Start with the one you need today.'],alt:'Cream opening slide: Your next idea needs a pause. Terracotta circle with a line illustration of a coffee cup.'},
 {title:['Close one tab.','Open some space.'],body:['Leave the unfinished thought on paper.','You can return to it.'],alt:'Cream slide encouraging the reader to close one tab and write down an unfinished thought, beside a coffee cup illustration.'},
 {title:['Put the phone','out of reach.'],body:['Give this moment your full attention.','Nothing to scroll. Nothing to solve.'],alt:'Cream slide inviting the reader to put their phone out of reach and give the moment their attention.'},
 {title:['Sip slowly.','Look outside.'],body:['Notice one thing beyond the screen.','Let the next thought arrive.'],alt:'Cream slide with the words Sip slowly. Look outside. and a terracotta coffee cup motif.'},
 {title:['Then come back','with intention.'],body:['Choose one useful next step.','Save this for your next coffee break.'],alt:'Forest-green closing slide: Then come back with intention. Choose one useful next step. Save this for your next coffee break.'},
];
const ad=svg(['Good coffee.','Room to think.'],['Make your next break a real one.','Meet Pause Coffee.'],'AD',true);
await writeFile(path.join(out,'pause-static-ad.svg'),ad);
await sharp(Buffer.from(ad)).png().toFile(path.join(out,'pause-static-ad.png'));
const pdf=new jsPDF({unit:'px',format:[1080,1350],orientation:'portrait',compress:true,hotfixes:['px_scaling']});
for(const [i,slide] of slides.entries()){
 const source=svg(slide.title,slide.body,`${i+1} / ${slides.length}`,i===4);
 const name=`carousel-${String(i+1).padStart(2,'0')}`;
 await writeFile(path.join(out,name+'.svg'),source);
 const png=await sharp(Buffer.from(source)).png().toBuffer();
 await writeFile(path.join(out,name+'.png'),png);
 if(i)pdf.addPage([1080,1350]); pdf.addImage(png.toString('base64'),'PNG',0,0,1080,1350,undefined,'FAST');
}
await writeFile(path.join(out,'pause-carousel.pdf'),Buffer.from(pdf.output('arraybuffer')));
await writeFile(path.join(out,'carousel-copy.json'),JSON.stringify({caption:'A coffee break can be a small reset. Close one tab, set the phone aside, and choose your next step when you return. Which pause will you try today?',slides},null,2));
const gsap=createRequire(path.join(root,'apps/daemon/package.json')).resolve('gsap/dist/gsap.min.js');
await copyFile(gsap,path.join(motion,'gsap.min.js'));
const sound=await fetch('https://remotion.media/page-turn.wav');if(!sound.ok)throw new Error('Sound download failed');
await writeFile(path.join(motion,'page-turn.wav'),Buffer.from(await sound.arrayBuffer()));
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="od-motion-output" content="video"><link rel="alternate" type="video/mp4" href="../../pause-video.mp4"><script src="./gsap.min.js"></script><style>*{box-sizing:border-box}html,body{margin:0;width:720px;height:1280px;overflow:hidden;background:#243d30;font-family:Arial;color:#f4ecdc}#root{width:720px;height:1280px;position:relative}.brand{position:absolute;top:95px;left:60px;letter-spacing:6px;font-size:22px}.scene{position:absolute;left:60px;top:240px;width:600px;opacity:0}.scene h1{font:80px/1.05 Georgia;letter-spacing:-3px;margin:0 0 36px}.scene p{font-size:26px;line-height:1.5}.cup{position:absolute;left:270px;top:640px;width:360px;height:360px;background:#ce7244;border-radius:50%;display:grid;place-items:center}.cup svg{width:260px;height:260px}.end{position:absolute;bottom:110px;left:60px;font-size:18px;letter-spacing:2px}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="9" data-width="720" data-height="1280"><div class="brand">PAUSE / COFFEE</div><section class="scene s1"><h1>One more tab?</h1><p>Maybe what you need is a pause.</p></section><section class="scene s2"><h1>Close the screen.<br>Find a moment.</h1><p>Good coffee. A little room to think.</p></section><section class="scene s3"><h1>Come back<br>with intention.</h1><p>Make your next break a real one.</p></section><div class="cup">${icon}</div><div class="end">PAUSE COFFEE · CONCEPT BRAND</div><audio id="page-turn-first" src="page-turn.wav" data-start="3" data-duration="0.4" data-volume="0.3"></audio><audio id="page-turn-second" src="page-turn.wav" data-start="6" data-duration="0.4" data-volume="0.3"></audio></div><script>window.__timelines={};const tl=gsap.timeline({paused:true});window.__timelines.main=tl;tl.fromTo('.s1',{opacity:0,y:24},{opacity:1,y:0,duration:.5},0).to('.s1',{opacity:0,y:-20,duration:.3},2.7).fromTo('.s2',{opacity:0,y:24},{opacity:1,y:0,duration:.5},3).to('.s2',{opacity:0,y:-20,duration:.3},5.7).fromTo('.s3',{opacity:0,y:24},{opacity:1,y:0,duration:.5},6).fromTo('.cup',{scale:.85,rotation:-8},{scale:1,rotation:0,duration:1,ease:'power2.out'},0).to('.cup',{y:-20,duration:3,ease:'sine.inOut',yoyo:true,repeat:1},1);</script></body></html>`;
await writeFile(path.join(motion,'index.html'),html);
await copyFile(web.resolve('lucide-react/LICENSE'),path.join(out,'LUCIDE-LICENSE.txt'));
await writeFile(path.join(out,'asset-provenance.json'),JSON.stringify({paidGenerationSpend:0,brand:'Fictional sample, no actual product or offer',assets:[{name:'Coffee icon',source:'https://lucide.dev/icons/coffee',package:'lucide-react',license:'ISC (retained)',usedIn:'static ad, five carousel slides, video'},{name:'Page turn',source:'https://www.remotion.dev/docs/sfx/page-turn',file:'https://remotion.media/page-turn.wav',license:'CC0, Draw Knife 1 by kenney.nl, per Remotion sound page',usedIn:'video transitions at 3s and 6s, gain 0.3'},{name:'GSAP',source:'https://gsap.com/',usedIn:'timeline fades, positional entrance, cup motion',license:'See installed GSAP package license'},{name:'HyperFrames',source:'https://github.com/heygen-com/hyperframes',usedIn:'OpenDesign native scaffold and MP4 render',license:'Apache-2.0'}]},null,2));
await writeFile(path.join(out,'preview.html'),`<!doctype html><html><head><title>Pause Coffee — production test</title><style>body{margin:30px;background:#f4ecdc;color:#243d30;font:18px Arial}h1{font:48px Georgia}.grid{display:flex;gap:20px;flex-wrap:wrap}img{width:270px;border-radius:8px}video{width:270px}a{color:inherit}</style></head><body><h1>Pause Coffee / production test</h1><p>Actual exports and editable masters. Fictional campaign. $0 paid generation.</p><h2>Video · 9 seconds</h2><video src="pause-video.mp4" controls></video><h2>Static ad</h2><a href="pause-static-ad.svg"><img src="pause-static-ad.png" alt="Good coffee. Room to think. Pause Coffee static ad."></a><h2>Carousel · 5 slides</h2><div class="grid">${slides.map((s,i)=>`<a href="carousel-0${i+1}.svg"><img src="carousel-0${i+1}.png" alt="${s.alt}"></a>`).join('')}</div><p><a href="pause-carousel.pdf">Carousel PDF</a> · <a href="carousel-copy.json">Caption and alt text</a> · <a href="asset-provenance.json">Asset provenance</a></p></body></html>`);
console.log(JSON.stringify({output:out,staticAd:'pause-static-ad.png',carouselSlides:5,videoComposition:'motion-source/pause-video/index.html',paidGenerationSpend:0}));




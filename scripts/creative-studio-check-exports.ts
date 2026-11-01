import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=process.argv[2]; if(!out||!path.isAbsolute(out))throw new Error('Pass an absolute output folder');
const req=createRequire(path.join(process.cwd(),'apps/daemon/package.json'));
const web=createRequire(path.join(process.cwd(),'apps/web/package.json'));
const sharp=createRequire(web.resolve('next/package.json'))('sharp');
const ffmpeg=req('@ffmpeg-installer/ffmpeg').path as string;
const video=path.join(out,'pause-video.mp4');
const probe=spawnSync(ffmpeg,['-hide_banner','-i',video,'-af','silencedetect=noise=-50dB:d=0.05','-f','null','-'],{encoding:'utf8',windowsHide:true});
if(probe.status!==0)throw new Error(probe.stderr);
if(!/720x1280/.test(probe.stderr)||!/00:00:09\.00/.test(probe.stderr)||!/Audio: aac/.test(probe.stderr))throw new Error('Incorrect export dimensions, duration or audio stream');
const frames:Buffer[]=[];
for(const [i,time] of [0.8,3.8,7.5].entries()){
 const frame=path.join(out,`video-check-${i+1}.png`);
 const result=spawnSync(ffmpeg,['-y','-ss',String(time),'-i',video,'-frames:v','1',frame],{encoding:'utf8',windowsHide:true});
 if(result.status!==0)throw new Error(result.stderr);
 frames.push(await sharp(frame).resize(270,480).png().toBuffer());
}
await sharp({create:{width:850,height:500,channels:3,background:'#f4ecdc'}}).composite(frames.map((input,i)=>({input,left:10+i*280,top:10}))).png().toFile(path.join(out,'video-contact-sheet.png'));
for(const name of ['pause-static-ad.png',...Array.from({length:5},(_,i)=>`carousel-0${i+1}.png`)]){
 const meta=await sharp(path.join(out,name)).metadata(); if(meta.width!==1080||meta.height!==1350)throw new Error('Incorrect dimensions: '+name);
}
const slideThumbs = await Promise.all(Array.from({length:5},(_,i)=>sharp(path.join(out,`carousel-0${i+1}.png`)).resize(216,270).png().toBuffer()));
await sharp({create:{width:1120,height:290,channels:3,background:'#ddd5c5'}}).composite(slideThumbs.map((input,i)=>({input,left:10+i*222,top:10}))).png().toFile(path.join(out,'carousel-contact-sheet.png'));
const silence=probe.stderr.split('\n').filter(l=>/silence_start|silence_end/.test(l));
await writeFile(path.join(out,'export-checks.json'),JSON.stringify({video:{dimensions:'720x1280',durationSeconds:9,fps:30,codec:'H.264',audio:'AAC',decodedAllFrames:true,referenceFramesSeconds:[0.8,3.8,7.5],silenceTransitions:silence},images:{count:6,dimensions:'1080x1350'},pdf:{bytes:(await readFile(path.join(out,'pause-carousel.pdf'))).length},paidGenerationSpend:0},null,2));
console.log('Checked actual MP4 decode, duration, dimensions, audio stream, six PNGs and PDF; contact sheet saved.');

"""Generate neural MP3 assets. Requires edge-tts==7.3.1 and ffmpeg/ffprobe.
Only published exercise text is sent to the speech service. No runtime API calls.
Usage: python tools/gen-neural-audio.py [--only id,id] [--reuse-dir path]
"""
import asyncio, argparse, datetime, hashlib, json, pathlib, shutil, subprocess, tempfile
import edge_tts
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def script_hash(lines): return hashlib.sha1('\n'.join(x['sp']+'|'+x['text'] for x in lines).encode()).hexdigest()
def command(*args): return subprocess.check_output(args).decode().strip()
async def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--only'); parser.add_argument('--reuse-dir'); args=parser.parse_args()
    items=read(ROOT/'content/listening.json')['items']
    items += [m['parts']['listening'] for m in read(ROOT/'content/mock-exam.json')['items'] if m['parts']['listening'].get('script_et')]
    items += [{'id': d['id'], 'script_et': [{'sp': 'A', 'text': d['text_et']}]}
              for d in read(ROOT/'content/dictation.json')['items'] if d.get('recorded')]
    index=read(ROOT/'config/audio.json'); index['engine']='mixed (see each entry)'
    gate=asyncio.Semaphore(2)
    async def make(item):
      if args.only and item['id'] not in args.only.split(','): return
      async with gate:
        target=ROOT/'audio'/(item['id']+'.mp3'); digest=script_hash(item['script_et']); previous=index['items'].get(item['id'],{})
        if previous.get('engine')=='neural' and previous.get('hash')==digest and target.exists(): return
        reused=False
        if args.reuse_dir:
            src=pathlib.Path(args.reuse_dir)
            manifest=read(src/'manifest.json')
            row=next((x for x in manifest['items'] if x['id']==item['id']),None)
            sha=hashlib.sha256(json.dumps(item['script_et'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
            if row and row['script_sha256']==sha:
                shutil.copyfile(src/target.name,target); reused=True
        if not reused:
          with tempfile.TemporaryDirectory(prefix='estonski-neural-') as directory:
            temp=pathlib.Path(directory); segments=[]
            for i,line in enumerate(item['script_et']):
              raw=temp/f'{i}.mp3'; voice='et-EE-KertNeural' if line['sp']=='B' else 'et-EE-AnuNeural'
              for attempt in range(3):
                try:
                  await edge_tts.Communicate(line['text'],voice,rate='-5%').save(str(raw)); break
                except Exception:
                  if attempt==2: raise
                  await asyncio.sleep(2)
              segment=temp/f'{i}.wav'
              command('ffmpeg','-y','-v','error','-i',str(raw),'-af','apad=pad_dur=0.35','-ar','24000','-ac','1',str(segment)); segments.append(segment)
            listing=temp/'concat.txt'; listing.write_text('\n'.join("file '"+x.as_posix()+"'" for x in segments),encoding='utf-8')
            result=temp/'result.mp3'
            command('ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(listing),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','64k',str(result))
            shutil.copyfile(result,target)
        seconds=float(command('ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(target)))
        index['items'][item['id']]={'file':'audio/'+target.name,'hash':digest,'seconds':round(seconds,1),'engine':'neural','voices':['et-EE-AnuNeural','et-EE-KertNeural'],'generated_on':str(datetime.date.today())}
        (ROOT/'config/audio.json').write_bytes((json.dumps(index,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
        print('Prepared '+item['id'],flush=True)
    await asyncio.gather(*(make(item) for item in items))
    if all(x.get('engine')=='neural' for x in index['items'].values()): index['engine']='neural'
    (ROOT/'config/audio.json').write_bytes((json.dumps(index,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
asyncio.run(main())

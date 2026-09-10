document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.video-thumb img').forEach(img => {
    const id=img.getAttribute('src').split('/vi/')[1]?.split('/')[0];
    if(!id)return;
    const fallback=()=>{img.onerror=null;img.src='assets/video-thumbnails/'+id+'.jpg';};
    img.onerror=fallback;
    if(img.complete&&!img.naturalWidth)fallback();
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const page = location.pathname.split('/').pop() || 'index.html';
  const nav = document.querySelector('.nav');
  const links = nav?.querySelector('.nav-links');
  if (links) {
    links.id = 'site-menu';
    const menu = document.createElement('button');
    menu.type = 'button'; menu.className = 'nav-toggle'; menu.textContent = 'Menu';
    menu.setAttribute('aria-controls', links.id); menu.setAttribute('aria-expanded', 'false');
    const closeMenu = () => { links.classList.remove('open'); menu.setAttribute('aria-expanded','false'); };
    menu.onclick = () => {const open = links.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));};
    nav.querySelector('.nav-inner').append(menu);
    links.querySelectorAll('a').forEach(a => {if(a.getAttribute('href') === page) {a.classList.add('active');a.setAttribute('aria-current','page');} a.addEventListener('click',closeMenu);});
    document.addEventListener('keydown',e => {if(e.key === 'Escape') closeMenu();});
  }
  const reveals = new IntersectionObserver(entries => entries.forEach(e => {if(e.isIntersecting){e.target.classList.remove('waiting');e.target.classList.add('in-view');reveals.unobserve(e.target);}}), {threshold: .06});
  document.querySelectorAll('.reveal').forEach(el => {el.classList.add('waiting');reveals.observe(el);});

  // Each row has one canonical set of items; visual copies make the loop continuous.
  const rows = [];
  document.querySelectorAll('.carousel').forEach((row, rowIndex) => {
    row.id ||= 'carousel-' + rowIndex;
    row.tabIndex = 0; row.setAttribute('role','region');
    const originals = [...row.children]; if(originals.length < 2) return;
    const controls = document.createElement('div'); controls.className = 'carousel-controls';
    const label = row.getAttribute('aria-label') || 'Gallery';
    controls.innerHTML = '<span>' + originals.length + ' items · Drag or use the arrows</span><div><button type="button" data-prev aria-label="Previous items">←</button><button type="button" data-next aria-label="Next items">→</button></div>';
    row.after(controls);
    controls.querySelectorAll('button').forEach(b => b.setAttribute('aria-controls', row.id));
    let hovering=false, touching=false, focused=false, userPaused=false, resumeAt=0, dragging=false, startX=0, startScroll=0, moved=false;
    const state = {row, originals, looping:false, distance:0, visible:false,
      tick: dt => {
        if(!state.looping || !state.visible || reduced.matches || document.hidden || hovering || touching || focused || userPaused || performance.now()<resumeAt || document.querySelector('.modal.open,dialog[open]')) return;
        state.fraction = (state.fraction || 0) + dt * .028;
        const pixels = Math.floor(state.fraction); state.fraction -= pixels;
        row.scrollLeft += pixels;
        if(row.scrollLeft>=state.distance) row.scrollLeft-=state.distance;
      }};
    const resize = () => {
      const firstClone = row.querySelector('[data-clone]');
      state.distance = firstClone ? firstClone.offsetLeft-originals[0].offsetLeft : 0;
      if(!firstClone && row.hasAttribute('data-auto') && row.scrollWidth>row.clientWidth+4){
        originals.forEach(el=> {const copy=el.cloneNode(true);copy.dataset.clone='';copy.setAttribute('aria-hidden','true');copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));if(copy.matches('button,a')) copy.tabIndex=-1;copy.querySelectorAll('button,a').forEach(x=>x.tabIndex=-1);row.append(copy);});
        state.distance=row.querySelector('[data-clone]').offsetLeft-originals[0].offsetLeft;
      }
      state.looping=state.distance>row.clientWidth;
      controls.hidden=row.scrollWidth<=row.clientWidth+4;
    };
    if(row.hasAttribute('data-auto')) {
      const pause=document.createElement('button');pause.type='button';pause.textContent='Pause';pause.setAttribute('aria-label','Pause '+label);pause.setAttribute('aria-pressed','false');
      pause.onclick=()=>{userPaused=!userPaused;pause.textContent=userPaused?'Play':'Pause';pause.setAttribute('aria-pressed',String(userPaused));pause.setAttribute('aria-label',(userPaused?'Play ':'Pause ')+label);};
      controls.querySelector('div').prepend(pause);
    }
    const advance=direction=>{
      resumeAt=performance.now()+5000;
      const step=originals[1].offsetLeft-originals[0].offsetLeft;
      if(state.looping && direction<0 && row.scrollLeft<1) row.scrollLeft=state.distance;
      row.scrollBy({left:direction*step,behavior:reduced.matches?'instant':'smooth'});
    };
    controls.querySelector('[data-prev]').onclick=()=>advance(-1);
    controls.querySelector('[data-next]').onclick=()=>advance(1);
    row.addEventListener('mouseenter',()=>hovering=true);
    row.addEventListener('mouseleave',()=>hovering=false);
    row.addEventListener('focusin',()=>focused=true);
    row.addEventListener('focusout',()=>{focused=false;resumeAt=performance.now()+1200;});
    row.addEventListener('wheel',()=>resumeAt=performance.now()+5000,{passive:true});
    row.addEventListener('touchstart',()=>touching=true,{passive:true});
    row.addEventListener('touchend',()=>{touching=false;resumeAt=performance.now()+2500;},{passive:true});
    row.addEventListener('touchcancel',()=>touching=false,{passive:true});
    row.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;dragging=true;moved=false;startX=e.clientX;startScroll=row.scrollLeft;});
    window.addEventListener('pointermove',e=>{if(!dragging)return;const delta=e.clientX-startX;if(Math.abs(delta)>5){moved=true;row.classList.add('dragging');row.scrollLeft=startScroll-delta;}});
    window.addEventListener('pointerup',()=>{if(dragging){dragging=false;row.classList.remove('dragging');resumeAt=performance.now()+2500;}});
    row.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}},true);
    row.addEventListener('dragstart',e=>e.preventDefault());
    row.addEventListener('keydown',e=>{if(e.target===row && ['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();advance(e.key==='ArrowLeft'?-1:1);}});
    new ResizeObserver(resize).observe(row);
    new IntersectionObserver(entries=>state.visible=entries[0].isIntersecting,{rootMargin:'100px'}).observe(row);
    rows.push(state);
  });
  let lastTime=performance.now();
  const animate=now=>{const dt=Math.min(now-lastTime,50);lastTime=now;rows.forEach(x=>x.tick(dt));requestAnimationFrame(animate);};
  requestAnimationFrame(animate);

  const modal=document.querySelector('[data-modal]');
  if(modal) {
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Image gallery');
    const image=modal.querySelector('[data-modal-image]'), title=modal.querySelector('[data-modal-title]'),desc=modal.querySelector('[data-modal-description]'),count=modal.querySelector('[data-modal-count]');
    const closeButton=modal.querySelector('[data-modal-close]'),prev=modal.querySelector('[data-modal-prev]'),next=modal.querySelector('[data-modal-next]');
    closeButton.setAttribute('aria-label','Close gallery');prev.setAttribute('aria-label','Previous image');next.setAttribute('aria-label','Next image');
    let items=[],index=0,opener,locked=[];
    const render=()=>{const x=items[index];image.src=x.dataset.image;image.alt=x.dataset.title||'Portfolio image';title.textContent=x.dataset.title||'';desc.textContent=x.dataset.description||'';count.textContent=(index+1)+' / '+items.length;prev.disabled=next.disabled=items.length<2;image.classList.remove('load-error');};
    image.onerror=()=>{desc.textContent='This image could not be loaded. Please try the next image.';image.classList.add('load-error');};
    const close=()=>{modal.classList.remove('open');document.body.style.overflow='';locked.forEach(x=>x.inert=false);opener?.focus({preventScroll:true});};
    document.addEventListener('click',e=>{
      const el=e.target.closest('[data-gallery]');if(!el)return;
      opener=el;const group=el.dataset.galleryGroup;
      items=[...document.querySelectorAll('[data-gallery-group]')].filter(x=>x.dataset.galleryGroup===group&&!x.closest('[data-clone]'));
      index=Math.max(0,items.findIndex(x=>x.dataset.image===el.dataset.image));render();modal.classList.add('open');
      document.body.style.overflow='hidden';locked=[...document.body.children].filter(x=>x!==modal&&!x.inert);locked.forEach(x=>x.inert=true);closeButton.focus();
    });
    closeButton.onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
    const move=n=>{index=(index+n+items.length)%items.length;render();};prev.onclick=()=>move(-1);next.onclick=()=>move(1);
    document.addEventListener('keydown',e=>{
      if(!modal.classList.contains('open'))return;
      if(e.key==='Escape')close();
      if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
      if(e.key==='ArrowRight'){e.preventDefault();move(1);}
      if(e.key==='Tab'){const btns=[...modal.querySelectorAll('button:not(:disabled)')];if(e.shiftKey&&document.activeElement===btns[0]){e.preventDefault();btns.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===btns.at(-1)){e.preventDefault();btns[0].focus();}}
    });
    let touchX;image.addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});image.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)move(dx<0?1:-1);},{passive:true});
  }

  document.querySelectorAll('[data-reader]').forEach(reader=>{
    const isReport=reader.dataset.reader==='report', total=isReport?74:73;
    const image=reader.querySelector('[data-reader-image]'),count=reader.querySelector('[data-reader-count]'),status=reader.querySelector('[data-reader-status]');
    const viewport=reader.querySelector('.reader-viewport'),prev=reader.querySelector('[data-reader-prev]'),next=reader.querySelector('[data-reader-next]');
    let n=1,loaded=false;
    const render=()=>{image.src=isReport?'assets/readers/report/page-'+String(n).padStart(2,'0')+'.jpg':'assets/readers/presentation/page-'+n+'.webp';image.alt=(isReport?'Report page ':'Presentation slide ')+n;count.textContent=n+' / '+total;prev.disabled=n===1;next.disabled=n===total;status.textContent='';viewport.scrollTop=0;viewport.scrollLeft=0;};
    image.onerror=()=>status.textContent='This page could not be loaded. Please try again.';
    reader.closest('details').addEventListener('toggle',e=>{if(e.target.open&&!loaded){loaded=true;render();}});
    prev.onclick=()=>{if(n>1){n--;render();}};next.onclick=()=>{if(n<total){n++;render();}};
    reader.querySelector('[data-reader-zoom]').onclick=e=>{const zoom=viewport.classList.toggle('zoomed');e.currentTarget.setAttribute('aria-pressed',String(zoom));e.currentTarget.textContent=zoom?'Fit page':'Zoom';};
    reader.addEventListener('contextmenu',e=>e.preventDefault());
    reader.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();prev.click();}if(e.key==='ArrowRight'){e.preventDefault();next.click();}if((e.ctrlKey||e.metaKey)&&['p','s'].includes(e.key.toLowerCase()))e.preventDefault();});
  });

  const portrait=document.querySelector('.personal-portrait');
  if(portrait){const rise=()=>{const rect=portrait.getBoundingClientRect();const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));portrait.style.setProperty('--rise',reduced.matches?'0px':(-24*progress)+'px');};addEventListener('scroll',rise,{passive:true});rise();}
  const egg=document.querySelector('[data-easter-egg]');
  if(egg) {
    const card=egg.querySelector('[data-flip]'),back=card.querySelector('.back-text'),envelope=egg.querySelector('[data-envelope]'),letter=egg.querySelector('dialog');
    const messages=['Are you obsessed with me?','Can’t get enough of me, I know.','I am god.'];
    let clicks=0,angle=0,busy=false;
    card.onclick=()=>{
      if(busy)return;
      clicks++;card.dataset.clicks=String(clicks);
      if(clicks===19){card.closest('.flip-wrap').hidden=true;envelope.hidden=false;envelope.focus();return;}
      const messageClick=clicks%6===0;
      if(messageClick)back.textContent=messages[clicks/6-1];
      else back.textContent='';
      angle += messageClick ? 180 : (angle%360===180 ? 180 : 360);
      busy=true;
      if(reduced.matches){card.style.transform='rotateY('+angle+'deg)';busy=false;}
      else{card.style.transform='rotateY('+angle+'deg)';setTimeout(()=>busy=false,600);}
      card.setAttribute('aria-label',messageClick?messages[clicks/6-1]+' — turn the card':'Turn the photograph');
    };
    envelope.onclick=()=>letter.showModal();
    const leave=()=>{letter.close();location.href='milestones.html';};
    letter.querySelector('[data-letter-close]').onclick=leave;
    letter.addEventListener('cancel',e=>{e.preventDefault();leave();});
  }
});

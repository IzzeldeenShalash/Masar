import { mapPayload, type MapProps } from './map-contract';
export function mapHtml(props: MapProps, locale = 'en') {
  const payload = mapPayload(props, locale);
  return `<!DOCTYPE html><html lang="${locale}" dir="ltr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="origin"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{margin:0;width:100%;height:100%;font-family:Arial}.pin{background:#087F82;color:white;border:3px solid white;border-radius:50% 50% 50% 3px;transform:rotate(-45deg);box-shadow:0 2px 5px #1236;width:30px;height:30px;display:flex;align-items:center;justify-content:center}.pin span{transform:rotate(45deg);font-weight:bold;font-size:18px}#error{position:absolute;top:6px;left:50px;right:60px;z-index:999;background:white;padding:8px;border-radius:10px;font-size:12px}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map" role="img" aria-label="${locale==='ar'?'خريطة الأردن':'Jordan map'}"></div><div id="error" role="status" aria-live="polite" dir="${locale==='ar'?'rtl':'ltr'}">${locale === 'ar' ? 'جارٍ تحميل الخريطة…' : 'Loading map…'}</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  const initial=${payload};const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;let last=null;const err=document.getElementById('error');
  function send(message){const text=JSON.stringify(message);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(text);else parent.postMessage(text,'*');}
  try {
    const map=L.map('map',{zoomControl:initial.interactive,dragging:initial.interactive,scrollWheelZoom:initial.interactive,doubleClickZoom:initial.interactive,touchZoom:initial.interactive,minZoom:6,maxZoom:19,maxBounds:[[29,34.8],[33.5,39.4]],maxBoundsViscosity:1});
    map.attributionControl.setPrefix(false);
    const markers=L.layerGroup().addTo(map), selection=L.layerGroup().addTo(map), gps=L.layerGroup().addTo(map);
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'}).addTo(map);
    tiles.on('load',()=>err.style.display='none');tiles.on('tileerror',()=>{err.style.display='block';err.textContent=initial.locale==='ar'?'تعذر تحميل الخريطة. أعد المحاولة.':'Map unavailable. Tap reload.';});
    window.masarUpdate=function(d){
      if(!last||last.latitude!==d.latitude||last.longitude!==d.longitude||last.countryView!==d.countryView){if(d.countryView)map.fitBounds([[29,34.8],[33.5,39.4]],{padding:[10,10]});else map.setView([d.latitude,d.longitude],!last||last.countryView?15:map.getZoom(),{animate:!reduced});}
      markers.clearLayers();selection.clearLayers();gps.clearLayers();
      d.reports.forEach(r=>{const icon=L.divIcon({className:'',html:'<div class="pin"><span>'+({lighting:'☀',roads:'↟',waste:'♻',water:'≈',other:'!'}[r.category]||'!')+'</span></div>',iconSize:[36,36],iconAnchor:[18,36]});L.marker([r.latitude,r.longitude],{icon,title:r.title,keyboard:true}).addTo(markers).on('click',()=>send({source:'masar-map',id:r.id}));});
      if(d.pick)L.circleMarker([d.latitude,d.longitude],{radius:8,color:'#087F82',fillColor:'white',fillOpacity:1,weight:3}).addTo(selection);
      if(d.gps){L.circle([d.gps.latitude,d.gps.longitude],{radius:Math.max(5,d.gps.accuracy),color:'#2585DF',fillOpacity:.1,weight:1}).addTo(gps);L.circleMarker([d.gps.latitude,d.gps.longitude],{radius:7,color:'white',fillColor:'#2585DF',fillOpacity:1,weight:3}).addTo(gps).bindTooltip(d.locale==='ar'?'موقع GPS الحالي':'Current GPS position');}
      last=d;
    };
    window.addEventListener('message',event=>{try{const d=typeof event.data==='string'?JSON.parse(event.data):event.data;if(d.source==='masar-update')window.masarUpdate(d.payload);}catch{}});
    map.on('click',event=>{if(!last.pick)return;const {lat,lng}=event.latlng;if(lat<29||lat>33.5||lng<34.8||lng>39.4)return;send({source:'masar-location',latitude:lat,longitude:lng});});
    window.masarUpdate(initial);
  }catch(e){err.textContent=initial.locale==='ar'?'الخريطة غير متاحة. اضغط إعادة التحميل.':'Map unavailable. Tap reload.';}
  </script></body></html>`;
}

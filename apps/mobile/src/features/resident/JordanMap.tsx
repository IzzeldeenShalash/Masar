import {useScreenFocus} from './data';
import React, { useEffect, useRef, useState } from 'react';
import { View, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { mapHtml } from './map-html';
import { mapPayload, readMapMessage, type MapProps } from './map-contract';
import { useLocale } from '../../i18n/LocaleProvider';
import { IconButton } from './ui';
export default function JordanMap(props: MapProps) {
  const focused=useScreenFocus(); const { locale } = useLocale(); const [revision, setRevision] = useState(0);
  const frame = useRef<WebView<object>>(null); const first = useRef(props);
  const html = React.useMemo(() => mapHtml(first.current, locale), [locale]);
  const payload = mapPayload(props, locale);
  const sync = () => frame.current?.injectJavaScript('window.masarUpdate && window.masarUpdate(' + payload + ');true;');
  useEffect(sync, [payload]);
  if(!focused)return <View style={{flex:1}}/>;
  return <View pointerEvents={props.interactive===false?"none":"auto"} style={{ flex: 1, borderRadius: 18, overflow: 'hidden', minHeight: props.interactive === false ? 70 : 100 }}><WebView<object> key={revision} ref={frame} onLoadEnd={sync} onShouldStartLoadWithRequest={nav => { if(nav.url.startsWith('https://www.openstreetmap.org/')) { void Linking.openURL(nav.url); return false; } return true; }} originWhitelist={['*']} source={{ html, baseUrl: 'https://masar.local' }} applicationNameForUserAgent="MasarDemo/0.3" onMessage={event => readMapMessage(event.nativeEvent.data, props)}/>{props.interactive !== false && <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'white', borderRadius: 12 }}><IconButton name="refresh" label={locale === 'ar' ? 'إعادة تحميل الخريطة' : 'Reload map'} onPress={() => setRevision(v => v+1)}/></View>}</View>;
}

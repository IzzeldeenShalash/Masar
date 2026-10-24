import * as FileSystem from 'expo-file-system/legacy';
export async function readRecording(uri:string){return{mimeType:'audio/mp4',data:await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64})};}

// Unmount cleanup must not read an Expo shared object: the hook may already
// have released it. Only a plain URI snapshot is passed to this helper.
export async function eraseRecordingFile(file:{current:string|null},remove:(uri:string)=>Promise<void>){
  const uri=file.current;
  file.current=null;
  if(uri)try{await remove(uri);}catch{/* Temporary-file cleanup must not reject on unmount. */}
}

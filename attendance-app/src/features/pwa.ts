// Only the built app registers a worker. Development previews keep normal Vite behavior.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(error=>{
      console.warn("Offline installation unavailable",error);
    });
  },{once:true});
}

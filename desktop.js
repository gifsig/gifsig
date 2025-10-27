const WORKER_CODE = `// gif.worker.js 0.2.0 - https://github.com/jnordberg/gif.js
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var NeuQuant=require("./TypedNeuQuant.js");var LZWEncoder=require("./LZWEncoder.js");function ByteArray(){this.page=-1;this.pages=[];this.newPage()}ByteArray.pageSize=4096;ByteArray.charMap={};for(var i=0;i<256;i++)ByteArray.charMap[i]=String.fromCharCode(i);ByteArray.prototype.newPage=function(){this.pages[++this.page]=new Uint8Array(ByteArray.pageSize);this.cursor=0};ByteArray.prototype.getData=function(){var rv="";for(var p=0;p<this.pages.length;p++){for(var i=0;i<ByteArray.pageSize;i++){rv+=ByteArray.charMap[this.pages[p][i]]}}return rv};ByteArray.prototype.writeByte=function(val){if(this.cursor>=ByteArray.pageSize)this.newPage();this.pages[this.page][this.cursor++]=val};ByteArray.prototype.writeUTFBytes=function(string){for(var l=string.length,i=0;i<l;i++)this.writeByte(string.charCodeAt(i))};ByteArray.prototype.writeBytes=function(array,offset,length){for(var l=length||array.length,i=offset||0;i<l;i++)this.writeByte(array[i])};function GIFEncoder(width,height){this.width=~~width;this.height=~~height;this.transparent=null;this.transIndex=0;this.repeat=-1;this.delay=0;this.image=null;this.pixels=null;this.indexedPixels=null;this.colorDepth=null;this.colorTab=null;this.neuQuant=null;this.usedEntry=new Array;this.palSize=7;this.dispose=-1;this.firstFrame=true;this.sample=10;this.dither=false;this.globalPalette=false;this.out=new ByteArray}GIFEncoder.prototype.setDelay=function(milliseconds){this.delay=Math.round(milliseconds/10)};GIFEncoder.prototype.setFrameRate=function(fps){this.delay=Math.round(100/fps)};GIFEncoder.prototype.setDispose=function(disposalCode){if(disposalCode>=0)this.dispose=disposalCode};GIFEncoder.prototype.setRepeat=function(repeat){this.repeat=repeat};GIFEncoder.prototype.setTransparent=function(color){this.transparent=color};GIFEncoder.prototype.addFrame=function(imageData){this.image=imageData;this.colorTab=this.globalPalette&&this.globalPalette.slice?this.globalPalette:null;this.getImagePixels();this.analyzePixels();if(this.globalPalette===true)this.globalPalette=this.colorTab;if(this.firstFrame){this.writeLSD();this.writePalette();if(this.repeat>=0){this.writeNetscapeExt()}}this.writeGraphicCtrlExt();this.writeImageDesc();if(!this.firstFrame&&!this.globalPalette)this.writePalette();this.writePixels();this.firstFrame=false};GIFEncoder.prototype.finish=function(){this.out.writeByte(59)};GIFEncoder.prototype.setQuality=function(quality){if(quality<1)quality=1;this.sample=quality};GIFEncoder.prototype.setDither=function(dither){if(dither===true)dither="FloydSteinberg";this.dither=dither};GIFEncoder.prototype.setGlobalPalette=function(palette){this.globalPalette=palette};GIFEncoder.prototype.getGlobalPalette=function(){return this.globalPalette&&this.globalPalette.slice&&this.globalPalette.slice(0)||this.globalPalette};GIFEncoder.prototype.writeHeader=function(){this.out.writeUTFBytes("GIF89a")};GIFEncoder.prototype.analyzePixels=function(){if(!this.colorTab){this.neuQuant=new NeuQuant(this.pixels,this.sample);this.neuQuant.buildColormap();this.colorTab=this.neuQuant.getColormap()}if(this.dither){this.ditherPixels(this.dither.replace("-serpentine",""),this.dither.match(/-serpentine/)!==null)}else{this.indexPixels()}this.pixels=null;this.colorDepth=8;this.palSize=7;if(this.transparent!==null){this.transIndex=this.findClosest(this.transparent,true)}};GIFEncoder.prototype.indexPixels=function(imgq){var nPix=this.pixels.length/3;this.indexedPixels=new Uint8Array(nPix);var k=0;for(var j=0;j<nPix;j++){var index=this.findClosestRGB(this.pixels[k++]&255,this.pixels[k++]&255,this.pixels[k++]&255);this.usedEntry[index]=true;this.indexedPixels[j]=index}};GIFEncoder.prototype.ditherPixels=function(kernel,serpentine){var kernels={FalseFloydSteinberg:[[3/8,1,0],[3/8,0,1],[2/8,1,1]],FloydSteinberg:[[7/16,1,0],[3/16,-1,1],[5/16,0,1],[1/16,1,1]],Stucki:[[8/42,1,0],[4/42,2,0],[2/42,-2,1],[4/42,-1,1],[8/42,0,1],[4/42,1,1],[2/42,2,1],[1/42,-2,2],[2/42,-1,2],[4/42,0,2],[2/42,1,2],[1/42,2,2]],Atkinson:[[1/8,1,0],[1/8,2,0],[1/8,-1,1],[1/8,0,1],[1/8,1,1],[1/8,0,2]]};if(!kernel||!kernels[kernel]){throw"Unknown dithering kernel: "+kernel}var ds=kernels[kernel];var index=0,height=this.height,width=this.width,data=this.pixels;var direction=serpentine?-1:1;this.indexedPixels=new Uint8Array(this.pixels.length/3);for(var y=0;y<height;y++){if(serpentine)direction=direction*-1;for(var x=direction==1?0:width-1,xend=direction==1?width:0;x!==xend;x+=direction){index=y*width+x;var idx=index*3;var r1=data[idx];var g1=data[idx+1];var b1=data[idx+2];idx=this.findClosestRGB(r1,g1,b1);this.usedEntry[idx]=true;this.indexedPixels[index]=idx;idx*=3;var r2=this.colorTab[idx];var g2=this.colorTab[idx+1];var b2=this.colorTab[idx+2];var er=r1-r2;var eg=g1-g2;var eb=b1-b2;for(var i=direction==1?0:ds.length-1,end=direction==1?ds.length:0;i!==end;i+=direction){var x1=ds[i][1];var y1=ds[i][2];if(x1+x>=0&&x1+x<width&&y1+y>=0&&y1+y<height){var d=ds[i][0];idx=index+x1+y1*width;idx*=3;data[idx]=Math.max(0,Math.min(255,data[idx]+er*d));data[idx+1]=Math.max(0,Math.min(255,data[idx+1]+eg*d));data[idx+2]=Math.max(0,Math.min(255,data[idx+2]+eb*d))}}}}};GIFEncoder.prototype.findClosest=function(c,used){return this.findClosestRGB((c&16711680)>>16,(c&65280)>>8,c&255,used)};GIFEncoder.prototype.findClosestRGB=function(r,g,b,used){if(this.colorTab===null)return-1;if(this.neuQuant&&!used){return this.neuQuant.lookupRGB(r,g,b)}var c=b|g<<8|r<<16;var minpos=0;var dmin=256*256*256;var len=this.colorTab.length;for(var i=0,index=0;i<len;index++){var dr=r-(this.colorTab[i++]&255);var dg=g-(this.colorTab[i++]&255);var db=b-(this.colorTab[i++]&255);var d=dr*dr+dg*dg+db*db;if((!used||this.usedEntry[index])&&d<dmin){dmin=d;minpos=index}}return minpos};GIFEncoder.prototype.getImagePixels=function(){var w=this.width;var h=this.height;this.pixels=new Uint8Array(w*h*3);var data=this.image;var srcPos=0;var count=0;for(var i=0;i<h;i++){for(var j=0;j<w;j++){this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];srcPos++}}};GIFEncoder.prototype.writeGraphicCtrlExt=function(){this.out.writeByte(33);this.out.writeByte(249);this.out.writeByte(4);var transp,disp;if(this.transparent===null){transp=0;disp=0}else{transp=1;disp=2}if(this.dispose>=0){disp=dispose&7}disp<<=2;this.out.writeByte(0|disp|0|transp);this.writeShort(this.delay);this.out.writeByte(this.transIndex);this.out.writeByte(0)};GIFEncoder.prototype.writeImageDesc=function(){this.out.writeByte(44);this.writeShort(0);this.writeShort(0);this.writeShort(this.width);this.writeShort(this.height);if(this.firstFrame||this.globalPalette){this.out.writeByte(0)}else{this.out.writeByte(128|0|0|0|this.palSize)}};GIFEncoder.prototype.writeLSD=function(){this.writeShort(this.width);this.writeShort(this.height);this.out.writeByte(128|112|0|this.palSize);this.out.writeByte(0);this.out.writeByte(0)};GIFEncoder.prototype.writeNetscapeExt=function(){this.out.writeByte(33);this.out.writeByte(255);this.out.writeByte(11);this.out.writeUTFBytes("NETSCAPE2.0");this.out.writeByte(3);this.out.writeByte(1);this.writeShort(this.repeat);this.out.writeByte(0)};GIFEncoder.prototype.writePalette=function(){this.out.writeBytes(this.colorTab);var n=3*256-this.colorTab.length;for(var i=0;i<n;i++)this.out.writeByte(0)};GIFEncoder.prototype.writeShort=function(pValue){this.out.writeByte(pValue&255);this.out.writeByte(pValue>>8&255)};GIFEncoder.prototype.writePixels=function(){var enc=new LZWEncoder(this.width,this.height,this.indexedPixels,this.colorDepth);enc.encode(this.out)};GIFEncoder.prototype.stream=function(){return this.out};module.exports=GIFEncoder},{"./LZWEncoder.js":2,"./TypedNeuQuant.js":3}],2:[function(require,module,exports){var EOF=-1;var BITS=12;var HSIZE=5003;var masks=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function LZWEncoder(width,height,pixels,colorDepth){var initCodeSize=Math.max(2,colorDepth);var accum=new Uint8Array(256);var htab=new Int32Array(HSIZE);var codetab=new Int32Array(HSIZE);var cur_accum,cur_bits=0;var a_count;var free_ent=0;var maxcode;var clear_flg=false;var g_init_bits,ClearCode,EOFCode;function char_out(c,outs){accum[a_count++]=c;if(a_count>=254)flush_char(outs)}function cl_block(outs){cl_hash(HSIZE);free_ent=ClearCode+2;clear_flg=true;output(ClearCode,outs)}function cl_hash(hsize){for(var i=0;i<hsize;++i)htab[i]=-1}function compress(init_bits,outs){var fcode,c,i,ent,disp,hsize_reg,hshift;g_init_bits=init_bits;clear_flg=false;n_bits=g_init_bits;maxcode=MAXCODE(n_bits);ClearCode=1<<init_bits-1;EOFCode=ClearCode+1;free_ent=ClearCode+2;a_count=0;ent=nextPixel();hshift=0;for(fcode=HSIZE;fcode<65536;fcode*=2)++hshift;hshift=8-hshift;hsize_reg=HSIZE;cl_hash(hsize_reg);output(ClearCode,outs);outer_loop:while((c=nextPixel())!=EOF){fcode=(c<<BITS)+ent;i=c<<hshift^ent;if(htab[i]===fcode){ent=codetab[i];continue}else if(htab[i]>=0){disp=hsize_reg-i;if(i===0)disp=1;do{if((i-=disp)<0)i+=hsize_reg;if(htab[i]===fcode){ent=codetab[i];continue outer_loop}}while(htab[i]>=0)}output(ent,outs);ent=c;if(free_ent<1<<BITS){codetab[i]=free_ent++;htab[i]=fcode}else{cl_block(outs)}}output(ent,outs);output(EOFCode,outs)}function encode(outs){outs.writeByte(initCodeSize);remaining=width*height;curPixel=0;compress(initCodeSize+1,outs);outs.writeByte(0)}function flush_char(outs){if(a_count>0){outs.writeByte(a_count);outs.writeBytes(accum,0,a_count);a_count=0}}function MAXCODE(n_bits){return(1<<n_bits)-1}function nextPixel(){if(remaining===0)return EOF;--remaining;var pix=pixels[curPixel++];return pix&255}function output(code,outs){cur_accum&=masks[cur_bits];if(cur_bits>0)cur_accum|=code<<cur_bits;else cur_accum=code;cur_bits+=n_bits;while(cur_bits>=8){char_out(cur_accum&255,outs);cur_accum>>=8;cur_bits-=8}if(free_ent>maxcode||clear_flg){if(clear_flg){maxcode=MAXCODE(n_bits=g_init_bits);clear_flg=false}else{++n_bits;if(n_bits==BITS)maxcode=1<<BITS;else maxcode=MAXCODE(n_bits)}}if(code==EOFCode){while(cur_bits>0){char_out(cur_accum&255,outs);cur_accum>>=8;cur_bits-=8}flush_char(outs)}}this.encode=encode}module.exports=LZWEncoder},{}],3:[function(require,module,exports){var ncycles=100;var netsize=256;var maxnetpos=netsize-1;var netbiasshift=4;var intbiasshift=16;var intbias=1<<intbiasshift;var gammashift=10;var gamma=1<<gammashift;var betashift=10;var beta=intbias>>betashift;var betagamma=intbias<<gammashift-betashift;var initrad=netsize>>3;var radiusbiasshift=6;var radiusbias=1<<radiusbiasshift;var initradius=initrad*radiusbias;var radiusdec=30;var alphabiasshift=10;var initalpha=1<<alphabiasshift;var alphadec;var radbiasshift=8;var radbias=1<<radbiasshift;var alpharadbshift=alphabiasshift+radbiasshift;var alpharadbias=1<<alpharadbshift;var prime1=499;var prime2=491;var prime3=487;var prime4=503;var minpicturebytes=3*prime4;function NeuQuant(pixels,samplefac){var network;var netindex;var bias;var freq;var radpower;function init(){network=[];netindex=new Int32Array(256);bias=new Int32Array(netsize);freq=new Int32Array(netsize);radpower=new Int32Array(netsize>>3);var i,v;for(i=0;i<netsize;i++){v=(i<<netbiasshift+8)/netsize;network[i]=new Float64Array([v,v,v,0]);freq[i]=intbias/netsize;bias[i]=0}}function unbiasnet(){for(var i=0;i<netsize;i++){network[i][0]>>=netbiasshift;network[i][1]>>=netbiasshift;network[i][2]>>=netbiasshift;network[i][3]=i}}function altersingle(alpha,i,b,g,r){network[i][0]-=alpha*(network[i][0]-b)/initalpha;network[i][1]-=alpha*(network[i][1]-g)/initalpha;network[i][2]-=alpha*(network[i][2]-r)/initalpha}function alterneigh(radius,i,b,g,r){var lo=Math.abs(i-radius);var hi=Math.min(i+radius,netsize);var j=i+1;var k=i-1;var m=1;var p,a;while(j<hi||k>lo){a=radpower[m++];if(j<hi){p=network[j++];p[0]-=a*(p[0]-b)/alpharadbias;p[1]-=a*(p[1]-g)/alpharadbias;p[2]-=a*(p[2]-r)/alpharadbias}if(k>lo){p=network[k--];p[0]-=a*(p[0]-b)/alpharadbias;p[1]-=a*(p[1]-g)/alpharadbias;p[2]-=a*(p[2]-r)/alpharadbias}}}function contest(b,g,r){var bestd=~(1<<31);var bestbiasd=bestd;var bestpos=-1;var bestbiaspos=bestpos;var i,n,dist,biasdist,betafreq;for(i=0;i<netsize;i++){n=network[i];dist=Math.abs(n[0]-b)+Math.abs(n[1]-g)+Math.abs(n[2]-r);if(dist<bestd){bestd=dist;bestpos=i}biasdist=dist-(bias[i]>>intbiasshift-netbiasshift);if(biasdist<bestbiasd){bestbiasd=biasdist;bestbiaspos=i}betafreq=freq[i]>>betashift;freq[i]-=betafreq;bias[i]+=betafreq<<gammashift}freq[bestpos]+=beta;bias[bestpos]-=betagamma;return bestbiaspos}function inxbuild(){var i,j,p,q,smallpos,smallval,previouscol=0,startpos=0;for(i=0;i<netsize;i++){p=network[i];smallpos=i;smallval=p[1];for(j=i+1;j<netsize;j++){q=network[j];if(q[1]<smallval){smallpos=j;smallval=q[1]}}q=network[smallpos];if(i!=smallpos){j=q[0];q[0]=p[0];p[0]=j;j=q[1];q[1]=p[1];p[1]=j;j=q[2];q[2]=p[2];p[2]=j;j=q[3];q[3]=p[3];p[3]=j}if(smallval!=previouscol){netindex[previouscol]=startpos+i>>1;for(j=previouscol+1;j<smallval;j++)netindex[j]=i;previouscol=smallval;startpos=i}}netindex[previouscol]=startpos+maxnetpos>>1;for(j=previouscol+1;j<256;j++)netindex[j]=maxnetpos}function inxsearch(b,g,r){var a,p,dist;var bestd=1e3;var best=-1;var i=netindex[g];var j=i-1;while(i<netsize||j>=0){if(i<netsize){p=network[i];dist=p[1]-g;if(dist>=bestd)i=netsize;else{i++;if(dist<0)dist=-dist;a=p[0]-b;if(a<0)a=-a;dist+=a;if(dist<bestd){a=p[2]-r;if(a<0)a=-a;dist+=a;if(dist<bestd){bestd=dist;best=p[3]}}}}if(j>=0){p=network[j];dist=g-p[1];if(dist>=bestd)j=-1;else{j--;if(dist<0)dist=-dist;a=p[0]-b;if(a<0)a=-a;dist+=a;if(dist<bestd){a=p[2]-r;if(a<0)a=-a;dist+=a;if(dist<bestd){bestd=dist;best=p[3]}}}}}return best}function learn(){var i;var lengthcount=pixels.length;var alphadec=30+(samplefac-1)/3;var samplepixels=lengthcount/(3*samplefac);var delta=~~(samplepixels/ncycles);var alpha=initalpha;var radius=initradius;var rad=radius>>radiusbiasshift;if(rad<=1)rad=0;for(i=0;i<rad;i++)radpower[i]=alpha*((rad*rad-i*i)*radbias/(rad*rad));var step;if(lengthcount<minpicturebytes){samplefac=1;step=3}else if(lengthcount%prime1!==0){step=3*prime1}else if(lengthcount%prime2!==0){step=3*prime2}else if(lengthcount%prime3!==0){step=3*prime3}else{step=3*prime4}var b,g,r,j;var pix=0;i=0;while(i<samplepixels){b=(pixels[pix]&255)<<netbiasshift;g=(pixels[pix+1]&255)<<netbiasshift;r=(pixels[pix+2]&255)<<netbiasshift;j=contest(b,g,r);altersingle(alpha,j,b,g,r);if(rad!==0)alterneigh(rad,j,b,g,r);pix+=step;if(pix>=lengthcount)pix-=lengthcount;i++;if(delta===0)delta=1;if(i%delta===0){alpha-=alpha/alphadec;radius-=radius/radiusdec;rad=radius>>radiusbiasshift;if(rad<=1)rad=0;for(j=0;j<rad;j++)radpower[j]=alpha*((rad*rad-j*j)*radbias/(rad*rad))}}}function buildColormap(){init();learn();unbiasnet();inxbuild()}this.buildColormap=buildColormap;function getColormap(){var map=[];var index=[];for(var i=0;i<netsize;i++)index[network[i][3]]=i;var k=0;for(var l=0;l<netsize;l++){var j=index[l];map[k++]=network[j][0];map[k++]=network[j][1];map[k++]=network[j][2]}return map}this.getColormap=getColormap;this.lookupRGB=inxsearch}module.exports=NeuQuant},{}],4:[function(require,module,exports){var GIFEncoder,renderFrame;GIFEncoder=require("./GIFEncoder.js");renderFrame=function(frame){var encoder,page,stream,transfer;encoder=new GIFEncoder(frame.width,frame.height);if(frame.index===0){encoder.writeHeader()}else{encoder.firstFrame=false}encoder.setTransparent(frame.transparent);encoder.setRepeat(frame.repeat);encoder.setDelay(frame.delay);encoder.setQuality(frame.quality);encoder.setDither(frame.dither);encoder.setGlobalPalette(frame.globalPalette);encoder.addFrame(frame.data);if(frame.last){encoder.finish()}if(frame.globalPalette===true){frame.globalPalette=encoder.getGlobalPalette()}stream=encoder.stream();frame.data=stream.pages;frame.cursor=stream.cursor;frame.pageSize=stream.constructor.pageSize;if(frame.canTransfer){transfer=function(){var i,len,ref,results;ref=frame.data;results=[];for(i=0,len=ref.length;i<len;i++){page=ref[i];results.push(page.buffer)}return results}();return self.postMessage(frame,transfer)}else{return self.postMessage(frame)}};self.onmessage=function(event){return renderFrame(event.data)}},{"./GIFEncoder.js":1}]},{},[4]);
//# sourceMappingURL=gif.worker.js.map
`;
const workerBlob = new Blob([WORKER_CODE], {type: 'application/javascript'});
const WORKER_URL = URL.createObjectURL(workerBlob);
// GifSig - Signature Drawing Creator
let isDrawing = false;
let drawingActive = false; // Track if drawing mode is activated
let drawingEnabled = true; // Track if drawing is enabled (toggled by clicks)
let lastMoveTime = 0; // Track last movement time for stroke separation
let strokeTimeoutId = null; // Timeout for detecting finger lift
const LIFT_DETECTION_MS = 150; // Time gap to detect finger lift (increased for better detection)
let lastDrawPosition = null; // Track last draw position for stroke separation
let currentStrokeThickness = 2;
let drawingFrames = [];
let recordingInterval = null;
let startTime = null;
let hasStartedDrawing = false; // Track if user has made first touch
let canvasWidth = 0;
let canvasHeight = 0;
let currentGifBlob = null;
let currentGifUrl = null;

// Velocity-based stroke variables
let lastPoint = null;
let lastTimestamp = 0;
let currentLineWidth = currentStrokeThickness;
const MIN_WIDTH_MULTIPLIER = 0.4; // Minimum width (fast drawing)
const MAX_WIDTH_MULTIPLIER = 3.0; // Maximum width (slow drawing)
const VELOCITY_FILTER_WEIGHT = 0.6; // Smoothing factor (balanced)
const CANVAS_SCALE = 2; // Higher resolution for better quality

// Apple-level smoothing: Bézier curve smoothing
let pointBuffer = []; // Buffer of recent points for smoothing
const SMOOTHING_BUFFER_SIZE = 3; // Number of points to use for smoothing
const MIN_DISTANCE = 2; // Minimum distance between points (reduces jitter)

// DOM Elements
const signatureBox = document.getElementById('signatureBox');
const drawingCanvas = document.getElementById('drawingCanvas');
const drawPrompt = document.getElementById('drawPrompt');
const strokeBtns = document.querySelectorAll('.stroke-btn');
const clearBtn = document.getElementById('clearBtn');
const createBtn = document.getElementById('createBtn');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');
const gifOverlay = document.getElementById('gifOverlay');
const loadingAnimation = document.getElementById('loadingAnimation');
const loadingGif = document.getElementById('loadingGif');
const overlayContent = document.querySelector('.overlay-content');
const overlayResult = document.getElementById('overlayResult');
const gifPreview = document.getElementById('gifPreview');
const gifImage = document.getElementById('gifImage');
const closeOverlay = document.getElementById('closeOverlay');
const downloadBtnOverlay = document.getElementById('downloadBtnOverlay');
const saveThumbnail = document.getElementById('saveThumbnail');
const thumbnailArea = document.getElementById('thumbnailArea');

const ctx = drawingCanvas.getContext('2d', { willReadFrequently: true });

// Initialize canvas
function initCanvas() {
    const rect = signatureBox.getBoundingClientRect();
    
    // Set canvas resolution at higher scale for better quality
    drawingCanvas.width = rect.width * CANVAS_SCALE;
    drawingCanvas.height = rect.height * CANVAS_SCALE;
    
    // Scale CSS display to match visual size
    drawingCanvas.style.width = rect.width + 'px';
    drawingCanvas.style.height = rect.height + 'px';
    
    // Scale the context to match
    ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = currentStrokeThickness;
    
    // Enable image smoothing for better line quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

// Activate drawing mode when signature box is clicked
signatureBox.addEventListener('click', () => {
    if (!drawingCanvas.classList.contains('active')) {
        initCanvas();
        drawingCanvas.classList.add('active');
        drawPrompt.classList.add('hidden');
        clearBtn.classList.add('visible');
        createBtn.classList.add('visible');
        drawingActive = true; // Enable touch-to-draw mode
        drawingEnabled = true; // Start with drawing enabled
        
        // Initialize recording (will start on first touch)
        initRecording();
    }
});

// Stroke thickness selector
strokeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        strokeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStrokeThickness = parseInt(btn.dataset.thickness);
        ctx.lineWidth = currentStrokeThickness;
    });
});

// Drawing functions
function getCoordinates(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    
    // No scaling needed since we're using ctx.scale()
    if (e.touches && e.touches.length > 0) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// Calculate velocity-based line width
function getLineWidth(velocity) {
    // velocity is in pixels/millisecond
    // Convert to more intuitive scale: pixels per 16ms (one frame at 60fps)
    const normalizedVelocity = velocity * 16;
    
    // Map velocity to width multiplier with smoother curve
    // Slow: 0-5 px/frame, Medium: 5-30 px/frame, Fast: 30+ px/frame
    let multiplier;
    
    if (normalizedVelocity < 5) {
        // Very slow - maximum thickness
        multiplier = MAX_WIDTH_MULTIPLIER;
    } else if (normalizedVelocity > 30) {
        // Very fast - minimum thickness
        multiplier = MIN_WIDTH_MULTIPLIER;
    } else {
        // Smooth interpolation with easing
        const t = (normalizedVelocity - 5) / 25; // Map 5-30 to 0-1
        // Apply ease-in-out for smoother transitions
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        multiplier = MAX_WIDTH_MULTIPLIER - (eased * (MAX_WIDTH_MULTIPLIER - MIN_WIDTH_MULTIPLIER));
    }
    
    const targetWidth = currentStrokeThickness * multiplier;
    
    // Smooth the transition using weighted average
    currentLineWidth = (currentLineWidth * VELOCITY_FILTER_WEIGHT) + 
                      (targetWidth * (1 - VELOCITY_FILTER_WEIGHT));
    
    return currentLineWidth;
}

function startDrawing(e) {
    if (!drawingActive) return;
    e.preventDefault();
    
    // Start recording on first touch
    if (!hasStartedDrawing) {
        hasStartedDrawing = true;
        startFrameCapture();
    }
    
    isDrawing = true;
    const coords = getCoordinates(e);
    
    // Reset velocity tracking and point buffer for new stroke
    lastPoint = coords;
    lastTimestamp = Date.now();
    currentLineWidth = currentStrokeThickness;
    pointBuffer = [coords];
}

function draw(e) {
    if (!drawingActive) return;
    
    // Don't draw if drawing is disabled (toggled off by click)
    if (!drawingEnabled) {
        if (isDrawing) {
            isDrawing = false;
            lastDrawPosition = null;
            pointBuffer = [];
        }
        return;
    }
    
    // Only allow drawing when NO mouse button is pressed (touch-only drawing)
    // For touch events, e.buttons is undefined, so allow those
    if (e.type === 'mousemove' && e.buttons !== 0) {
        // Mouse button is pressed, stop drawing
        if (isDrawing) {
            isDrawing = false;
            lastDrawPosition = null;
            pointBuffer = [];
        }
        return;
    }
    
    e.preventDefault();
    const coords = getCoordinates(e);
    const now = Date.now();
    
    // Detect if finger was lifted (gap in movement > LIFT_DETECTION_MS)
    const timeSinceLastMove = now - lastMoveTime;
    const fingerWasLifted = timeSinceLastMove > LIFT_DETECTION_MS;
    
    // Also check if position jumped significantly (indicates lift and retouch elsewhere)
    let positionJumped = false;
    if (lastDrawPosition) {
        const distance = Math.sqrt(
            Math.pow(coords.x - lastDrawPosition.x, 2) + 
            Math.pow(coords.y - lastDrawPosition.y, 2)
        );
        // If movement is > 30 pixels and time gap exists, likely a lift
        positionJumped = distance > 30 && timeSinceLastMove > 50;
    }
    
    // If finger was lifted or position jumped, start a NEW stroke
    if (!isDrawing || fingerWasLifted || positionJumped) {
        // Start recording on first touch (for hover-based drawing)
        if (!hasStartedDrawing) {
            hasStartedDrawing = true;
            startFrameCapture();
        }
        
        // Start a completely new stroke at the current position
        isDrawing = true;
        lastPoint = coords;
        lastTimestamp = now;
        currentLineWidth = currentStrokeThickness;
        pointBuffer = [coords]; // Reset buffer for new stroke
    } else {
        // Calculate distance from last point
        if (lastPoint) {
            const distance = Math.sqrt(
                Math.pow(coords.x - lastPoint.x, 2) + 
                Math.pow(coords.y - lastPoint.y, 2)
            );
            
            // Only add point if it's far enough (reduces jitter)
            if (distance < MIN_DISTANCE) {
                return;
            }
            
            // Calculate velocity
            const timeDelta = now - lastTimestamp;
            const velocity = timeDelta > 0 ? distance / timeDelta : 0;
            
            // Update line width based on velocity
            const newWidth = getLineWidth(velocity);
            
            // Add point to buffer
            pointBuffer.push(coords);
            
            // Keep buffer size limited
            if (pointBuffer.length > SMOOTHING_BUFFER_SIZE) {
                pointBuffer.shift();
            }
            
            // Draw smooth Bézier curve when we have enough points
            if (pointBuffer.length >= 2) {
                drawSmoothCurve(pointBuffer, newWidth);
            }
        }
        
        // Update tracking
        lastPoint = coords;
        lastTimestamp = now;
    }
    
    lastMoveTime = now;
    lastDrawPosition = {x: coords.x, y: coords.y};
    
    // Clear any existing timeout and set a new one
    // This detects when the user stops moving (lifts finger)
    if (strokeTimeoutId) {
        clearTimeout(strokeTimeoutId);
    }
    strokeTimeoutId = setTimeout(() => {
        if (isDrawing) {
            isDrawing = false;
            lastDrawPosition = null;
            pointBuffer = [];
        }
    }, LIFT_DETECTION_MS);
}

// Draw smooth Bézier curve through points (Apple-style smoothing)
function drawSmoothCurve(points, lineWidth) {
    if (points.length < 2) return;
    
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    
    // For 2 points, use quadratic curve
    if (points.length === 2) {
        const p0 = points[0];
        const p1 = points[1];
        
        ctx.moveTo(p0.x, p0.y);
        
        // Use midpoint as control point for smoother curve
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    } else {
        // For 3+ points, draw smooth curve through midpoints
        const p0 = points[points.length - 3];
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        
        // Calculate control point for smooth curve
        const cp1x = p1.x;
        const cp1y = p1.y;
        
        // Draw to midpoint between p1 and p2
        const endX = (p1.x + p2.x) / 2;
        const endY = (p1.y + p2.y) / 2;
        
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
    }
    
    ctx.stroke();
}

function stopDrawing(e) {
    if (!isDrawing) return;
    e.preventDefault();
    isDrawing = false;
    pointBuffer = []; // Clear buffer when stroke ends
}

// Mouse events - click toggles drawing enabled/disabled
drawingCanvas.addEventListener('mousedown', (e) => {
    if (!drawingActive) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle drawing enabled state
    drawingEnabled = !drawingEnabled;
    
    // If we just disabled drawing, end any current stroke
    if (!drawingEnabled && isDrawing) {
        isDrawing = false;
        lastDrawPosition = null;
        pointBuffer = [];
    }
});
drawingCanvas.addEventListener('mousemove', draw);
drawingCanvas.addEventListener('mouseup', (e) => {
    // Do nothing on mouseup - we handle everything with mousedown toggle
    e.preventDefault();
});
drawingCanvas.addEventListener('mouseout', stopDrawing);

// Touch events with passive: false to prevent default and avoid console warnings
drawingCanvas.addEventListener('touchstart', startDrawing, { passive: false });
drawingCanvas.addEventListener('touchmove', draw, { passive: false });
drawingCanvas.addEventListener('touchend', stopDrawing, { passive: false });

// Initialize recording (but don't start capturing yet)
function initRecording() {
    drawingFrames = [];
    startTime = null; // Will be set on first touch
    canvasWidth = drawingCanvas.width;
    canvasHeight = drawingCanvas.height;
    hasStartedDrawing = false;
}

// Actually start capturing frames
function startFrameCapture() {
    if (!recordingInterval && hasStartedDrawing) {
        if (startTime === null) {
            startTime = Date.now();
        }
        // Continuously capture frames until user clicks "Create GIF"
        recordingInterval = setInterval(() => {
            captureFrame();
        }, 50); // 20fps for real-time representation
    }
}

function captureFrame() {
    // Capture canvas at full resolution
    try {
        const dataUrl = drawingCanvas.toDataURL('image/png');
        drawingFrames.push({
            data: dataUrl,
            timestamp: Date.now() - startTime
        });
    } catch (error) {
        console.error('Error capturing frame:', error);
        stopRecording();
    }
}

function stopRecording() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
}

// Clear canvas
clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset everything like the reset button, but keep thumbnails
    stopRecording();
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingCanvas.classList.remove('active');
    drawPrompt.classList.remove('hidden');
    clearBtn.classList.remove('visible');
    createBtn.classList.remove('visible');
    createBtn.disabled = false;
    clearBtn.disabled = false;
    drawingActive = false; // Disable drawing mode
    isDrawing = false; // Reset drawing state
    drawingEnabled = true; // Reset to enabled
    lastMoveTime = 0; // Reset timing
    lastDrawPosition = null; // Reset position
    if (strokeTimeoutId) {
        clearTimeout(strokeTimeoutId);
        strokeTimeoutId = null;
    }
    status.textContent = '';
    status.className = 'status';
    
    // DON'T clear thumbnails (unlike reset button)
    // DON'T revoke GIF URLs (unlike reset button)
});

// Create GIF
createBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    if (drawingFrames.length < 2) {
        return;
    }
    
    stopRecording();
    
    // Show overlay with loading animation
    overlayResult.classList.remove('active');
    overlayContent.classList.remove('active');
    loadingAnimation.classList.add('active');
    gifOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Force reload the loading GIF to restart animation
    const loadingSrc = loadingGif.src;
    loadingGif.src = '';
    loadingGif.src = loadingSrc;
    
    createBtn.disabled = true;
    clearBtn.disabled = true;
    
    await createGIF();
});

// Create GIF from frames
async function createGIF() {
    try {
        // Use captured frames at full resolution
        const framesToUse = drawingFrames;
        
        // Use exact canvas dimensions - no scaling
        const gifWidth = canvasWidth;
        const gifHeight = canvasHeight;
        
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: gifWidth,
            height: gifHeight,
            workerScript: WORKER_URL,
            repeat: -1 // Play once, no loop
        });

        // Create a single reusable canvas at exact GIF dimensions
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = gifWidth;
        tempCanvas.height = gifHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        
        // Process frames
        for (let i = 0; i < framesToUse.length; i++) {
            const frame = framesToUse[i];
            
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = frame.data;
            });
            
            // Debug: log image dimensions on first frame
            if (i === 0) {
                console.log(`Source image: ${img.width}x${img.height}, Target GIF: ${gifWidth}x${gifHeight}`);
            }
            
            // Fill with white background, then draw the signature at exact size
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, gifWidth, gifHeight);
            // No scaling - 1:1 copy of the full image
            tempCtx.drawImage(img, 0, 0);
            
            const delay = i < framesToUse.length - 1 
                ? framesToUse[i + 1].timestamp - frame.timestamp 
                : 200;
            
            gif.addFrame(tempCanvas, { copy: true, delay: delay });
            
            status.textContent = `Processing... ${Math.floor((i / framesToUse.length) * 100)}%`;
        }

        // Rendering in progress

        gif.on('finished', async (blob) => {
            console.log('GIF finished! Blob size:', blob.size);
            currentGifBlob = blob;
            currentGifUrl = URL.createObjectURL(blob);
            
            // Get fresh reference to the current gif image element
            const currentGifImage = document.getElementById('gifImage');
            const parent = currentGifImage.parentNode;
            
            // Remove old image element
            parent.removeChild(currentGifImage);
            console.log('Old image removed, creating fresh element for new GIF');
            
            // Create a completely fresh img element
            const newGifImage = document.createElement('img');
            newGifImage.id = 'gifImage';
            newGifImage.alt = 'Your signature GIF';
            
            // Create promises for both conditions
            const signatureReady = new Promise((resolve) => {
                newGifImage.onload = () => {
                    console.log('Signature GIF loaded');
                    resolve();
                };
            });
            
            const loadingAnimationComplete = new Promise((resolve) => {
                // Wait for loading GIF to complete at least one loop
                // Assuming loading GIF is about 1-2 seconds, we'll track it
                let hasLooped = false;
                const checkLoop = () => {
                    if (!hasLooped) {
                        hasLooped = true;
                        // Wait minimum 1 second for at least one animation loop
                        setTimeout(resolve, 1000);
                    }
                };
                // Start checking immediately
                checkLoop();
            });
            
            // Append to DOM
            parent.appendChild(newGifImage);
            
            // Set the fresh blob URL (will trigger onload when ready)
            requestAnimationFrame(() => {
                newGifImage.src = currentGifUrl;
                console.log('Fresh GIF URL set, waiting for load...');
            });
            
            // Wait for BOTH conditions to be met
            await Promise.all([signatureReady, loadingAnimationComplete]);
            
            console.log('Both signature and loading animation ready, showing result');
            
            // Now hide loading and show result
            requestAnimationFrame(() => {
                loadingAnimation.classList.remove('active');
                overlayContent.classList.add('active');
                overlayResult.classList.add('active');
            });
            
            // Hide drawing controls and show prompt again
            drawingCanvas.classList.remove('active');
            drawPrompt.classList.remove('hidden');
            clearBtn.classList.remove('visible');
            createBtn.classList.remove('visible');
            drawingActive = false;
            
            createBtn.disabled = false;
            clearBtn.disabled = false;
        });

        gif.on('progress', (progress) => {
            const percent = Math.round(progress * 100);
            status.textContent = `Rendering GIF... ${percent}%`;
        });
        
        gif.on('error', (error) => {
            console.error('GIF encoding error:', error);
            setTimeout(() => {
                gifOverlay.classList.remove('active');
                loadingAnimation.classList.remove('active');
                document.body.style.overflow = '';
            }, 2000);
            createBtn.disabled = false;
            clearBtn.disabled = false;
        });
        
        console.log(`Starting GIF render: ${gifWidth}x${gifHeight}, ${framesToUse.length} frames`);
        console.log(`Original canvas dimensions: ${canvasWidth}x${canvasHeight}`);
        gif.render();

    } catch (error) {
        console.error('Error creating GIF:', error);
        setTimeout(() => {
            gifOverlay.classList.remove('active');
            loadingAnimation.classList.remove('active');
            document.body.style.overflow = '';
        }, 2000);
        createBtn.disabled = false;
        clearBtn.disabled = false;
    }
}

// Overlay Controls
closeOverlay.addEventListener('click', () => {
    gifOverlay.classList.remove('active');
    overlayContent.classList.remove('active');
    overlayResult.classList.remove('active');
    document.body.style.overflow = '';
    // Reset GIF play state by clearing src
    setTimeout(() => {
        if (!gifOverlay.classList.contains('active')) {
            const currentGifImage = document.getElementById('gifImage');
            if (currentGifImage) currentGifImage.src = '';
        }
    }, 300); // Wait for overlay close animation
});

// Close overlay on background click
gifOverlay.addEventListener('click', (e) => {
    if (e.target === gifOverlay) {
        gifOverlay.classList.remove('active');
        overlayContent.classList.remove('active');
        overlayResult.classList.remove('active');
        document.body.style.overflow = '';
        // Reset GIF play state by clearing src
        setTimeout(() => {
            if (!gifOverlay.classList.contains('active')) {
                const currentGifImage = document.getElementById('gifImage');
                if (currentGifImage) currentGifImage.src = '';
            }
        }, 300); // Wait for overlay close animation
    }
});

// Close overlay with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gifOverlay.classList.contains('active')) {
        gifOverlay.classList.remove('active');
        overlayContent.classList.remove('active');
        overlayResult.classList.remove('active');
        document.body.style.overflow = '';
        // Reset GIF play state by clearing src
        setTimeout(() => {
            if (!gifOverlay.classList.contains('active')) {
                const currentGifImage = document.getElementById('gifImage');
                if (currentGifImage) currentGifImage.src = '';
            }
        }, 300); // Wait for overlay close animation
    }
});

// Download from overlay
downloadBtnOverlay.addEventListener('click', () => {
    if (currentGifUrl) {
        const a = document.createElement('a');
        a.href = currentGifUrl;
        a.download = `signature-${Date.now()}.gif`;
        a.click();
    }
});

// Save thumbnail
saveThumbnail.addEventListener('click', () => {
    if (currentGifUrl) {
        // Lock position when adding first thumbnail
        if (thumbnailArea.children.length === 0) {
            document.body.classList.add('has-content');
        }
        
        // Capture the specific GIF BLOB for this thumbnail (important for closure)
        const savedGifBlob = currentGifBlob;
        const savedGifUrl = currentGifUrl;
        
        // Create thumbnail
        const thumbItem = document.createElement('div');
        thumbItem.className = 'thumbnail-item';
        
        const thumbImg = document.createElement('img');
        thumbImg.src = savedGifUrl;
        thumbImg.alt = 'Signature GIF';
        
        thumbItem.appendChild(thumbImg);
        
        // Click thumbnail to re-open in overlay
        thumbItem.addEventListener('click', () => {
            console.log('Thumbnail clicked, forcing GIF replay');
            
            // Get fresh reference to the current gif image element
            const currentGifImage = document.getElementById('gifImage');
            const parent = currentGifImage.parentNode;
            
            // Revoke the old blob URL if it exists and is different
            const oldSrc = currentGifImage.src;
            if (oldSrc && oldSrc.startsWith('blob:') && oldSrc !== savedGifUrl) {
                URL.revokeObjectURL(oldSrc);
                console.log('Old blob URL revoked');
            }
            
            // Create a FRESH blob URL from the saved blob (forces browser to treat as new)
            const freshBlobUrl = URL.createObjectURL(savedGifBlob);
            console.log('Created fresh blob URL:', freshBlobUrl);
            
            // AGGRESSIVE approach: completely remove the old element
            parent.removeChild(currentGifImage);
            console.log('Old image removed from DOM');
            
            // Create a completely fresh img element
            const newGifImage = document.createElement('img');
            newGifImage.id = 'gifImage';
            newGifImage.alt = 'Your signature GIF';
            
            // Wait for image to load before showing overlay
            newGifImage.onload = () => {
                console.log('GIF loaded into memory, showing overlay');
                // Now show overlay with smooth animation
                requestAnimationFrame(() => {
                    gifOverlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                });
            };
            
            // Append first, THEN set src (important for forcing reload)
            parent.appendChild(newGifImage);
            console.log('New image added to DOM');
            
            // Set the fresh blob URL (will trigger onload when ready)
            requestAnimationFrame(() => {
                newGifImage.src = freshBlobUrl;
                console.log('Fresh blob URL set on new image - loading...');
            });
        });
        
        thumbnailArea.appendChild(thumbItem);
        
        // Close overlay
        gifOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Reset GIF play state by clearing src
        setTimeout(() => {
            if (!gifOverlay.classList.contains('active')) {
                const currentGifImage = document.getElementById('gifImage');
                if (currentGifImage) currentGifImage.src = '';
            }
        }, 300); // Wait for overlay close animation
    }
});
// Reset
resetBtn.addEventListener('click', () => {
    stopRecording();
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingCanvas.classList.remove('active');
    drawPrompt.classList.remove('hidden');
    clearBtn.classList.remove('visible');
    createBtn.classList.remove('visible');
    createBtn.disabled = false;
    clearBtn.disabled = false;
    drawingActive = false; // Disable drawing mode
    isDrawing = false; // Reset drawing state
    drawingEnabled = true; // Reset to enabled
    lastMoveTime = 0; // Reset timing
    lastDrawPosition = null; // Reset position
    if (strokeTimeoutId) {
        clearTimeout(strokeTimeoutId);
        strokeTimeoutId = null;
    }
    status.textContent = '';
    status.className = 'status';
    
    // Clear thumbnails
    thumbnailArea.innerHTML = '';
    
    // Re-center body when content is cleared
    document.body.classList.remove('has-content');
    
    // Clean up GIF resources
    if (currentGifUrl) {
        URL.revokeObjectURL(currentGifUrl);
        currentGifUrl = null;
        currentGifBlob = null;
    }
});

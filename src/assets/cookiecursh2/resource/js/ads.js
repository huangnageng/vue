// Copyright 2013 Google Inc. All Rights Reserved.
// You may study, modify, and use this example for any purpose.
// Note that this example is provided "as is", WITHOUT WARRANTY
// of any kind either expressed or implied.

var adsManager;
var adsLoader;
var adDisplayContainer;
var adContainerElement;
var shouldReRequestAd=false;//请求广告失败了,播放广告的时候需要去重新请求一次
var welcomeTagUrl="https://googleads.g.doubleclick.net/pagead/ads?ad_type=video_text_image&client=ca-games-pub-7114386181576635&description_url=http%3A%2F%2Fwww.dailyluck.net&hl=zh_CN&max_ad_duration=30000";
var leisureTagUrl="https://googleads.g.doubleclick.net/pagead/ads?ad_type=video_text_image&client=ca-games-pub-7114386181576635&description_url=http%3A%2F%2Fwww.dailyluck.net&hl=zh_CN&max_ad_duration=30000";
var AdType = 0;//0表示开屏,不需要重试,1表示游戏过程,需要重试
function setUpIMA() {
  // Create the ad display container.
  createAdDisplayContainer();
  // Create ads loader.
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  // Listen and respond to ads loaded and error events.
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded,
      false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      onAdError,
      false);

    adDisplayContainer.initialize();
    console.log("初始化广告SDK成功");
};

function requestAd(){

// 请求 AdSense 游戏广告
  var adsRequest = new google.ima.AdsRequest();

// 设置 AdSense 游戏广告代码
  adsRequest.adTagUrl = leisureTagUrl;
  //adsRequest.adTagUrl = "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=";


// 强制使图片/文字广告以全幅界面展示
  adsRequest.forceNonLinearFullSlot = true;

  // Specify the linear and nonlinear slot sizes. This helps the SDK to
  // select the correct creative if multiple are returned.
  adsRequest.linearAdSlotWidth = document.body.clientWidth;
  adsRequest.linearAdSlotHeight = document.body.clientHeight;
  adsRequest.nonLinearAdSlotWidth = document.body.clientWidth;
  adsRequest.nonLinearAdSlotHeight = document.body.clientHeight;
  adsLoader.requestAds(adsRequest);

}


function createAdDisplayContainer() {
  // We assume the adContainer is the DOM id of the element that will house
  // the ads.
  adContainerElement = document.getElementById("adContainer");
  adDisplayContainer = new google.ima.AdDisplayContainer(adContainerElement);

}

function playAds() {
  // Initialize the container. Must be done via a user action on mobile devices.
  //videoContent.load();
// Request video ads.

    if(shouldReRequestAd){
        uploadAdResult(0);
        requestAdByType(1);
        return ;
    }
  try {
    // Initialize the ads manager. Ad rules playlist will start at this time.
    adsManager.init(document.body.clientWidth,document.body.clientHeight, google.ima.ViewMode.NORMAL);
    // Call play to start showing the ad. Single video and overlay ads will
    // start at this time; the call will be ignored for ad rules.
    adContainerElement.style.display="";
    adsManager.start();
  } catch (adError) {
    // An error may be thrown if there was a problem with the VAST response.
    console.log(adError);
    adContainerElement.style.display="none";

  }
}

function onAdsManagerLoaded(adsManagerLoadedEvent) {
  // Get the ads manager.
  var adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  // videoContent should be set to the content video element.
  adsManager = adsManagerLoadedEvent.getAdsManager(adsRenderingSettings);

  // Add listeners to the required events.

  adsManager.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      onAdError);

  var i = [google.ima.AdEvent.Type.ALL_ADS_COMPLETED, google.ima.AdEvent.Type.AD_METADATA, google.ima.AdEvent.Type.COMPLETE, google.ima.AdEvent.Type.FIRST_QUARTILE, google.ima.AdEvent.Type.LOADED, google.ima.AdEvent.Type.MIDPOINT, google.ima.AdEvent.Type.PAUSED, google.ima.AdEvent.Type.EXPANDED_CHANGED, google.ima.AdEvent.Type.STARTED, google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED, google.ima.AdEvent.Type.THIRD_QUARTILE, google.ima.AdEvent.Type.USER_CLOSE, google.ima.AdEvent.Type.SKIPPED, google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,google.ima.AdEvent.Type.CLICK,google.ima.AdEvent.Type.IMPRESSION];
  for (var s in i) {
    adsManager.addEventListener(i[s], onAdEvent);
  }

  if (AdType==0) {
   
     playAds();

  }

}

function onAdEvent(adEvent) {
  // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
  // don't have ad object associated.
  var ad = adEvent.getAd();
  switch (adEvent.type) {
    case google.ima.AdEvent.Type.LOADED:
      {
      // This is the first event sent for an ad - it is possible to
      // determine whether the ad is a video ad or an overlay.
      console.log("广告加载完成");
      //adsLoader.contentComplete();
      shouldReRequestAd = false;

      
    }
      break;
    case google.ima.AdEvent.Type.STARTED: {
      // This event indicates the ad has started - the video player
      // can adjust the UI, for example display a pause button and
      // remaining time.
       console.log("广告开始播放");
    }
      break;
    case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
    case google.ima.AdEvent.Type.SKIPPED:
    case google.ima.AdEvent.Type.USER_CLOSE:

    {
      console.log("关闭广告");
      adContainerElement.style.display = "none";
      requestAdByType(1);

    }
    break;
    case google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED:{
    }
    break;
    case google.ima.AdEvent.Type.CLICK:{

         uploadClickResult();
    }
    break;
    case google.ima.AdEvent.Type.IMPRESSION:{
      
          uploadAdResult(1);
    }
    break;
    default:

      break;

  }
};

function onAdError(adErrorEvent) {
  // Handle the error logging.
  console.log("广告加载失败:"+adErrorEvent.getError());
  if(AdType==1){
     shouldReRequestAd = true;
  }

  if(AdType==0){

     uploadAdResult(0);
     requestAdByType(1);

  }
  adContainerElement.style.display = "none";
};
function uploadAdResult(success){
   
   var type = AdType;
   console.log("上传广告展示类别:"+type+" 结果:"+success);

    if (type ==1 ){
    ga('send', 'event', {
        eventCategory: '游戏页',
        eventAction: '广告展示',
        eventLabel:(success)
    });
  }else{
  
 ga('send', 'event', {
        eventCategory: '主页',
        eventAction: '广告展示',
        eventLabel:(success)
    });

  }
};

function requestAdByType(type){
  AdType = type;
  console.log("请求广告:"+type);
  switch(type){
    case 0:
    innerRequestAd(welcomeTagUrl);
    break;
    case 1:
    innerRequestAd(leisureTagUrl);
    break;

  }

};
function innerRequestAd(tagId){

try {
// 请求 AdSense 游戏广告
  var adsRequest = new google.ima.AdsRequest();

// 设置 AdSense 游戏广告代码
  adsRequest.adTagUrl = tagId;
  //adsRequest.adTagUrl = "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=";
// 强制使图片/文字广告以全幅界面展示
  adsRequest.forceNonLinearFullSlot = true;

  // Specify the linear and nonlinear slot sizes. This helps the SDK to
  // select the correct creative if multiple are returned.
  adsRequest.linearAdSlotWidth = document.body.clientWidth;
  adsRequest.linearAdSlotHeight = document.body.clientHeight;
  adsRequest.nonLinearAdSlotWidth = document.body.clientWidth;
  adsRequest.nonLinearAdSlotHeight = document.body.clientHeight;
  adsLoader.requestAds(adsRequest);

}catch(exception){
 
 

}

};

function uploadClickResult(){

var type = AdType;

   console.log("上传广告点击类别:"+type);

    if (type ==1 ){
    ga('send', 'event', {
        eventCategory: '游戏页',
        eventAction: '广告点击',
        eventLabel:1
    });
  }else{
  
 ga('send', 'event', {
        eventCategory: '主页',
        eventAction: '广告点击',
        eventLabel:1
    });

  }

};

function showAdBannerInGame(){

  var banner = document.createElement("div");
  banner.style.textAlign = "center";
  banner.style.left="0px";
  banner.style.top = (document.body.clientHeight-55) +"px";
  banner.style.width = document.body.clientWidth+"px";
  banner.style.display = "block";
  banner.style.position ="absolute";
  banner.id ="bannerInBottom";
  //banner.style.backgroundColor = "#ffffff";

  banner.innerHTML= '<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script><ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="ca-pub-3805269208012660" data-ad-slot="1795722417" google_page_url = "http://www.dailyluck.net"></ins>';
 
  document.body.appendChild(banner);

 (adsbygoogle = window.adsbygoogle || []).push({});

};
function hideAdBannerInGame(){

var banner = document.getElementById("bannerInBottom");
document.body.removeChild(banner);

};

function pushBannerAd(){

console.log("...........");

};




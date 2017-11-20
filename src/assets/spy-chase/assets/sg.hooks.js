var SG = {

    registerGameObserver:function(a){},
    setResizeHandler:function(a){},
    lang:"en"

};

var startFunction;
var currentLevel;
var loadGameTime = new Date().getTime();
var SG_Hooks = {
debug: !!window.console && !0,
PAGE_WELCOME_SCREEN: "welcome-screen",
PAGE_MODE_SELECTION: "mode-selection",
PAGE_MAIN_MENU: "main-menu",
PAGE_READY_FOR_MATCH: "ready-for-match",
PAGE_PAUSE: "pause",
PAGE_GAME_OVRE: "game-over",
PAGE_LEVELS_MAP: "levels-map",
PAGE_SHOP: "shop",
PAGE_DAILY_GIFT: "daily-gift",
OFFER_TYPE_BOOSTER: "booster",
OFFER_TYPE_ITEM: "item",
OFFER_TYPE_LIFE: "life",
getLanguage: function(a) {
    return false;
},
getGameConfig: function() {
     return "";
},
isEnabledIncentiviseButton: function() {
    return false;
},
loaded: function() {
    // SG_Hooks.debug && console.log("game loaded"), SG.trigger({
    //                                                          type: "loaded"
    //                                                          })

console.log("=====loaded");
didLoadCompleted();

},
start: function(a) {
    // SG_Hooks.debug && console.log("game started with status:", a), SG.trigger({
    //                                                                           type: "start",
    //                                                                           status: a
    //                                                                           })


   //console.log("=====start:"+a);
    
    console.log("====start");

},
readyForMatch: function() {
    // SG_Hooks.debug && console.log("ready for match"), SG.trigger({
    //                                                              type: "readyForMatch"
    //                                                              })

 console.log("=====readyForMatch");

},
levelStarted: function(a) {
    // SG_Hooks.debug && console.log("level started:" + a), SG.trigger({
    //                                                                 type: "levelStarted",
    //                                                                 level: a
    //                                                                 })

    console.log("====levelStarted:"+a);
    didClickedLevel(a);

},
levelFinished: function(a, b, c, d) {
    // SG_Hooks.debug && console.log("level finished:" + a + " score: " + b + "opponentScore: " + c), SG.trigger({
    //                                                                                                           type: "levelFinished",
    //                                                                                                           level: a,
    //                                                                                                           score: b,
    //                                                                                                           opponentScore: c,
    //                                                                                                           gameRecord: d
    //                                                                                                           })
     didEndGame(a);


},
tutorialFinished: function() {
    // SG_Hooks.debug && console.log("tutorial finished"), SG.trigger({
    //                                                                type: "tutorialFinished"
    //                                                                })
},
levelUp: function(a, b, c) {
    // SG_Hooks.debug && console.log("level up:" + a + "/" + b), SG.trigger({
    //                                                                      type: "levelUp",
    //                                                                      level: a,
    //                                                                      lastLevelScore: b
    //                                                                      }, c)

     console.log("====levelUp:"+a);
     if(c){
        c();
     }

},
gameOver: function(a, b, c) {
    // SG_Hooks.debug && console.log("game over:" + a + "/" + b), SG.trigger({
    //                                                                       type: "gameOver",
    //                                                                       score: b,
    //                                                                       level: a
    //                                                                       }, c)

     console.log("====gameOver:"+a);

},
gameCompleted: function(a, b) {
    // SG_Hooks.debug && console.log("game completed:" + a), SG.trigger({
    //                                                                  type: "gameCompleted",
    //                                                                  score: a
    //                                                                  }, b)

     console.log("====gameCompleted:"+a);

},
gamePause: function(a, b) {
    // SG_Hooks.debug && console.log("game pause:" + a), SG.trigger({
    //                                                              type: "gamePause",
    //                                                              state: a
    //                                                              }, b)

     didPauseGame();


},
gameRestart: function(a) {
    // SG_Hooks.debug && console.log("game restart:"), SG.trigger({
    //                                                            type: "gameRestart"
    //                                                            }, a)


     console.log("====gameRestart:"+a);


},
selectMainMenu: function(a) {
    // SG_Hooks.debug && console.log("selectMainMenu:"), SG.trigger({
    //                                                              type: "selectMainMenu"
    //                                                              }, a)
},
selectLevel: function(a, b) {
    // SG_Hooks.debug && console.log("selectLevel:" + a), SG.trigger({
    //                                                               type: "selectLevel",
    //                                                               level: a
    //                                                               }, b)

     console.log("====selectLevel:"+a);
     currentLevel = a

},
setSound: function(a, b) {
    // SG_Hooks.debug && console.log("setSound:" + a), SG.trigger({
    //                                                            type: "gameCompleted",
    //                                                            state: a
    //                                                            }, b)
},
triggerIncentivise: function(a) {
    // SG_Hooks.debug && console.log("triggerIncentivise"), SG.trigger({
    //                                                                 type: "incentiviseTriggered"
    //                                                                 }, a)
},
triggerLogin: function(a) {
    // SG_Hooks.debug && console.log("triggerLogin"), SG.triggerLogin(a)
},
triggerMoreGames: function() {
    // try {
    //     SG_Hooks.debug && console.log("triggerMoreGames"), SG.redirectToPortal()
    // } catch (a) {
    //     SG_Hooks.debug && console.error("Trigger more games failed", a)
    // }
},
getLoginButton: function(a, b) {
    // return SG_Hooks.debug && console.log("getLoginButton", a), SG.getLoginButton(a, b)
},
isLoginButtonEnabled: function(a) {
    // SG_Hooks.debug && console.log("isLoginButtonEnabled"), SG.isLoginButtonEnabled(a)
},
getHighscoresPerLevel: function(a, b) {
    // SG_Hooks.debug && console.log("getHighscoresPerLevel " + a), SG.getHighscoresPerLevel(a, b)
},
getOffers: function(a, b) {
    // SG_Hooks.debug && console.log("getOffers for section: " + a), SG.getOffers(a, b)
},
startOffer: function(a, b) {
    // SG_Hooks.debug && console.log("Start offer : " + a), SG.startOffer(a, b)
},
offerCompleted: function(a, b) {
    // SG_Hooks.debug && console.log("Offer id [" + a + "] is accepted: " + String(b)), SG.dispatchEvent(SG.EVENT_OFFER_COMPLETED, {
    //                                                                                                   offerId: a,
    //                                                                                                   successful: b
    //                                                                                                   })
},
getUserExperienceLevel: function() {
    // return SG_Hooks.debug && console.log("Get in-game currency"), SG.getUserExperienceLevel()
},
getIngameCurrency: function() {
    // return SG_Hooks.debug && console.log("Get in-game currency"), SG.getIngameCurrency()
},
addIngameCurrency: function(a) {
    // return SG_Hooks.debug && console.log("Add in-game currency: ", a), SG.addIngameCurrency(a)
},
deductIngameCurrency: function(a) {
    // return SG_Hooks.debug && console.log("Deduct in-game currency: ", a), SG.deductIngameCurrency(a)
},
getUnlockedBoosters: function() {
    // return SG_Hooks.debug && console.log("Get unclocked boosters"), SG.getUnlockedBoosters()
},
addBooster: function(a, b) {
    // return SG_Hooks.debug && console.log("Add booster: " + a + " - " + b), SG.addBooster(a, b)
},
deductBooster: function(a, b) {
    // return SG_Hooks.debug && console.log("Deduct booster: " + a + " - " + b), SG.deductBooster(a, b)
},
getUnlockedItems: function() {
    // return SG_Hooks.debug && console.log("Get unclocked items"), SG.getUnlockedItems()
},
addItem: function(a, b) {
    // return SG_Hooks.debug && console.log("Add item: " + a + " - " + b), SG.addItem(a, b)
},
deductItem: function(a, b) {
    // return SG_Hooks.debug && console.log("Deduct item: " + a + " - " + b), SG.deductItem(a, b)
},
getNativeAds: function(a, b) {
    // SG.getNativeAds(a, b)
},
startNativeAd: function(a, b) {
    // SG.startNativeAd(a, b)
},
setOrientationHandler: function(a) {
    // SG.setOrientationHandler(a)
},
setResizeHandler: function(a) {
    // SG.setResizeHandler(a)
},
setPauseHandler: function(a) {
    // SG.setPauseHandler(a)
},
setUnpauseHandler: function(a) {
    // SG.setUnpauseHandler(a)
},
buildKey: function(a) {
    // return SG.getGameId() + "." + a
},
startMultiplayerMode: function(a) {
    // SG.switchToMode("multi", a)
},
startSingleplayerMode: function(a) {
    // SG.switchToMode("single", a)
},
registerObserver: function(a) {
    // SG.registerGameObserver(a)

 //console.log("=====registerObserver:"+a);
  startFunction = a;

},
registerGameDataReceiver: function(a) {
    // SG.registerGameDataReceiver(a)

     console.log("=====registerGameDataReceiver:"+a);

},
triggerWalkthrough: function(a) {
    // SG.trigger({
    //            type: "triggerWalktrough"
    //            }, a)
},
triggerGift: function(a, b) {
    console.log(a), b()
},
triggerDailyTask: function(a) {
    a()
},
getAmountOfDailyTasksTodo: function(a) {
    a()
},
pageDisplayed: function(a) {
    // SG_Hooks.debug && console.log("page displayed:" + a), SG.trigger({
    //                                                                  type: "pageDisplayed",
    //                                                                  page: a
    //                                                                  })
},
beforePlayButtonDisplay: function(a) {
    // SG_Hooks.debug && console.log("Executing beforePlayButtonDisplay ...", {
    //                               callbackGiven: !!a
    //                               }), SG.dispatchEvent(SG.EVENT_BEFORE_PLAY_BUTTON_DISPLAY, null, a)
},
playButtonPressed: function(a) {
    // SG_Hooks.debug && console.log("Executing playButtonPressed ...", {
    //                               callbackGiven: !!a
    //                               }), SG.dispatchEvent(SG.EVENT_PLAY_BUTTON_PRESSED, null, a)

},
sendRtmAction: function(a, b) {
    // SG_Hooks.debug && console.log("Executing sendRtmAction ...", b), SG.dispatchEvent(SG.EVENT_RTM_ACTION, {
    //                                                                                   eventName: a,
    //                                                                                   eventData: b
    //                                                                                   })
},
track: function(a, b) {
    // SG_Hooks.debug && console.log("Tracking event: " + a, b), SG.track(a, b)
},
assignPlayMatchCallback: function(a) {
    // SG.assignPlayMatchCallback(a)
},
getStorageItem: function(a) {
    
    return localStorage.getItem(a);
},
getStorageItemAsync: function(a, b, c) {
       return localStorage.getItem(a);

},
setStorageItem: function(a, b) {
    localStorage.setItem(a,b);
},
social: {
getConfig: function() {
    
    return "";

},
friends: {
displayInvite: function(a, b) {
    // SG_Hooks.debug && console.log("Social [Friends] displayInvite called."), SG.social.friends.displayInvite(a, b)
},
getList: function(a) {
    // SG_Hooks.debug && console.log("Social [Friends] getList called."), SG.social.friends.getList(a)
}
},
gameRequests: {
displayGameRequest: function(a, b, c) {
    // SG_Hooks.debug && console.log("Social [GameRequest] displayGameRequest called."), SG.social.gameRequests.displayGameRequest(a, b, c)
},
sendGameRequest: function(a, b, c) {
    // SG_Hooks.debug && console.log("Social [GameRequest] send called."), SG.social.gameRequests.sendGameRequest(a, b, c)
},
registerCallback: function(a) {
    // SG_Hooks.debug && console.log("Social [GameRequest] registerCallback called."), SG.social.gameRequests.registerCallback(a)
}
},
highscores: {
sendScore: function(a, b) {
    // SG_Hooks.debug && console.log("Social [Highscores] sendScore called."), SG.social.highscores.sendScore(a, b)
},
getList: function(a, b) {
    // SG_Hooks.debug && console.log("Social [Highscores] getList called."), SG.social.highscores.getList(a, b)
}
},
messages: {
postOnWall: function(a, b, c) {
    // SG_Hooks.debug && console.log("Social [Messages] postOnWall called."), SG.social.messages.postOnWall(a, b, c)
}
},
payments: {
purchaseItems: function() {
    // return SG_Hooks.debug && console.log("Social [Payments] purchaseItems called."), SG.social.payments.purchaseItems()
},
triggerPurchase: function(a, b, c, d, e) {
    // return SG_Hooks.debug && console.log("Social [Payments] triggerPurchase called."), SG.social.payments.triggerPurchase(a, b, c, d, e)
}
}
},
setStorageItemAsync: function(a, b, c, d) {
    
    localStorage.setItem(a,b);

}
};


function didLoadCompleted(){

   var loadingView = document.getElementById('loadingView');
   if(loadingView){
    loadingView.style.display='none';
   }
   
   var time= parseInt(((new Date().getTime())-loadGameTime)/1000.0);
   console.log("游戏加载完成了:"+time+"s");
   ga('send', 'event', {
    eventCategory: '主页',
    eventAction: '加载完成',
    eventLabel: time
  });

   showAdBannerInGame();

};
function didClickedPlay(){

    hideAdBannerInGame();
    console.log("点击play");
    ga('send', 'event', {
    eventCategory: '主页',
    eventAction: '点击Play'
  });
};
function didClickedLevel(level){

    console.log("点击关卡:"+level);

    ga('send', 'event', {
    eventCategory: '关卡',
    eventAction: '点击关卡',
    eventLabel:(level)
  });

};

function didstartGame(){

    console.log("游戏开始了:"+(G.lvlNr+1));

     ga('send', 'event', {
    eventCategory: '游戏页',
    eventAction: '开始游戏',
    eventLabel:(G.lvlNr+1)
  });
};
function didEndGame(level){
    console.log("游戏结束了:"+(level));
   ga('send', 'event', {
    eventCategory: '游戏页',
    eventAction: '结束游戏',
    eventLabel:(level)
  });
};

function didPauseGame(){
    console.log("暂停游戏");
    ga('send', 'event', {
        eventCategory: '游戏页',
        eventAction: '暂停游戏',
        eventLabel:(currentLevel)
    });
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

  banner.innerHTML= '<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script><ins class="adsbygoogle"style="display:inline-block;width:320px;height:50px"data-ad-client="ca-pub-3545063517335060"data-ad-slot="6214568844"></ins><script>';
 
  document.body.appendChild(banner);

 (adsbygoogle = window.adsbygoogle || []).push({});

};
function hideAdBannerInGame(){

var banner = document.getElementById("bannerInBottom");
if(banner){
    
    document.body.removeChild(banner);

}

};

 function startLoadGame (){

           loadGameTime = new Date().getTime();
          
        };
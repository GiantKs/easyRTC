let Utils = {
    isPc: () => {
        var userAgentInfo = navigator.userAgent;
        var Agents = ["Android", "iPhone",
            "SymbianOS", "Windows Phone",
            "iPad", "iPod"];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    },
    isIos() {
        var u = navigator.userAgent;
        if (u.indexOf('Android') > -1 || u.indexOf('Linux') > -1) {//安卓手机
            // return "Android";
            return false
        } else if (u.indexOf('iPhone') > -1) {//苹果手机
            // return "iPhone";
            return true
        } else if (u.includes('Apple') && !u.includes('Chrome')) {
            return true
        } else if (u.indexOf('iPad') > -1) {//iPad
            // return "iPad";
            return false
        } else if (u.indexOf('Windows Phone') > -1) {//winphone手机
            // return "Windows Phone";
            return false
        } else {
            return false
        }
    },
    isIosSafari() {
        const userAgent = navigator.userAgent;

        const isIOS = /iPhone|iPad|iPod/.test(userAgent);

        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

        return isIOS && isSafari;
    },
    setItem: (key: string, value: any) => {
        window.localStorage.setItem(key, value)
    },
    getItem: (key: string) => {
        return window.localStorage.getItem(key) || '';
    },
    rmItem: (key: string) => {
        window.localStorage.removeItem(key);
    },
    generateGuid: () => {
        function _s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' +
            _s4() + '-' + _s4() + _s4() + _s4();
    },
    isPhoneNumber: (number: string) => {
        var myreg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
        return myreg.test(number);
    },
    getUrlParam: (str: string, name: string) => {
        str = str.split('?')[1];
        str = str ? str : "";
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = str.match(reg);
        if (r != null) {
            return decodeURIComponent(r[2]);
        }
        return null;
    },
    formatDuring: function (mss: any) {
        var days = parseInt(String(mss / (1000 * 60 * 60 * 24)));
        var hours = parseInt(String((mss % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
        var minutes = parseInt(String((mss % (1000 * 60 * 60)) / (1000 * 60)));
        var seconds = (mss % (1000 * 60)) / 1000;
        let str = '';
        if (days) {
            str += days + " 天 "
        }
        if (hours) {
            str += hours + " 小时 "
        }
        if (minutes) {
            str += minutes + " 分钟 "
        }
        if (seconds) {
            str += seconds + " 秒 "
        }
        return str;
    },
    queryString: (str = '') => {
        try {
            let params = str.split('?')[1];
            let param = params.split('&');
            let obj: any = {};
            for (let i = 0; i < param.length; i++) {
                let paramsA = param[i].split('=');
                let key = paramsA[0];
                let value = paramsA[1];
                obj[key] = value;
            }
            return obj;
        } catch (e) {
            return false
        }
    },
    checkURL: (url: string) => {
        var str = url;
        var Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
        var objExp = new RegExp(Expression);
        if (objExp.test(str) == true) {
            return true;
        } else {
            return false;
        }
    },
    getStats: (pc: any) => {
        return new Promise(async (res, rej) => {
            try {
                if (!pc) {
                    return
                }
                const status = await pc.getStats();
                const streamStatsModel = {
                    inboundRtp: [],
                    outboundRtp: [],
                    candidatePair: [],
                    mediaSource: [],
                    remoteInboundRtp: [],
                    track: [],
                    transport: [],
                    calculated: {
                        t_kbitrateReceived: 0,
                        t_kbitrateSent: 0,
                        v_kbitrateReceived: 0,
                        v_kbitrateSent: 0,
                        v_frameRate: 0,
                        a_kbitrateReceived: 0,
                        a_kbitrateSent: 0,
                        v_pkt_sent: 0,
                        v_nack_sent: 0,
                        v_pkt_recv: 0,
                        v_nack_recv: 0
                    }
                };
                const local = false;
                let packetLossRate = 0;
                const setPacketLossRate = () => {
                    if (local) {
                        const vPktSent = streamStats.calculated.v_pkt_sent;
                        const vNackSent = streamStats.calculated.v_nack_sent;
                        const percent = vPktSent > 0 ? vNackSent / vPktSent : 0;
                        packetLossRate = Math.min(Number((percent * 100).toFixed(2)), 100);
                    } else {
                        const vPktRecv = streamStats.calculated.v_pkt_recv;
                        const vNackRecv = streamStats.calculated.v_nack_recv;
                        const percent = vPktRecv > 0 ? vNackRecv / (vNackRecv + vPktRecv) : 0;
                        packetLossRate = Math.min(Number((percent * 100).toFixed(2)), 100);
                    }
                }
                let streamStats: any = JSON.parse(JSON.stringify(streamStatsModel))
                if (status) {
                    const nowStats = JSON.parse(JSON.stringify(streamStatsModel));
                    status.forEach((stat: any) => {
                        if (stat.type === 'inbound-rtp' || stat.type === 'inboundrtp') {
                            nowStats.inboundRtp.push(stat);
                            if (streamStats.inboundRtp.length > 0) {
                                if (stat.mediaType === 'audio') {
                                    const newbytesReceived = stat.bytesReceived;
                                    let oldbytesReceived = 0;
                                    streamStats.inboundRtp.forEach((streamStat: any) => {
                                        if (streamStat.kind === 'audio') {
                                            oldbytesReceived = streamStat.bytesReceived;
                                        }
                                    });
                                    nowStats.calculated.a_kbitrateReceived += parseInt(String((newbytesReceived - oldbytesReceived) / 1000), 10) * 8;
                                } else if (stat.mediaType === 'video') {
                                    const newbytesReceived = stat.bytesReceived;
                                    let oldbytesReceived = 0;
                                    streamStats.inboundRtp.forEach((streamStat: any) => {
                                        if (streamStat.kind === 'video') {
                                            oldbytesReceived = streamStat.bytesReceived;
                                        }
                                    });
                                    nowStats.calculated.v_kbitrateReceived += parseInt(String((newbytesReceived - oldbytesReceived) / 1000), 10) * 8;

                                    const newPacketsRecv = stat.packetsReceived;
                                    let oldPacketsRecv = 0;
                                    const newNackCount = stat.nackCount;
                                    let oldNackCount = 0;
                                    streamStats.inboundRtp.forEach((streamStat: any) => {
                                        if (streamStat.kind === 'video') {
                                            oldPacketsRecv = streamStat.packetsReceived;
                                            oldNackCount = streamStat.nackCount;
                                        }
                                    });
                                    nowStats.calculated.v_pkt_recv = newPacketsRecv - oldPacketsRecv;
                                    nowStats.calculated.v_nack_recv = newNackCount - oldNackCount;
                                    setPacketLossRate();
                                }
                            }
                        } else if (stat.type === 'outbound-rtp' || stat.type === 'outboundrtp') {
                            nowStats.outboundRtp.push(stat);
                            if (streamStats.outboundRtp.length > 0) {
                                if (stat.mediaType === 'audio') {
                                    const anewbytesSent = stat.bytesSent;
                                    let aoldbytesSent = 0;
                                    streamStats.outboundRtp.forEach((streamStat: any) => {
                                        if (streamStat.kind === 'audio') {
                                            aoldbytesSent = streamStat.bytesSent;
                                        }
                                    });
                                    nowStats.calculated.a_kbitrateSent += parseInt(String((anewbytesSent - aoldbytesSent) / 1000), 10) * 8;
                                } else if (stat.mediaType === 'video') {
                                    const newbytesSent = stat.bytesSent;
                                    let oldbytesSent = 0;
                                    const newPacketsSent = stat.packetsSent;
                                    let oldPacketsSent = 0;
                                    const newNackCount = stat.nackCount;
                                    let oldNackCount = 0;
                                    streamStats.outboundRtp.forEach((streamStat: any) => {
                                        if (streamStat.kind === 'video' && streamStat.ssrc === stat.ssrc) {
                                            oldbytesSent = streamStat.bytesSent;
                                            oldPacketsSent = streamStat.packetsSent;
                                            oldNackCount = streamStat.nackCount;
                                            nowStats.calculated.v_kbitrateSent += parseInt(String((newbytesSent - oldbytesSent) / 1000), 10) * 8;
                                            nowStats.calculated.v_pkt_sent += newPacketsSent - oldPacketsSent;
                                            nowStats.calculated.v_nack_sent += newNackCount - oldNackCount;
                                        }
                                    });
                                    setPacketLossRate();
                                }
                            }
                        } else if (stat.type === 'track') {
                            nowStats.track.push(stat);
                            if (streamStats.track.length > 0) {
                                if (stat.kind === 'video') {
                                    const newFramesSent = local ? stat.framesSent : stat.framesReceived;
                                    let oldFramesSent = 0;
                                    streamStats.track.forEach((streamStat: any) => {
                                        if (streamStat.kind === 'video') {
                                            oldFramesSent = local ? streamStat.framesSent : streamStat.framesReceived;
                                        }
                                    });
                                    const framerate = newFramesSent - oldFramesSent;
                                    nowStats.calculated.v_frameRate = framerate;
                                    //this.checkVideoStunk(framerate);
                                }
                            }
                        } else if (stat.type === 'transport') {
                            nowStats.transport.push(stat);
                            if (streamStats.transport.length > 0) {
                                const oldbytesReceived = streamStats.transport[0].bytesReceived;
                                const oldbytesSent = streamStats.transport[0].bytesSent;
                                const oldtimestamp = streamStats.transport[0].timestamp;
                                const newbytesReceived = stat.bytesReceived;
                                const newbytesSent = stat.bytesSent;
                                const newtimestamp = stat.timestamp;
                                const durationMS = newtimestamp - oldtimestamp;
                                const kbitrateReceived = parseInt(String((newbytesReceived - oldbytesReceived) / durationMS), 10) * 8;
                                const kbitrateSent = parseInt(String((newbytesSent - oldbytesSent) / durationMS), 10) * 8;
                                nowStats.calculated.t_kbitrateReceived = kbitrateReceived;
                                nowStats.calculated.t_kbitrateSent = kbitrateSent;
                            }
                        } else if (stat.type === 'candidate-pair' || stat.type === 'candidatepair') {
                            if ((stat.state === 'succeeded' || stat.state === 'in-progress') &&
                                stat.nominated === true && stat.writable === true) {
                                nowStats.candidatePair.push(stat);
                            }
                        } else if (stat.type === 'remote-inbound-rtp') {
                            nowStats.remoteInboundRtp.push(stat);
                        } else if (stat.type === 'media-source') {
                            nowStats.mediaSource.push(stat);
                        }
                    });
                    streamStats = nowStats;
                }
                res(streamStats)
            } catch (e) {
                rej(e)
            }
        })
    },
    throttle: (func: Function, waitMs: Number, type: Number = 1) => {
        let previous: any = null;
        let timeout: any = null;
        return function () {
            // @ts-ignore
            let context = this;
            let args = arguments;
            if (type === 1) {
                let now = Date.now();

                if (now - previous > waitMs) {
                    previous = now;
                    return func.apply(context, args);
                }
            } else if (type === 2) {
                if (!timeout) {
                    timeout = setTimeout(() => {
                        timeout = null;
                        return func.apply(context, args)
                    }, +waitMs)
                }
            }
        }
    },
    setPlayContainer: (ele: any) => {
        ele.poster = "";
        ele.preload = "auto";
        ele.setAttribute("x5-playsinline", " ");
        ele.setAttribute("webkit-playsinline", " ");
        ele.setAttribute("playsinline", " ");
        ele.setAttribute("poster", " ");
        ele.setAttribute("preload", "auto");
    },
    FullScreen: (ele: any) => {
        if (ele.requestFullscreen) {
            ele.requestFullscreen();
        } else if (ele.mozRequestFullScreen) {
            ele.mozRequestFullScreen();
        } else if (ele.webkitRequestFullScreen) {
            ele.webkitRequestFullScreen();
        }
    },
    isFullscreen: () => {
        return document.fullscreenElement ||
            // @ts-ignore
            document.msFullscreenElement ||
            // @ts-ignore
            document.mozFullScreenElement ||
            // @ts-ignore
            document.webkitFullscreenElement || false;
    },
    exitFullscreen: () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            //@ts-ignore
        } else if (document.mozCancelFullScreen) {
            //@ts-ignore
            document.mozCancelFullScreen();
            //@ts-ignore
        } else if (document.webkitCancelFullScreen) {
            //@ts-ignore
            document.webkitCancelFullScreen();
        }
    },
    toFull: (eleId: string, appointStreamVideoElement?: HTMLVideoElement) => {
        let bgVideo: any = document.getElementById(eleId);
        if (bgVideo) {
            if (appointStreamVideoElement && appointStreamVideoElement.srcObject) {
                bgVideo.srcObject = appointStreamVideoElement.srcObject;
                bgVideo.style.opacity = 'unset';
            }
        } else {
            bgVideo = appointStreamVideoElement;
        }
        if (Utils.isPc()) {
            if (Utils.isFullscreen()) {
                Utils.exitFullscreen()
            } else {
                Utils.FullScreen(bgVideo)
            }
        } else {
            if (bgVideo.classList.contains('mobile-video-full')) {
                bgVideo.classList.remove('mobile-video-full')
                bgVideo.classList.add('mobile-video-not-full')
            } else if (bgVideo.classList.contains('mobile-video-full-rotate')) {
                bgVideo.classList.remove('mobile-video-full-rotate')
                bgVideo.classList.add('mobile-video-not-full')
            } else {
                bgVideo.classList.remove('mobile-video-not-full')
                if (appointStreamVideoElement && appointStreamVideoElement.videoWidth < appointStreamVideoElement.videoHeight) {
                    bgVideo.classList.add('mobile-video-full');
                } else {
                    bgVideo.classList.add('mobile-video-full-rotate')
                    // let left = (document.documentElement.clientHeight - document.documentElement.clientWidth) / 2;
                    // bgVideo.style.width = document.documentElement.clientHeight + 2 + "px";
                    // bgVideo.style.height = document.documentElement.clientWidth + 2 + "px";
                    // let rate: any = getComputedStyle(bgVideo).borderBlockEndWidth.replace('px', '');
                    // bgVideo.style.left = -(left + rate / 2) - 1 + "px";
                    // bgVideo.style.top = (left - rate / 2) - 1 + "px";
                }
            }
        }
    },
    addLongPressListener: (element:HTMLElement, callback:Function, duration = 1600) => {
        let timer: any = 0;
        const startPress = (event: any) => {
            // event.preventDefault();
            // event.stopPropagation();

            timer = setTimeout(() => {
                callback(event);
            }, duration);
        };

        const cancelPress = () => {
            clearTimeout(timer);
        };

        // Mouse events
        element.addEventListener('mousedown', startPress);
        element.addEventListener('mouseup', cancelPress);
        element.addEventListener('mouseleave', cancelPress);

        // Touch events
        element.addEventListener('touchstart', startPress);
        element.addEventListener('touchend', cancelPress);
        element.addEventListener('touchcancel', cancelPress);
    },
    promiseWithErr: (promise: any) => {
        return new Promise((resolve, reject) => {
            promise.then((res: any) => {
                resolve({
                    code: 0,
                    data: res
                })
            }).catch((e: any) => {
                resolve({
                    code: 1,
                    data: e
                })
            })
        })
    },
    sequentialPromiseAll: async (promiseFunctionList: Function[]) => {
        const result = [];
        for (let i = 0; i < promiseFunctionList.length; i++) {
            result.push(await promiseFunctionList[i]())
        }
        return result;
    },
    playMessageSound: (type: any, volume = 1) => {
        if (type && window.promptMusic[type]) {
            window.promptMusic[type].volume = volume;
            if (window.promptMusic[type].paused) {
                window.promptMusic[type].play()
            } else {
                window.promptMusic[type].currentTime = 0;
            }
        }
    },
    isJSON: function (json: any) {

        let is_json = true; //true at first

        //Try-catch and JSON.parse function is used here.

        try {
            const object = JSON.parse(json);
        } catch (error) {
            is_json = false;
            console.log("might be a problem in key or value's data type");
        }

        if (!is_json) {
            let countCharacter = function (string: string, character: any) {
                let count = 0;
                for (var i = 0; i < string.length; i++) {
                    if (string.charAt(i) == character) { //counting : or ,
                        count++;
                    }
                }
                return count;
            }

            json = json.trim(); // remove whitespace, start and end spaces

            if (json.charAt(0) != '{' || json.charAt(json.length - 1) != '}') {
                console.log("Brackets {} are not balanced")

            } else if (!(countCharacter(json, ':') - 1 == countCharacter(json, ','))) {

                console.log("comma or colon are not balanced");

            } else {

                json = json.substring(1, json.length - 1); //remove first and last brackets
                json = json.split(',');


                for (var i = 0; i < json.length; i++) {

                    let pairs = json[i];
                    if (pairs.indexOf(':') == -1) { //if colon not exist in b/w
                        console.log("No colon b/w key and value");
                    }
                }
            }
        }
        return is_json;
    },
    fetchIp: () => {
        return new Promise((resolve, reject) => {
            if (sessionStorage[ '_ip_info' ]) {
                try {
                    resolve(JSON.parse(sessionStorage[ '_ip_info' ]));
                    return;
                } catch (e) {
                    console.error('updateStorageIp error:', e);
                }
            }
            const advanceIp = (ipInfo: any) => {
                return new Promise((resolve, reject) => {
                    let timer: any = null;
                    timer = setTimeout(() => {
                        resolve(ipInfo);
                    }, 1600)
                    fetch(`https://cz88.net/api/cz88/ip/base?ip=${ ipInfo.ip }`)
                        .then(function (response) {
                            return response.json();
                        })
                        .then((ipJson) => {
                            if (ipJson.code === 200) {
                                if (ipJson.data.districts && ipJson.data.districts !== '未知') {
                                    if (ipJson.data.districts.includes('县')) {
                                        ipInfo.Country = ipJson.data.districts;
                                    } else {
                                        ipInfo.Country = ipJson.data.city + ipJson.data.districts;
                                    }
                                } else {
                                    if (ipJson.data.city !== '未知') {
                                        ipInfo.Country = ipJson.data.city;
                                    } else if (ipJson.data.province !== '未知') {
                                        ipInfo.Country = ipJson.data.province;
                                    } else {
                                        ipInfo.Country = ipJson.data.country
                                    }
                                }
                                resolve(ipInfo);
                                clearTimeout(timer);
                            } else {
                                resolve(ipInfo);
                                clearTimeout(timer);
                            }
                        }).catch(e => {
                        console.error(e);
                        resolve(ipInfo);
                        clearTimeout(timer);
                    })
                })
            };
            fetch('https://' + 'ksplay.cn' + ':8989?detailed')
                .then(function (response) {
                    return response.json();
                })
                .then((ipJson) => {
                    advanceIp(ipJson).then((advanceIpInfo) => {
                        sessionStorage[ '_ip_info' ] = JSON.stringify(advanceIpInfo);
                        resolve(advanceIpInfo);
                    }).catch(() => {
                        sessionStorage[ '_ip_info' ] = JSON.stringify(ipJson);
                        resolve(ipJson);
                    })
                }).catch(e => {
                console.error(e);
                reject();
            })
        })
    },
    uaGetter: () => {
        let userAgentStr = navigator.userAgent;
        const userAgentObj: any = {
            browserName: '',    // 浏览器名称
            browserVersion: '', // 浏览器版本
            osName: '',         // 操作系统名称
            osVersion: '',      // 操作系统版本
            deviceName: '',     // 设备名称
        }

        let browserReg: any = {
            Chrome: /Chrome/,
            IE: /MSIE/,
            Firefox: /Firefox/,
            Opera: /Presto/,
            Safari: /Version\/([\d.]+).*Safari/,
            '360': /360SE/,
            QQBrowswe: /QQ/,
        }

        let deviceReg: any = {
            iPhone: /iPhone/,
            iPad: /iPad/,
            Android: /Android/,
            Windows: /Windows/,
            Mac: /Macintosh/,
        }

        try {
            for (let key in browserReg) {
                if (browserReg[key].test(userAgentStr)) {
                    userAgentObj.browserName = key
                    if (key === 'Chrome') {
                        userAgentObj.browserVersion = userAgentStr.split('Chrome/')[1].split(' ')[0]
                    } else if (key === 'IE') {
                        userAgentObj.browserVersion = userAgentStr.split('MSIE ')[1].split(' ')[1]
                    } else if (key === 'Firefox') {
                        userAgentObj.browserVersion = userAgentStr.split('Firefox/')[1]
                    } else if (key === 'Opera') {
                        userAgentObj.browserVersion = userAgentStr.split('Version/')[1]
                    } else if (key === 'Safari') {
                        userAgentObj.browserVersion = userAgentStr.split('Version/')[1].split(' ')[0]
                    } else if (key === '360') {
                        userAgentObj.browserVersion = ''
                    } else if (key === 'QQBrowswe') {
                        userAgentObj.browserVersion = userAgentStr.split('Version/')[1].split(' ')[0]
                    }
                }
            }

            for (let key in deviceReg) {
                if (deviceReg[key].test(userAgentStr)) {
                    userAgentObj.osName = key
                    if (key === 'Windows') {
                        userAgentObj.osVersion = userAgentStr.split('Windows NT ')[1].split(';')[0]
                    } else if (key === 'Mac') {
                        userAgentObj.osVersion = userAgentStr.split('Mac OS X ')[1].split(')')[0]
                    } else if (key === 'iPhone') {
                        userAgentObj.osVersion = userAgentStr.split('iPhone OS ')[1].split(' ')[0]
                    } else if (key === 'iPad') {
                        userAgentObj.osVersion = userAgentStr.split('iPad; CPU ')[1].split(' ')[0]
                    } else if (key === 'Android') {
                        userAgentObj.osVersion = userAgentStr.split('Android ')[1].split(';')[0]
                        if (userAgentStr.split('(Linux; Android ')[1]) {
                            userAgentObj.deviceName = userAgentStr.split('(Linux; Android ')[1].split('; ')[1].split(' Build')[0]
                        } else {
                            userAgentObj.bind = userAgentStr;
                        }
                    }
                }
            }
        } catch (e) {
            userAgentObj.bind = userAgentStr;
        }

        return userAgentObj;
    },
    getRandomNum: (min=0,max=0) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    generateDeviceType: () => {
        if (Utils.isPc()) {
            return 'pc'
        } else {
            if (Utils.isIos()) {
                return 'ios'
            } else {
                return 'android'
            }
        }
    },
}

export default Utils;

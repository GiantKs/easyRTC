import Event from "./event";
import Utils from "./utils";

export default class RtcCore extends Event {
    private info: any;
    private published: boolean;
    private outboundPeer: any;
    private inboundPeer: any;
    private audioTrack: any;
    private videoTrack: any;
    private mixAudioTrack: any;

    constructor() {
        super()
        this.info = {}
        this.outboundPeer = {};
        this.inboundPeer = {};
        this.published = false;
        this.audioTrack = null;
        this.videoTrack = null;
        this.mixAudioTrack = null;
    }

    static mixAudioTrack(a:any, b:any, Hint = null) {
        try {
            // @ts-ignore
            let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let c = audioCtx.createMediaStreamDestination();
            if (a) {
                a.contentHint = Hint;
                a = audioCtx.createMediaStreamSource(new MediaStream([a]));
                a.connect(c);
            }
            if (b) {
                b.contentHint = Hint;
                b = audioCtx.createMediaStreamSource(new MediaStream([b]));
                b.connect(c);
            }
            return c.stream.getAudioTracks()[0]
        } catch (e: any) {
            alert('audio unable to mix')
            console.error(e.message);
        }
    }

    static getMaxBPS (w:any, fr:any, isDesktop=false) {
        var dw = 128;
        if (w <= 80) { //80*60
            if (fr < 20)
                dw = 64;
            else
                dw = 64 + 32;
        } else if (w <= 160) //176*144
        {
            if (fr < 20)
                dw = 128;
            else
                dw = 128 + 64;
        } else if (w <= 320) //320*240
        {
            if (fr < 20)
                dw = 256;
            else {
                if (isDesktop) {
                    dw = 256 + 666;
                } else {
                    dw = 256 + 128;
                }
            }
        } else if (w <= 640)//640*480
        {
            if (fr <= 20)
                dw = 256 + 128;
            else {
                if (isDesktop) {
                    dw = 1560;
                } else {
                    dw = 560;
                }
            }
        } else if (w <= 1280)//1280*720
        {
            if (fr < 15)
                dw = 900;
            else if (fr >= 15 && fr <= 20)
                dw = 630 + 520;
            else {
                if (isDesktop) {
                    dw = 630 + 3600;
                } else {
                    dw = 630 + 600;
                }
            }
        } else {
            if (fr < 15)
                dw = 1024 + 256;
            else if (fr >= 15 && fr <= 20)
                dw = 1024 + 512;
            else {
                if (isDesktop) {
                    dw = 1024 + 2024;
                } else {
                    dw = 1024 + 1024
                }
            }
        }
        return dw;
    }

    static setBw (rtcConnect:any, trackSettings:any) {
        try {
            if (!rtcConnect || !trackSettings) {
                return
            }
            const isDesktop = !!trackSettings.displaySurface;
            let senders = Object.values(rtcConnect.getSenders());
            senders.forEach((s: any) => {
                let parameters: any = null;
                if (s.track && s.track.kind === 'video') {
                    parameters = s.getParameters();
                    if (!parameters.encodings || parameters.encodings.length < 1) {
                        parameters.encodings = [ {} ];
                    }
                    parameters.encodings[0].networkPriority = "high";
                    parameters.encodings[0].priority = "high";
                    parameters.encodings[0].maxBitrate = RtcCore.getMaxBPS(trackSettings.width, trackSettings.frameRate, isDesktop) * 1000;
                    s.setParameters(parameters).then(() => {
                        console.log('Bandwidth-limited success:', JSON.stringify(parameters.encodings[0]));
                    }, (err: any) => {
                        console.error('error', err.message)
                    })
                }
            })
        } catch (e: any) {
            console.error(e.message, 'set Bandwidth-limited error!');
        }
    }

    static setCodecs(sdp:any,info?:any) {
        try {
            let setHiFiToSdp = (sdp: any, averageBitrate?: number) => {
                //usedtx=1
                let val = averageBitrate || '128000';
                sdp = formatSdp(sdp);
                var r, a;
                sdp = sdp.replace(new RegExp('a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=' + val + ';maxplaybackrate=48000;stereo=1\r\n', 'g'), '');
                a = sdp.match(/a=rtpmap:111.*\r\n/);
                if (a == null) {
                    a = sdp.match(/a=rtpmap:111.*\n/);
                }
                if (a && (a.length > 0)) {
                    r = a[0] + 'a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=' + val + ';maxplaybackrate=48000;stereo=1\r\n';
                    sdp = sdp.replace(a[0], r);
                }
                return sdp;
            };
            let OpusAddNack = (sdp: string) => {
                const sdpMatch = sdp.match(/a=rtpmap:(.*)opus.*\r\n/);
                if (sdpMatch !== null) {
                    const theLine = `${sdpMatch[0]}a=rtcp-fb:${sdpMatch[1]}nack\r\n`;
                    sdp = sdp.replace(sdpMatch[0], theLine);
                }
                return sdp;
            };
            let formatSdp = (sdp: any) => { //格式化sdp
                sdp = sdp.replace(/\r?\n/g, '#giantksFormatSdp_r_n#').replace(/#giantksFormatSdp_r_n#/g, '\r\n');
                return sdp;
            };

            let updateBandwidthRestriction = (sdp: any, bandwidth: any) => {
                sdp = formatSdp(sdp);
                let modifier = 'AS';
                if (sdp.indexOf('b=' + modifier + ':') === -1) {
                    let cc = sdp;
                    sdp = sdp.replace(/c=IN (.*)\r\n/, 'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
                } else if (sdp.indexOf('b=' + modifier + ':.*\r\n') > -1) {
                    sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'), 'b=' + modifier + ':' + bandwidth + '\r\n');
                } else {
                    sdp = sdp.replace(new RegExp('b=' + modifier + ':.*'), 'b=' + modifier + ':' + bandwidth);
                }
                return sdp;
            }
            if (sdp.type === 'offer') {
                let a = sdp.sdp.match(/m=video (.*)\r\n/)[0];
                if (a.includes('47') && a.includes('96')) {
                    a = a.replace('47 ', '')
                    a = a.replace('96', '47 96')
                }
                if (a.includes('45') && a.includes('96')) {
                    a = a.replace('45 ', '')
                    a = a.replace('96', '45 96')
                }
                if (a.includes('41') && a.includes('96')) {
                    a = a.replace('41 ', '')
                    a = a.replace('96', '41 96')
                }
                if (a.includes('39') && a.includes('96')) {
                    a = a.replace('39 ', '')
                    a = a.replace('96', '39 96')
                }
                sdp.sdp = sdp.sdp.replace(/m=video (.*)\r\n/, a)
            }
            sdp.sdp = setHiFiToSdp(sdp.sdp, 63000)
            sdp.sdp = OpusAddNack(sdp.sdp)
            return sdp;
        } catch (e) {
            console.error(e)
            return sdp
        }
    }

    static getDevices() {
        return new Promise((resolve, reject) => {
            if(typeof navigator.mediaDevices !== 'object' || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
                reject()
            }
            const devices: any = {
                audioInput: [],
                videoInput: [],
                audioOutput: []
            };
            navigator.mediaDevices.enumerateDevices().then((list) => {
                list.forEach((item: MediaDeviceInfo) => {
                    switch (item.kind) {
                        case "audioinput":
                            devices.audioInput.push(item);
                            break;
                        case "videoinput":
                            devices.videoInput.push(item);
                            break;
                        case "audiooutput":
                            devices.audioOutput.push(item);
                            break;
                    }
                })
                resolve(devices)
            }).catch((e) => {
                console.error(e);
                reject(devices)
            })
        })
    }

    setConfig(info: any) {
        if (!info) {
            console.error('setConfig error');
            return
        }
        Object.assign(this.info, info);
    }

    signalingReceiverHandler(data: any) {
        if (typeof data !== 'object') {
            return;
        }
        const {type} = data;
        switch (type) {
            case 'rtc-core-publish':
                if (data.publishUserId !== this.info.userId) {
                    this.onNeedSubscribeUsers(data.publishUserId);
                }
                break;
            case 'rtc-core-offer':
                this.onNeedHandlerOffer(data);
                break;
            case 'rtc-core-answer':
                this.onNeedHandlerAnswer(data);
                break;
            case 'rtc-core-candidate':
                this.onNeedAddCandidate(data);
                break;
            case 'rtc-core-unPublish':
                this.closeInboundPc(data.publishUserId);
                break;
            default:
                break;
        }
    }

    async onNeedSubscribeUsers(userId: string) {
        if (this.inboundPeer[userId]) {
            this.closeInboundPc(userId)
        }
        this.inboundPeer[userId] = new RTCPeerConnection(this.info.iceServers);
        this.initChannel(this.inboundPeer[userId], userId);
        this.bindEvent(this.inboundPeer[userId], userId, this.info.userId);
        this.inboundPeer[userId].addTransceiver('audio', {
            direction: 'recvonly'
        });
        this.inboundPeer[userId].addTransceiver('video', {
            direction: 'recvonly'
        });
        this.inboundPeer[userId].createOffer().then((offer: RTCSessionDescription) => {
            offer = RtcCore.setCodecs(offer);
            this.inboundPeer[userId].setLocalDescription(offer).then(() => {
                this.info.signalingSender({
                    type: 'rtc-core-offer',
                    publishUserId: userId,
                    subscribeUserId: this.info.userId,
                    data: this.inboundPeer[userId].localDescription,
                    toId: userId
                })
            }).catch((e: any) => {
                console.error(e);
            })
        }).catch((e: any) => {
            console.error(e);
        })
    }

    onNeedHandlerOffer(info: any) {
        if (this.outboundPeer[info.subscribeUserId]) {
            this.closeOutboundPc(info.subscribeUserId)
        }
        this.outboundPeer[info.subscribeUserId] = new RTCPeerConnection(this.info.iceServers);
        this.initChannel(this.outboundPeer[info.subscribeUserId]);
        this.bindEvent(this.outboundPeer[info.subscribeUserId], info.publishUserId, info.subscribeUserId);
        (this.mixAudioTrack || this.audioTrack) && this.outboundPeer[info.subscribeUserId].addTrack(this.mixAudioTrack || this.audioTrack);
        const nextStep = () => {
            this.outboundPeer[info.subscribeUserId].setRemoteDescription(info.data).then(() => {
                this.addIce(this.outboundPeer[info.subscribeUserId])
                this.outboundPeer[info.subscribeUserId].createAnswer().then((answer: RTCSessionDescription) => {
                    answer = RtcCore.setCodecs(answer);
                    this.outboundPeer[info.subscribeUserId].setLocalDescription(answer).then(() => {
                        this.info.signalingSender({
                            type: 'rtc-core-answer',
                            publishUserId: info.publishUserId,
                            subscribeUserId: info.subscribeUserId,
                            data: this.outboundPeer[info.subscribeUserId].localDescription,
                            toId: info.subscribeUserId
                        })
                    }).catch((e: any) => {
                        console.error(e);
                    })
                }).catch((e: any) => {
                    console.error(e);
                })
            }).catch((e: any) => {
                console.error(e);
            });
        };
        if (this.videoTrack) {
            const cloneTrack = this.videoTrack.clone();
            if (typeof cloneTrack.applyConstraints !== 'function') {
                cloneTrack.applyConstraints = () => {
                    return Promise.resolve()
                }
            }
            cloneTrack.applyConstraints({ width: { ideal: 320 }, height: { ideal: 180 } }).finally(() => {
                this.videoTrack && this.outboundPeer[info.subscribeUserId].addTrack(cloneTrack);
                nextStep();
            })
        } else {
            nextStep();
        }
    }

    onNeedHandlerAnswer(info: any) {
        if (this.inboundPeer[info.publishUserId]) {
            this.inboundPeer[info.publishUserId].setRemoteDescription(info.data).then(() => {
                this.addIce(this.inboundPeer[info.publishUserId])
            })
        }
    }

    onNeedAddCandidate(info: any) {
        if (this.info.userId === info.publishUserId) {
            this.outboundPeer[info.subscribeUserId] && RtcCore.setIce(this.outboundPeer[info.subscribeUserId], info.data)
        }
        if (this.info.userId === info.subscribeUserId) {
            this.inboundPeer[info.publishUserId] && RtcCore.setIce(this.inboundPeer[info.publishUserId], info.data)
        }
    }

    async publish(info: any) {
        this.published = true;
        return this.generateMedia(info).then((promiseList: any) => {
            const hasTrack = promiseList.findIndex((i: any) => i.code === 0);
            const hasErr = promiseList.findIndex((i: any) => i.code === 1);
            if (hasTrack < 0) {
                this.audioTrack?.stop();
                this.videoTrack?.stop();
                return Promise.reject(promiseList[hasErr].data);
            } else {
                this.info.signalingSender({
                    type: 'rtc-core-publish',
                    publishUserId: this.info.userId,
                    toId: info.toId ? info.toId : ''
                })
                return {
                    audioTrack: this.mixAudioTrack || this.audioTrack,
                    videoTrack: this.videoTrack,
                    reason: promiseList[hasErr] && promiseList[hasErr].data
                }
            }
        }).catch((e) => {
            return Promise.reject(e);
        })
    }

    async unPublish() {
        this.published = false;
        for (let key in this.outboundPeer) {
            if (this.outboundPeer.hasOwnProperty(key)) {
                this.closeOutboundPc(key)
            }
        }
        this.audioTrack && this.audioTrack.stop();
        this.videoTrack && this.videoTrack.stop();
        this.mixAudioTrack && this.mixAudioTrack.stop();
        if (this.mixAudioTrack && this.mixAudioTrack.baseSourceTrack) {
            this.mixAudioTrack.baseSourceTrack.stop();
        }
        this.videoTrack = null;
        this.audioTrack = null;
        this.mixAudioTrack = null;
        this.info.signalingSender({
            type: 'rtc-core-unPublish',
            publishUserId: this.info.userId
        })
    }

    async generateMedia(info:any) {
        return Utils.sequentialPromiseAll([
            () => Utils.promiseWithErr(new Promise<void>((resolve, reject) => {
                if (info.audioInfo) {
                    if (this.audioTrack) {
                        this.audioTrack.stop()
                    }
                    this.generateAudioTrack(info.audioInfo).then((track) => {
                        this.audioTrack = track;
                        resolve()
                    }).catch((e) => {
                        reject('Failed to collect microphone audio. ' + e.message)
                    })
                } else {
                    reject('unwilling use microphone.')
                }
            })),
            () => Utils.promiseWithErr(new Promise<void>((resolve, reject) => {
                if (info.displayMediaInfo) {
                    this.generateDisplayMediaTrack(info.displayMediaInfo).then((tracks: any) => {
                        if (!tracks) {
                            return
                        }
                        if (info.displayMediaInfo.mixAudio) {
                            if (tracks.audioTrack && this.audioTrack) {
                                this.mixAudioTrack = RtcCore.mixAudioTrack(tracks.audioTrack, this.audioTrack);
                                this.mixAudioTrack.baseSourceTrack = tracks.audioTrack;
                            }
                        }
                        if (this.videoTrack) {
                            this.videoTrack.stop();
                        }
                        this.videoTrack = tracks.videoTrack;
                        if (!this.audioTrack) {
                            //tracks.audioTrack && (tracks.audioTrack.contentHint = 'music');
                            this.audioTrack = tracks.audioTrack;
                        }
                        resolve()
                    }).catch(() => {
                        reject('Failed to collect display video. ')
                    })
                } else {
                    if (info.videoInfo) {
                        if (Utils.isPc()) {
                            delete info.videoInfo['facingMode']
                        } else {
                            if (info.videoInfo.deviceId.ideal === 'user' || info.videoInfo.deviceId.ideal === 'environment') {
                                info.videoInfo['facingMode'] = info.videoInfo.deviceId;
                                delete info.videoInfo['deviceId']
                            }
                        }
                        if (this.videoTrack) {
                            this.videoTrack.stop();
                        }
                        this.generateVideoTrack(info.videoInfo).then((track) => {
                            this.videoTrack = track;
                            resolve()
                        }).catch((e) => {
                            reject('Failed to collect camera video. ' + e.message)
                        })
                    } else {
                        reject('unwilling use camera.')
                    }
                }
            }))
        ])
    }

    public connectivityUser(info?:any) {
        if (this.published) {
            this.info.signalingSender({
                type: 'rtc-core-publish',
                publishUserId: this.info.userId,
                toId: (info && info.toId) ? info.toId : ''
            })
        }
    }

    public sendData(data:any) {
        if (data instanceof File) {
            for (let key in this.outboundPeer) {
                if (this.outboundPeer.hasOwnProperty(key)) {
                    if (this.outboundPeer[key]._dc) {
                        //this.outboundPeer[key]._dc.bufferedAmountLowThreshold = 1024*1024; 1M
                        const file = data;
                        const fileSize = file.size;
                        if (fileSize === 0) {
                            console.log('Input null or size 0.');
                            return;
                        }
                        this.outboundPeer[key]._dc.onbufferedamountlow = (e: any) => {
                            if (offset < file.size) {
                                readSlice(offset);
                                this.emit('rtc-channel-progress', {
                                    size: file.size,
                                    currentSize: offset,
                                    remoteId: key
                                });
                            } else {
                                this.outboundPeer[key]._dc.send(JSON.stringify({
                                    type: 'file-end',
                                    fileSize,
                                    fileName: 'giantAccurate'
                                }));
                                this.emit('rtc-channel-progress', {
                                    size: file.size,
                                    currentSize: offset,
                                    remoteId: key
                                });
                            }
                        }
                        this.outboundPeer[key]._dc.send(JSON.stringify({
                            type: 'file-start',
                            fileSize,
                            fileName: 'giantAccurate'
                        }));
                        const chunkSize = 36666 || 16366;
                        let offset = 0;
                        const fileReader = new FileReader();
                        fileReader.onerror = (e) => {
                            console.log('fileReader error', e);
                        }
                        fileReader.onabort = (e) => {
                            console.log('fileReader onabort', e);
                        }
                        fileReader.onload = (e: any) => {
                            console.log('FileRead.onload ', e);
                            const checkSenderBuffer = () => {
                                this.outboundPeer[key]._dc.send(e.target.result);
                                offset += e.target.result.byteLength;
                            };
                            checkSenderBuffer();
                        }

                        const readSlice = (origin: number) => {
                            console.log('readSlice ', origin);
                            const slice = file.slice(offset, origin + chunkSize);
                            fileReader.readAsArrayBuffer(slice);
                        };
                        readSlice(0);
                    }
                }
            }
        } else {
            console.warn('only file type.');
        }
    }

    destroy() {
        this.closeAllPc();
        this.info = {};
        this.outboundPeer = {};
        this.inboundPeer = {};
        this.published = false;
        this.audioTrack = null;
        this.videoTrack = null;
        this.mixAudioTrack = null;
    }

    closePc(id:string) {
        this.closeOutboundPc(id);
        this.closeInboundPc(id);
    }

    closeAllPc() {
        for (let key in this.outboundPeer) {
            if (this.outboundPeer.hasOwnProperty(key)) {
                this.closePc(key)
            }
        }
        for (let key in this.inboundPeer) {
            if (this.inboundPeer.hasOwnProperty(key)) {
                this.closePc(key)
            }
        }
    }

    private closeInboundPc(id:string) {
        if (this.inboundPeer[id]) {
            this.inboundPeer[id].onicecandidate = null;
            this.inboundPeer[id].ontrack = null;
            this.inboundPeer[id].onconnectionstatechange = null;
            this.inboundPeer[id].ondatachannel = null;
            this.inboundPeer[id].close();
            this.inboundPeer[id] = null;
            delete this.inboundPeer[id];
            this.emit('rtc-onTrack-remove', id);
        }
    }

    private closeOutboundPc(id:string) {
        if (this.outboundPeer[id]) {
            this.removeTrack(id, 'video');
            this.outboundPeer[id].onicecandidate = null;
            this.outboundPeer[id].ontrack = null;
            this.outboundPeer[id].onconnectionstatechange = null;
            this.outboundPeer[id].ondatachannel = null;
            this.outboundPeer[id].close();
            this.outboundPeer[id] = null;
            delete this.outboundPeer[id];
        }
    }

    public mutedVideoTrack() {
        this.videoTrack && (this.videoTrack.enabled = false);
        this.handlerSenderTrack('video', false);
    }
    public mutedAudioTrack() {
        this.audioTrack && (this.audioTrack.enabled = false);
        this.mixAudioTrack && (this.mixAudioTrack.enabled = false);
    }
    public unMutedVideoTrack() {
        this.videoTrack && (this.videoTrack.enabled = true);
        this.handlerSenderTrack('video', true);
    }
    public unMutedAudioTrack() {
        this.audioTrack && (this.audioTrack.enabled = true);
        this.mixAudioTrack && (this.mixAudioTrack.enabled = true);
    }
    public switchCamera(deviceId:string) {
        return new Promise(async (resolve, reject) => {
            this.videoTrack.stop();
            for (let key in this.outboundPeer) {
                if (this.outboundPeer.hasOwnProperty(key)) {
                    this.removeTrack(key, 'video')
                }
            }
            const handlerTrack = (track: MediaStreamTrack | any, oldConstraints: any) => {
                if (!track) {
                    return
                }
                track.applyConstraints(oldConstraints).finally(() => {
                    this.videoTrack = track;
                    for (let key in this.outboundPeer) {
                        if (this.outboundPeer.hasOwnProperty(key)) {
                            this.replaceTrack(key, this.videoTrack)
                        }
                    }
                    resolve(track)
                })
            }
            const videoConstraints: any = {}
            const oldVideoConstraints = this.videoTrack.getSettings();
            // videoConstraints.width = {ideal: oldVideoConstraints.width};
            // videoConstraints.height = {ideal: oldVideoConstraints.height};
            // videoConstraints.frameRate = {ideal: oldVideoConstraints.frameRate};
            videoConstraints.width = { ideal: 1920 };
            videoConstraints.height = { ideal: 1080 };
            videoConstraints.frameRate = { ideal: 30 };
            if (deviceId.includes('user') || deviceId.includes('environment')) {
                videoConstraints.facingMode = { ideal: deviceId };
            } else if (deviceId.includes('desktop')) {
                const tracks: any = await this.generateDisplayMediaTrack(videoConstraints)
                if (!tracks) {
                    return
                }
                handlerTrack(tracks.videoTrack, oldVideoConstraints)
                return
            } else {
                videoConstraints.deviceId = { ideal: deviceId };
            }
            if (navigator.userAgent.includes('Firefox')) {
                delete videoConstraints['frameRate']
                delete videoConstraints['width']
                delete videoConstraints['height']
                //delete videoConstraints['facingMode']
            }
            this.generateVideoTrack(videoConstraints).then((track: any) => {
                handlerTrack(track, oldVideoConstraints)
            }).catch((e) => {
                this.emit('rtc-userMedia-error', e.message);
            })
        })
    }

    public checkSenderConnectStatus (checkList:[]) {
        if (!Array.isArray(checkList)) {
            console.log('checkSenderConnectStatus fail.');
            return [];
        }
        return checkList.filter((checkItem) => {
            if (this.info.userId === checkItem) {
                return false
            }
            if (!this.outboundPeer[checkItem]) {
                return true
            }
            if ((this.outboundPeer[checkItem].connectionState === 'failed') || (this.outboundPeer[checkItem].connectionState === 'closed')) {
                return true
            } else {
                return false
            }
        })
    }
    
    public setVideoProfile(option:any) {
        const { constraints } = option;
        for (let key in this.outboundPeer) {
            if (this.outboundPeer.hasOwnProperty(key)) {
                this.senderApplyConstraints(key, constraints).then((videoTrack: MediaStreamTrack | any) => {
                    if (videoTrack && videoTrack.getSettings) {
                        RtcCore.setBw(this.outboundPeer[key], videoTrack.getSettings());
                    }
                }).catch((e)=> {
                    console.error('setVideoProfile error:', e);
                })
            }
        }
    }

    public setSenderVideoProfile(option:any) {
        const { constraints, id } = option;
        if (!this.videoTrack) {
            return
        }
        if (typeof constraints === 'object' && id && this.outboundPeer[id]) {
            this.senderApplyConstraints(id, constraints).then((videoTrack: MediaStreamTrack | any) => {
                if (videoTrack && videoTrack.getSettings) {
                    RtcCore.setBw(this.outboundPeer[id], videoTrack.getSettings());
                }
            }).catch((e) => {
                console.error('setSenderVideoProfile error:', e);
            })
        }
    }

    private generateAudioTrack(audioConstraints?: any) {
        return new Promise((res, rej) => {
            if(typeof navigator.mediaDevices !== 'object' || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
                rej('getUserMedia not function')
            }
            navigator.mediaDevices.getUserMedia({
                audio: audioConstraints || true
            }).then((stream) => {
                res(stream.getAudioTracks()[0])
            }).catch((e) => {
                console.error(e);
                rej(e)
            })
        })
    }

    private generateVideoTrack(videoConstraints: any) {
        return new Promise((res, rej) => {
            if (!videoConstraints) {
                rej('not videoConstraints');
                return
            }
            if (typeof videoConstraints === 'object' && typeof videoConstraints.deviceId === 'object' && (videoConstraints.deviceId.ideal.includes('user') || videoConstraints.deviceId.ideal.includes('environment'))) {
                videoConstraints.facingMode = videoConstraints.deviceId;
                delete videoConstraints.deviceId
            }
            if(navigator.userAgent.includes('Firefox') && typeof videoConstraints === 'object') {
                delete videoConstraints['frameRate']
                delete videoConstraints['width']
                delete videoConstraints['height']
                //delete videoConstraints['facingMode']
            }
            if(typeof navigator.mediaDevices !== 'object' || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
                rej('getUserMedia not function')
            }
            navigator.mediaDevices.getUserMedia({
                video: videoConstraints || true
            }).then((stream) => {
                res(stream.getVideoTracks()[0])
            }).catch((e) => {
                console.error(e);
                rej(e)
            })
        })
    }

    private generateDisplayMediaTrack(constraints:any) {
        return new Promise((res, rej) => {
            navigator.mediaDevices.getDisplayMedia(constraints || {video: true, audio: true}).then((stream) => {
                res({
                    videoTrack: stream.getVideoTracks()[0],
                    audioTrack: stream.getAudioTracks()[0],
                })
            }).catch((e) => {
                console.error(e);
                rej()
            })
        })
    }

    private initChannel (pc: any, publishUserId?: string) {
        pc._dc = pc.createDataChannel('giant');
        pc._dc.binaryType = "arraybuffer";
        pc._dc.onopen = (data: any) => {
            console.log('channel onopen', data);
            this.emit('rtc-channel-open', data);
        }
        pc._dc.onmessage = (data: any) => {
            console.log('channel onmessage', data);
            this.emit('rtc-channel-message', data);
        }
        pc._dc.onerror = (data: any) => {
            console.error('channel onerror', data);
            this.emit('rtc-channel-error', data);
        }
        pc._dc.onclose = (data: any) => {
            console.log('Channel close', data);
            this.emit('rtc-channel-close');
        };
        pc._dc.onbufferedamountlow = (data: any) => {
            console.log('dataChannel onbufferedamountlow', data);
            this.emit('rtc-channel-mount-low');
        };
        if (publishUserId) {
            // the are receiveChannel
            pc.ondatachannel = (event: RTCDataChannelEvent) => {
                console.log('Receive Channel Callback');
                let receiveChannel = event.channel;
                pc._dcR = receiveChannel;
                receiveChannel.onopen = (data: any) => {
                    console.log('Receive Channel open', data);
                    this.emit('rtc-receive-channel-open', publishUserId);
                };
                receiveChannel.onmessage = (data) => {
                    console.log('Receive Channel message', data);
                    this.emit('rtc-receive-channel-message', data, publishUserId);
                };
                receiveChannel.onerror = (data: any) => {
                    console.error('Receive channel onerror', data);
                    this.emit('rtc-receive-channel-error', data, publishUserId);
                }
                receiveChannel.onclose = (data: any) => {
                    console.log('Receive Channel close', data);
                    this.emit('rtc-receive-channel-close', publishUserId);
                };
                receiveChannel.onbufferedamountlow = (data: any) => {
                    console.log('Receive dataChannel onbufferedamountlow', data);
                    this.emit('rtc-receive-channel-mount-low', publishUserId);
                };
            }
        }
    }

    private bindEvent(pc: RTCPeerConnection, publishUserId: string, subscribeUserId: string) {
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.info.signalingSender({
                    type: 'rtc-core-candidate',
                    publishUserId: publishUserId,
                    subscribeUserId: subscribeUserId,
                    data: event.candidate,
                    toId: this.info.userId === publishUserId ? subscribeUserId : publishUserId
                })
            } else {
                // All ICE candidates have been sent
            }
        }
        pc.ontrack = (s: RTCTrackEvent) => {
            this.emit('rtc-onTrack-added', s, publishUserId);
        }
        pc.onconnectionstatechange = (event) => {
            if (pc.connectionState === "connected") {
                this.emit('rtc-connected');
            } else if (pc.connectionState === "disconnected") {
                this.emit('rtc-disconnected');
            } else if (pc.connectionState === "failed") {
                this.closeInboundPc(publishUserId)
                this.emit('rtc-failed', publishUserId, subscribeUserId);
            } else if (pc.connectionState === "closed") {
                this.closeInboundPc(publishUserId)
                this.emit('rtc-closed', publishUserId, subscribeUserId);
            }
        }
    }

    private static setIce(pc: any, ice: RTCIceCandidate) {
        if (pc) {
            if (pc.remoteDescription) {
                pc.addIceCandidate(ice);
            } else {
                if (!pc['iceList']) {
                    pc['iceList'] = [];
                }
                pc['iceList'].push(ice);
            }
        }
    }

    private addIce(pc: RTCPeerConnection) {
        // @ts-ignore
        if (pc['iceList'] && Array.isArray(pc['iceList'])) {
            // @ts-ignore
            pc['iceList'].forEach((candidate) => {
                pc.addIceCandidate(candidate).catch((e) => {
                    console.error('addIceCandidate error', e);
                })
            })
        }
    }

    private removeTrack(id:string, kind?:any) {
        this.outboundPeer[id] && this.outboundPeer[id].getSenders().forEach((t: any) => {
            if (kind) {
                if (t.track?.kind === kind) {
                    t.track?.stop()
                }
            } else {
                t.track?.stop()
            }
        })
    }

    private replaceTrack(id:string,track:MediaStreamTrack) {
        this.outboundPeer[id] && this.outboundPeer[id].getSenders().forEach((sender: any) => {
            // only video track.
            if (sender.track.kind === track.kind) {
                const newTrack = track.clone();
                sender.replaceTrack(newTrack).then(() => {
                    if (sender.track.getConstraints) {
                        newTrack.applyConstraints(sender.track.getConstraints());
                    }
                })
            }
        })
    }

    private senderApplyConstraints(id:string,constraints={}) {
        return new Promise((resolve, reject) => {
            if (this.outboundPeer[id]) {
                const senders = this.outboundPeer[id].getSenders();
                if (senders.findIndex((sender: RTCRtpSender | any) => sender.track.kind === 'video') !== -1) {
                    senders.forEach((sender: any) => {
                        if (sender.track && sender.track.kind === 'video') {
                            sender.track.applyConstraints(constraints).then(() => {
                                resolve(sender.track)
                            }).catch(() => {
                                reject()
                            })
                        }
                    })
                } else {
                    reject()
                }
            } else {
                reject()
            }
        })
    }

    private handlerSenderTrack(trackKind:string,enabled:boolean) {
        for (let key in this.outboundPeer) {
            if (this.outboundPeer.hasOwnProperty(key)) {
                this.outboundPeer[key].getSenders().forEach((RTCSender: RTCRtpSender) => {
                    if (RTCSender.track && RTCSender.track.kind === trackKind) {
                        RTCSender.track.enabled = enabled;
                    }
                })
            }
        }
    }

}

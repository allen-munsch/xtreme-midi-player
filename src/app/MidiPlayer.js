"use client";

import { createWebAudioFontPlayer, createWebAudioFontLoader } from "./WebAudioFontPlayer";
import { MIDIFile } from "./MidiFile";

export const MIDIPlayer = (fileInput, onload, ontick) => {
    let audioContext = null;
    let player = null;
    let reverberator = null;
    let songStart = 0;
    let input = null;
    let currentSongTime = 0;
    let nextStepTime = 0;
    let nextPositionTime = 0;
    let loadedsong = null;
    let loader = null;
    let stoppedsong = null;
    const stepDuration = 44 / 1000;
    let lastPosition = 0;

    let currentPosition = 0;
    let duration = 0;
    let state = "stopped";

    const STOPPED = "stopped";
    const PLAYING = "playing";
    const PAUSED = "paused";

    const log = (msg, extra) => console.log(msg, extra);

    const play = () => {
		state = PLAYING;
        if (!loadedsong && stoppedsong) {
            loadedsong = stoppedsong;
        }
        if (loadedsong) {
            try {
                startPlay(loadedsong);
                if (state === PAUSED) {
                    setPosition(lastPosition);
                }
            } catch (expt) {
                log("error ", expt);
            }
        }
    };

    const pause = () => {
        if (loadedsong) {
            lastPosition = getPosition();
            console.log("Position", lastPosition);
            stop();
            currentSongTime = lastPosition;
            state = PAUSED;
        }
    };

    const stop = () => {
        if (loadedsong) {
            player.cancelQueue(audioContext);
            songStart = 0;
            currentSongTime = 0;
            stoppedsong = loadedsong;
            loadedsong = null;
            state = STOPPED;
        }
    };

    const getContext = () => player;

    const startPlay = (song) => {
        currentSongTime = 0;
        songStart = audioContext.currentTime;
        nextStepTime = audioContext.currentTime;

        scheduler();
    };

    const scheduler = () => {
        if (audioContext.currentTime > nextStepTime - stepDuration) {
            sendNotes(
                loadedsong,
                songStart,
                currentSongTime,
                currentSongTime + stepDuration,
                audioContext,
                input,
                player
            );
            currentSongTime += stepDuration;
            nextStepTime += stepDuration;

            if (currentSongTime > loadedsong.duration) {
                currentSongTime -= loadedsong.duration;
                sendNotes(loadedsong, songStart, 0, currentSongTime, audioContext, input, player);
                songStart += loadedsong.duration;
            }
        }

        if (nextPositionTime < audioContext.currentTime) {
            currentPosition = currentSongTime;
            duration = loadedsong.duration;
            nextPositionTime = audioContext.currentTime + 3;
        }

        if (typeof ontick === "function") {
            ontick(loadedsong, currentSongTime);
        }

        if (loadedsong && state === PLAYING) {
            setTimeout(scheduler, 20);
        }
    };

    const sendNotes = (song, songStart, start, end, audioContext, input, player) => {
        for (const track of song.tracks) {
            for (const note of track.notes) {
                if (note.when >= start && note.when < end) {
                    const when = songStart + note.when;
                    const duration = Math.min(note.duration, 3);
                    const instr = track.info.variable;
                    const v = track.volume / 7;
                    player.queueWaveTable(
                        audioContext,
                        input,
                        window[instr],
                        when,
                        note.pitch,
                        duration,
                        v,
                        note.slides,
                    );
                }
            }
        }
        for (const beat of song.beats) {
            for (const note of beat.notes) {
                if (note.when >= start && note.when < end) {
                    const when = songStart + note.when;
                    const duration = 1.5;
                    const instr = beat.info.variable;
                    const v = beat.volume / 2;
                    player.queueWaveTable(audioContext, input, window[instr], when, beat.n, duration, v);
                }
            }
        }
    };

	const startLoad = (song) => {
		console.log(song);
		const initAudioContext = () => {
			const AudioContextFunc = window.AudioContext || window.webkitAudioContext;
			audioContext = new AudioContextFunc();
			player = createWebAudioFontPlayer();
			reverberator = player.createReverberator(audioContext);
			reverberator.output.connect(audioContext.destination);
			input = reverberator.input;
		};

		// Initialize audio context on user interaction for iOS
		document.addEventListener("touchstart", initAudioContext, { once: true });
		// Also initialize for non-iOS devices
		initAudioContext();

		const loader = createWebAudioFontLoader(player);

		for (const track of song.tracks) {
			const nn = loader.findInstrument(track.program);
			const info = loader.instrumentInfo(nn);
			track.info = info;
			track.id = nn;
			loader.startLoad(audioContext, info.url, info.variable);
		}
		for (const beat of song.beats) {
			const nn = loader.findDrum(beat.n);
			const info = loader.drumInfo(nn);
			beat.info = info;
			beat.id = nn;
			loader.startLoad(audioContext, info.url, info.variable);
		}
		loader.waitLoad(() => {
			loadSong(song);
		});
	};

	const getCurrentSong = () => loadedsong;

	const getPosition = () => currentSongTime;

	const setPosition = (position) => {
		if (loadedsong || stoppedsong) {
			player.cancelQueue(audioContext);
			const next = position;
			songStart = songStart - (next - currentSongTime);
			currentSongTime = next;
			lastPosition = currentSongTime;
		}
	};

	const setVolume = (volume) => {
		if (loadedsong) {
			player.cancelQueue(audioContext);
			let v = volume / 100;
			if (v < 0.000001) {
				v = 0.000001;
			}
			loadedsong.tracks.forEach((track) => (track.volume = v));
		}
	};

	const setInstrument = (value) => {
		if (loadedsong) {
			const loader = createWebAudioFontLoader(player);
			const nn = value;
			const info = loader.instrumentInfo(nn);
			loader.startLoad(audioContext, info.url, info.variable);
			loader.waitLoad(() => {
				console.log("loaded");
				loadedsong.tracks.forEach((track) => {
					track.info = info;
					track.id = nn;
				});
			});
		}
	};

	const loadSong = (song) => {
		stop();
		audioContext.resume();

		console.log("Tracks", song.tracks);
		console.log("Beats", song.beats);
		console.log("Duration", song.duration);
		loadedsong = song;
		if (typeof onload === "function") {
			onload(song);
		}
	};

	const openFile = (fileObj) => {
		const midiFile = new MIDIFile(fileObj);
		const song = midiFile.parseSong();
		startLoad(song);
	};

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		const fileReader = new FileReader();
		fileReader.onload = (event) => {
			const fileObj = event.target.result;
			openFile(fileObj);
		};
		fileReader.readAsArrayBuffer(file);
	};

	const handleExample = (path) => {
		console.log(path);
		const xmlHttpRequest = new XMLHttpRequest();
		xmlHttpRequest.open("GET", path, true);
		xmlHttpRequest.responseType = "arraybuffer";
		xmlHttpRequest.onload = (e) => {
			const arrayBuffer = xmlHttpRequest.response;
			const midiFile = new MIDIFile(arrayBuffer);
			const song = midiFile.parseSong();
			startLoad(song);
		};
		xmlHttpRequest.send(null);
	};

	if (typeof fileInput === "string") {
		fileInput = document.getElementById(fileInput);
	}
	if (fileInput) {
		fileInput.addEventListener("change", handleFileSelect, false);
	}

	return {
		play,
		pause,
		stop,
		getContext,
		getCurrentSong,
		getPosition,
		setPosition,
		setVolume,
		setInstrument,
		openFile,
		handleExample,
		STOPPED,
		PLAYING,
		PAUSED,
	};
};
